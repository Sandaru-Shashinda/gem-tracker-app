import { useState, type CSSProperties, type RefObject } from "react"
import QRCode from "react-qr-code"
import { X } from "lucide-react"

import { useRealSizeGemImage } from "../../gems/RealSizeGemImage"
import type { MeasurementSource, RenderTarget } from "@/lib/real-size"
import { layoutGemName } from "@/lib/gem-name"
import { textWidth, wrapText } from "@/lib/text-layout"
import type { CustomMediumReport, CustomReportRow } from "@/lib/custom-report"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import { EditableOverlay, EditableText, EditableWrapText } from "./EditableField"
import { WRAPPING_VALUE_STYLE } from "./fieldStyles"

/**
 * The A5 report, drawn from an editable document instead of from a gem.
 *
 * The geometry below is MediumReportPreview's, constant for constant and crop fraction
 * for crop fraction: a custom report is the lab's own certificate with different words
 * in it, and one whose signature fields sat a millimetre off would not be the same
 * artefact. What changes is where the words come from — every one of them is a field of
 * {@link CustomMediumReport}, and on the screen copy every one of them is editable
 * where it is printed.
 *
 * Like the standard report this is rendered twice, and `editable` is what separates the
 * two: the screen copy carries the editors, the off-screen copy the exporters capture
 * carries only text.
 */

export const PAGE_WIDTH = 1120
export const PAGE_HEIGHT = 792

/** Right panel is 45% of the 1120px canvas, less its 32px/52px side padding. */
const NAME_COL_W = PAGE_WIDTH * 0.45 - 32 - 52
/** Size the name is set at when it fits the panel on one line. */
const NAME_FONT_SIZE = 30
/** The data blocks' measure, and the type they are set in. */
const ROW_BLOCK_W = 480
const ROW_FONT_SIZE = 14
const ROW_FONT_FAMILY = "'Nimbus Mono Antique', 'Courier New', Courier, monospace"
const ROW_FONT = `${ROW_FONT_SIZE}px ${ROW_FONT_FAMILY}`
/** A row's gap either side of its dotted leader, and the leader at its narrowest. */
const ROW_GAP = 10
const LEADER_MIN_W = 20
/** Widest a value may print before it wraps onto a further line. */
const VALUE_MAX_W = 300
/** The display face the headings and the name are set in. */
const DISPLAY_FONT_FAMILY = "'Nimbus Mono', 'Courier New', Courier, monospace"
/**
 * Comments is the one field the lab writes prose into, and the only one long enough to
 * need more than a line. It stops at three: the sheet's height is fixed, and the lines
 * past that would push the footer off the page.
 */
const COMMENT_MAX_LINES = 3
const COMMENT_LINE_HEIGHT = 1.25

const GOLD = "#D4AF37"
const DARK = "#111111"

/**
 * The signature asset is 1800x1200 (3:2) and mostly whitespace: its ink measures out to
 * x 0.108-0.916, y 0.286-0.686 of the frame, and its printed rule centres on y 0.481.
 * Rendering it at its natural aspect spends most of the footer on empty margin, so the
 * image is rendered oversized inside a window cropped to the ink band, leaving only ~1%
 * of the frame as padding on each side of it.
 */
const SIG_CROP_Y = 0.276
const SIG_CROP_W = 0.828
const SIG_CROP_H = 0.42
const SIG_RULE_Y = 0.481

/**
 * The box width comes from the footer row's budget; its height follows from the crop
 * window's own aspect, so the ink is never squashed. The typed block is drawn to the
 * same box so the two signature fields line up: its dotted rule sits at the same
 * fraction of the box height as the printed rule inside the cropped image.
 */
const SIG_BOX_W = 237
const SIG_BOX_H = (SIG_BOX_W * (SIG_CROP_H * 2)) / (SIG_CROP_W * 3)
const SIG_IMG_W = SIG_BOX_W / SIG_CROP_W
const SIG_IMG_H = SIG_IMG_W / 1.5
const SIG_CROP_TOP = SIG_IMG_H * SIG_CROP_Y
/* Fraction of the box above the rule: blank on the typed block, ink on the image. */
const SIG_RULE_OFFSET = (SIG_RULE_Y - SIG_CROP_Y) / SIG_CROP_H

/** The lab's published clarity scale. Its cells are fixed; only the marked one is a choice. */
const CLARITY_GRADES = [
  { key: "EXC", label: "Exc" },
  { key: "LC1", label: "LC 1" },
  { key: "LC2", label: "LC 2" },
  { key: "EC1", label: "EC 1" },
  { key: "EC2", label: "EC 2" },
  { key: "VI1", label: "VI 1" },
  { key: "VI2", label: "VI 2" },
  { key: "HI1", label: "HI 1" },
  { key: "HI2", label: "HI 2" },
] as const

const tdStyle: CSSProperties = {
  border: "1px solid #111",
  padding: "4px 6px",
  verticalAlign: "middle",
  textAlign: "center",
  fontSize: "9px",
}

/**
 * The selected grade is marked with a heavy border and a light tint rather than
 * reversed type. The table prints at 9px on a 210mm-wide page, i.e. about 4.8pt: at
 * that size white-on-black closes up as soon as ink spreads, and it disappears
 * altogether when a browser's print dialog has background graphics switched off.
 * Black-on-tint survives both, and the 2px rule still reads as the marker even if the
 * fill is dropped.
 */
const activeTdStyle: CSSProperties = {
  ...tdStyle,
  backgroundColor: "#c9cbdd",
  color: "#000",
  fontWeight: 700,
  border: "2px solid #111",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
}

/** Which of the two row blocks an edit belongs to. */
type RowBlock = "rows" | "resultRows"

/** The dotted leader run between a label and its value. */
const LEADER_STYLE: CSSProperties = {
  flexGrow: 1,
  borderBottom: "2px dotted #a3a3a3",
  margin: "0",
  position: "relative",
  minWidth: `${LEADER_MIN_W}px`,
}

interface DataRowProps {
  row: CustomReportRow
  editable: boolean
  onChange: (patch: Partial<CustomReportRow>) => void
  onRemove: () => void
}

/**
 * One data row: label, dotted leader, value — all three editable where they print.
 *
 * Declared here rather than inside the card, and it has to stay here. A component
 * defined in the body of another is a fresh type on every render, which React reads as
 * a different component in the same slot: it unmounts the old row and mounts a new one,
 * and the input the cursor was in is gone. The row then takes exactly one character
 * before the field blurs. At module scope the type is stable, and a keystroke is an
 * ordinary re-render that leaves the input — and the cursor — where they were.
 */
function DataRow({ row, editable, onChange, onRemove }: DataRowProps) {
  return (
    <div
      className='crc-row'
      style={{
        display: "flex",
        alignItems: "baseline",
        width: "100%",
        gap: `${ROW_GAP}px`,
        position: "relative",
      }}
    >
      {editable && (
        <button
          type='button'
          className='crc-row-delete'
          title='Remove this field'
          onClick={onRemove}
          style={{
            position: "absolute",
            left: "-22px",
            top: "2px",
            width: "16px",
            height: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            border: "none",
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <X style={{ width: "10px", height: "10px" }} />
        </button>
      )}
      <span style={{ flexShrink: 0 }}>
        <EditableText
          value={row.label}
          onChange={(label) => onChange({ label })}
          editable={editable}
          hint='Label'
          font={ROW_FONT}
          maxWidth={220}
          title='Click to rename this field'
        />
        :
      </span>
      <div style={LEADER_STYLE} />
      {/* The row aligns on baselines, so a wrapped value keeps the leader on its first line. */}
      <EditableWrapText
        value={row.value}
        onChange={(value) => onChange({ value })}
        editable={editable}
        placeholder='-'
        title='Click to edit this value'
        style={{ ...WRAPPING_VALUE_STYLE, maxWidth: `${VALUE_MAX_W}px` }}
      />
    </div>
  )
}

interface CustomMediumReportCardProps {
  data: CustomMediumReport
  onChange: (patch: Partial<CustomMediumReport>) => void
  onRemoveRow: (block: RowBlock, rowId: string) => void
  /** The gem's first image, sized against its measurements exactly as the standard report does. */
  imageId?: string
  obs: MeasurementSource
  target: RenderTarget
  /** Only the screen copy edits; the copy the exporters read is plain text. */
  editable?: boolean
  innerRef?: RefObject<HTMLDivElement | null>
}

export function CustomMediumReportCard({
  data,
  onChange,
  onRemoveRow,
  imageId,
  obs,
  target,
  editable = false,
  innerRef,
}: CustomMediumReportCardProps) {
  // Whether the comments editor is open. Held here rather than inside the editor
  // because the block's first line shares a row with its own label, so there is no one
  // region that covers the value and nothing else to hang a click on.
  const [editingComments, setEditingComments] = useState(false)

  // 200px box, less its 2px border on each side.
  const gemImage = useRealSizeGemImage({
    imageId,
    obs,
    reportSize: "medium",
    box: { w: 196, h: 196 },
    target,
  })

  // Broken and sized once, so the panel never splits a name at its own edge — the colour
  // and species stay on one line and a long name steps down instead of running over.
  const gemName = layoutGemName(data.gemName, {
    maxWidth: NAME_COL_W,
    fontSize: NAME_FONT_SIZE,
    fontFamily: DISPLAY_FONT_FAMILY,
    fontWeight: 900,
    letterSpacing: 0.5,
    uppercase: true,
  })

  // The comment's first line shares its row with the label and the dotted leader; the
  // rest have the block's full measure. Measured against the label as it currently
  // reads, since on a custom report that label is itself something somebody can retype.
  const commentLines = wrapText(data.comments, {
    width: ROW_BLOCK_W,
    firstLineWidth:
      ROW_BLOCK_W - textWidth(`${data.commentsLabel}:`, ROW_FONT) - ROW_GAP * 2 - LEADER_MIN_W,
    maxLines: COMMENT_MAX_LINES,
    font: ROW_FONT,
  })

  const patchRow = (block: RowBlock, rowId: string, patch: Partial<CustomReportRow>) =>
    onChange({
      [block]: data[block].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    } as Partial<CustomMediumReport>)

  const blockStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    color: DARK,
    fontSize: `${ROW_FONT_SIZE}px`,
    fontFamily: ROW_FONT_FAMILY,
    fontWeight: 400,
    width: "100%",
    maxWidth: `${ROW_BLOCK_W}px`,
  }

  return (
    <div
      ref={innerRef}
      style={{
        width: `${PAGE_WIDTH}px`,
        height: `${PAGE_HEIGHT}px`,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "row",
        position: "relative",
        overflow: "hidden",
        color: "#1e293b",
        boxSizing: "border-box",
        // The screen copy is framed; the copy the exporters read is the bare page.
        border: target === "screen" ? "2px solid #94a3b8" : undefined,
        borderRadius: target === "screen" ? "2px" : undefined,
      }}
    >
      {/* Watermark */}
      {data.showWatermark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 1,
            pointerEvents: "none",
          }}
        >
          <img
            src={turtlesLogo}
            alt='Watermark'
            style={{
              width: "1000px",
              height: "1000px",
              objectFit: "contain",
              filter: "grayscale(100%)",
            }}
          />
        </div>
      )}

      {/* ── LEFT PANEL ── ending in the footer; see usePageOverflow. */}
      <div
        data-fit-column
        style={{
          flex: "0 0 55%",
          width: "50%",
          height: "100%",
          padding: "50px 20px",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        <EditableOverlay
          value={data.title}
          onChange={(title) => onChange({ title })}
          editable={editable}
          title='Click to edit the report title'
          style={{ margin: "0 0 36px 0" }}
          editorStyle={{
            color: GOLD,
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.5px",
            fontFamily: DISPLAY_FONT_FAMILY,
            textTransform: "uppercase",
          }}
        >
          <h1
            style={{
              color: GOLD,
              fontSize: "28px",
              fontWeight: 700,
              textTransform: "uppercase",
              margin: 0,
              letterSpacing: "0.5px",
              fontFamily: DISPLAY_FONT_FAMILY,
            }}
          >
            {data.title || "\u00a0"}
          </h1>
        </EditableOverlay>

        {/* Block 1: Main fields */}
        <div style={blockStyle}>
          {data.rows.map((row) => (
            <DataRow
              key={row.id}
              row={row}
              editable={editable}
              onChange={(patch) => patchRow("rows", row.id, patch)}
              onRemove={() => onRemoveRow("rows", row.id)}
            />
          ))}
        </div>

        <div style={{ height: "28px" }}></div>

        {/* Block 2: Results */}
        <div style={{ ...blockStyle, marginTop: "10px" }}>
          <div
            style={{
              alignSelf: "flex-start",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "2px",
              textTransform: "uppercase",
              color: DARK,
              paddingBottom: "3px",
              marginBottom: "4px",
            }}
          >
            <EditableText
              value={data.resultsHeading}
              onChange={(resultsHeading) => onChange({ resultsHeading })}
              editable={editable}
              hint='Heading'
              font={`700 15px ${ROW_FONT_FAMILY}`}
              letterSpacing={2}
              uppercase
              maxWidth={360}
              title='Click to rename this section'
            />
          </div>

          {data.resultRows.map((row) => (
            <DataRow
              key={row.id}
              row={row}
              editable={editable}
              onChange={(patch) => patchRow("resultRows", row.id, patch)}
              onRemove={() => onRemoveRow("resultRows", row.id)}
            />
          ))}

          {/* Comments. Its first line shares the label's row like any other value; the
              rest run the block's full measure underneath, and the lines are measured
              and cut here so the panel, the PNG and the PDF all carry the same ones. */}
          <EditableOverlay
            value={data.comments}
            onChange={(comments) => onChange({ comments })}
            editable={editable}
            multiline
            editing={editingComments}
            onEditingChange={setEditingComments}
            editorStyle={{ fontSize: `${ROW_FONT_SIZE}px`, fontFamily: ROW_FONT_FAMILY }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                width: "100%",
                gap: `${ROW_GAP}px`,
              }}
            >
              <span style={{ flexShrink: 0 }}>
                <EditableText
                  value={data.commentsLabel}
                  onChange={(commentsLabel) => onChange({ commentsLabel })}
                  editable={editable}
                  hint='Label'
                  font={ROW_FONT}
                  maxWidth={220}
                  title='Click to rename this field'
                />
                :
              </span>
              <div style={LEADER_STYLE} />
              <span
                className={editable ? "crc-editable" : undefined}
                onClick={editable ? () => setEditingComments(true) : undefined}
                title={editable ? "Click to edit the comments" : undefined}
                style={{ flexShrink: 0, whiteSpace: "pre", cursor: editable ? "text" : undefined }}
              >
                {commentLines[0] ?? "-"}
              </span>
            </div>
            {commentLines.slice(1).map((line, i) => (
              <div
                key={i}
                className={editable ? "crc-editable" : undefined}
                onClick={editable ? () => setEditingComments(true) : undefined}
                style={{
                  whiteSpace: "pre",
                  lineHeight: COMMENT_LINE_HEIGHT,
                  cursor: editable ? "text" : undefined,
                }}
              >
                {line}
              </div>
            ))}
          </EditableOverlay>
        </div>

        <div style={{ height: "20px" }}></div>

        {/* Clarity scale. The cells are the lab's published grades, so what a custom
            report chooses here is which one is marked — click a grade to mark it, click
            it again to leave the scale unmarked. */}
        {data.showClarityTable && (
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: "9px",
              color: "#111",
              width: "100%",
              maxWidth: "460px",
              margin: "0 11px",
              marginTop: "15px",
            }}
          >
            <table style={{ width: "90%", borderCollapse: "collapse", textAlign: "center" }}>
              <tbody>
                <tr>
                  <td rowSpan={2} style={tdStyle}>
                    Excellent
                  </td>
                  <td colSpan={2} style={tdStyle}>
                    Loup Clean
                  </td>
                  <td colSpan={2} style={tdStyle}>
                    Eye Clean
                  </td>
                  <td colSpan={2} style={tdStyle}>
                    Visible Inclusions
                  </td>
                  <td colSpan={2} style={tdStyle}>
                    Highly Included
                  </td>
                </tr>
                <tr>
                  {(["LC", "EC", "VI", "HI"] as const).flatMap((cat) => [
                    <td key={`${cat}-minor`} style={tdStyle}>
                      Minor Inclusions
                    </td>,
                    <td key={`${cat}-highly`} style={tdStyle}>
                      Highly Included
                    </td>,
                  ])}
                </tr>
                <tr>
                  {CLARITY_GRADES.map(({ key, label }) => {
                    const active = key === data.clarityGrade
                    return (
                      <td
                        key={key}
                        style={{
                          ...(active ? activeTdStyle : tdStyle),
                          cursor: editable ? "pointer" : undefined,
                        }}
                        title={editable ? "Click to mark this grade" : undefined}
                        onClick={
                          editable
                            ? () => onChange({ clarityGrade: active ? "" : key })
                            : undefined
                        }
                      >
                        {label}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: QR verification code centred in the panel, terms line beneath it */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            marginRight: "70px",
          }}
        >
          {data.showQr && (
            <div style={{ flexShrink: 0, lineHeight: 0 }}>
              <QRCode value={data.qrValue || " "} size={70} />
            </div>
          )}
          <EditableOverlay
            value={data.termsLine}
            onChange={(termsLine) => onChange({ termsLine })}
            editable={editable}
            title='Click to edit the footer line'
            style={{ width: "100%" }}
            editorStyle={{ fontSize: "10px", fontFamily: "Arial, sans-serif", textAlign: "center" }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#666",
                fontFamily: "Arial, sans-serif",
                textAlign: "center",
              }}
            >
              {data.termsLine || "\u00a0"}
            </div>
          </EditableOverlay>
        </div>
      </div>

      {/* ── RIGHT PANEL ── ending in the signatures; see usePageOverflow. */}
      <div
        data-fit-column
        style={{
          flex: "0 0 45%",
          width: "45%",
          height: "100%",
          padding: "125px 52px 38px 32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Gem Image */}
        {data.showGemImage && (
          <>
            <div
              style={{
                width: "200px",
                height: "200px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
                border: "2px solid #ccc",
              }}
            >
              {imageId ? (
                gemImage.node
              ) : (
                <img
                  src={turtlesLogo}
                  style={{ opacity: 0.1, width: "100%", height: "100%", objectFit: "contain" }}
                  alt=''
                />
              )}
            </div>

            <EditableOverlay
              value={data.imageCaption}
              onChange={(imageCaption) => onChange({ imageCaption })}
              editable={editable}
              title='Click to edit the caption'
              style={{ marginBottom: "30px" }}
              editorStyle={{
                fontSize: "10px",
                fontFamily: "Arial, sans-serif",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: "10px",
                  color: "#666",
                  textAlign: "center",
                }}
              >
                {data.imageCaption || "\u00a0"}
              </div>
            </EditableOverlay>
          </>
        )}

        {/* Gem Name + Weight */}
        <div style={{ textAlign: "center", width: "100%", fontFamily: DISPLAY_FONT_FAMILY }}>
          {data.showHeatLine && (
            <EditableOverlay
              value={data.heatLine}
              onChange={(heatLine) => onChange({ heatLine })}
              editable={editable}
              title='Click to edit the heat treatment line'
              style={{ marginTop: "8px" }}
              editorStyle={{
                fontSize: "18px",
                letterSpacing: "1px",
                fontFamily: DISPLAY_FONT_FAMILY,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 400,
                  color: "#333",
                  letterSpacing: "1px",
                }}
              >
                {data.heatLine || "\u00a0"}
              </div>
            </EditableOverlay>
          )}

          <EditableOverlay
            value={data.gemName}
            onChange={(name) => onChange({ gemName: name })}
            editable={editable}
            title='Click to edit the variety'
            editorStyle={{
              fontSize: `${gemName.fontSize}px`,
              fontWeight: 900,
              letterSpacing: "0.5px",
              fontFamily: DISPLAY_FONT_FAMILY,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                fontSize: `${gemName.fontSize}px`,
                fontWeight: 900,
                margin: 0,
                lineHeight: gemName.lines.length > 1 ? 1.15 : undefined,
                textTransform: "uppercase",
                color: "#111",
                letterSpacing: "0.5px",
                fontFamily: DISPLAY_FONT_FAMILY,
              }}
            >
              {gemName.lines.length ? (
                gemName.lines.map((line) => (
                  <span key={line} style={{ display: "block" }}>
                    {line}
                  </span>
                ))
              ) : (
                <span style={{ display: "block" }}>&nbsp;</span>
              )}
            </h2>
          </EditableOverlay>

          <EditableOverlay
            value={data.weightLine}
            onChange={(weightLine) => onChange({ weightLine })}
            editable={editable}
            title='Click to edit the weight'
            style={{ marginTop: "12px" }}
            editorStyle={{
              fontSize: "18px",
              letterSpacing: "1px",
              fontFamily: DISPLAY_FONT_FAMILY,
              textAlign: "center",
            }}
          >
            <div
              style={{ fontSize: "18px", fontWeight: 400, color: "#333", letterSpacing: "1px" }}
            >
              {data.weightLine || "\u00a0"}
            </div>
          </EditableOverlay>
        </div>

        {/* Two signature fields at the bottom: consultant gemologist + authorized signature */}
        {/*
          The pair is wider than the panel's 420px content box, so the row stretches and
          then claws back the side padding: 237 + 10 + 237 = 484px, which sits flush with
          the panel's left edge and 20px from the page edge on the right. That spends the
          32px of left padding outright, so SIG_BOX_W has no more room to grow.
        */}
        <div
          style={{
            marginTop: "auto",
            alignSelf: "stretch",
            marginLeft: "-32px",
            marginRight: "-32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "10px",
          }}
        >
          {/* The unsigned counterpart to the scanned asset: same box, same rule position,
              so the pair reads as two matching fields with room to sign the left one by
              hand. Hidden rather than removed, so dropping it cannot move the other. */}
          <div
            style={{
              width: `${SIG_BOX_W}px`,
              height: `${SIG_BOX_H}px`,
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
              visibility: data.showTypedSignature ? "visible" : "hidden",
            }}
          >
            {/* Left blank for the handwritten signature */}
            <div style={{ height: `${SIG_BOX_H * SIG_RULE_OFFSET}px`, flexShrink: 0 }}></div>
            <div style={{ borderTop: "1.5px dotted #333", width: "80%" }}></div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: "13px",
                whiteSpace: "nowrap",
                marginTop: "2px",
              }}
            >
              <EditableText
                value={data.signatoryName}
                onChange={(signatoryName) => onChange({ signatoryName })}
                editable={editable}
                placeholder='____________________'
                font={`700 11px Arial, Helvetica, sans-serif`}
                maxWidth={SIG_BOX_W}
                title='Click to edit the signatory'
              />
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#8d8b8b",
                fontWeight: 750,
                lineHeight: "11px",
                whiteSpace: "nowrap",
              }}
            >
              <EditableText
                value={data.signatoryRole}
                onChange={(signatoryRole) => onChange({ signatoryRole })}
                editable={editable}
                hint='Role'
                font={`750 9px Arial, Helvetica, sans-serif`}
                maxWidth={SIG_BOX_W}
                title='Click to edit the role'
              />
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "#8d8b8b",
                fontWeight: 750,
                lineHeight: "11px",
                whiteSpace: "nowrap",
              }}
            >
              <EditableText
                value={data.signatoryCompany}
                onChange={(signatoryCompany) => onChange({ signatoryCompany })}
                editable={editable}
                hint='Company'
                font={`750 9px Arial, Helvetica, sans-serif`}
                maxWidth={SIG_BOX_W}
                title='Click to edit the company line'
              />
            </div>
          </div>

          {/* Already-signed block, kept as the scanned asset */}
          <div
            style={{
              position: "relative",
              width: `${SIG_BOX_W}px`,
              height: `${SIG_BOX_H}px`,
              overflow: "hidden",
              flexShrink: 0,
              visibility: data.showSignatureImage ? "visible" : "hidden",
            }}
          >
            <img
              src={signatureImg}
              alt='Authorized Signature'
              style={{
                position: "absolute",
                top: `${-SIG_CROP_TOP}px`,
                width: `${SIG_IMG_W}px`,
                height: `${SIG_IMG_H}px`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
