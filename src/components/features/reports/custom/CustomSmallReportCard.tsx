import { useState, type CSSProperties, type RefObject } from "react"
import QRCode from "react-qr-code"
import { ImageIcon, X } from "lucide-react"

import { useRealSizeGemImage } from "../../gems/RealSizeGemImage"
import type { MeasurementSource, RenderTarget } from "@/lib/real-size"
import { layoutGemName } from "@/lib/gem-name"
import { textWidth, wrapText } from "@/lib/text-layout"
import { fontSizer, SMALL_FONT_FIELDS, type CustomSmallReport } from "@/lib/custom-report"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo.png"
import { EditableOverlay, EditableText, EditableWrapText } from "./EditableField"
import { transformFor, WRAPPING_VALUE_STYLE } from "./fieldStyles"

/**
 * The small card, drawn from an editable document instead of from a gem.
 *
 * The geometry below is SmallReportPreview's, constant for constant: a custom card is
 * the lab's own certificate with different words in it, and one that laid its rows out
 * a millimetre differently would not be the same artefact at all. What changes is where
 * the words come from — every one of them is a field of {@link CustomSmallReport}, and
 * on the screen copy every one of them is editable where it is printed.
 *
 * Like the standard card this is rendered twice, and `editable` is what separates the
 * two: the screen copy carries the editors, the off-screen copy the exporters capture
 * carries only text.
 */

export const CARD_WIDTH = 640
export const CARD_HEIGHT = 403.5
/** Right-hand column: gem image, the name under it, the weight, the QR code. */
const NAME_COL_W = 160
/** The card's own gutters, and what they leave for the data column. */
const CARD_PAD_L = 40
const CARD_PAD_R = 30
const COL_GAP = 65
const DATA_COL_W = CARD_WIDTH - CARD_PAD_L - CARD_PAD_R - COL_GAP - NAME_COL_W
/** The data rows' type. The line box is what the dotted leader is drawn against. */
const ROW_FONT_FAMILY = "Arial, Helvetica, sans-serif"
const ROW_LINE_HEIGHT = 1.3
/**
 * The labels' size — the template's, always. A size set in the layout changes a row's
 * value, never its label, so the labels stay one even column however the values are set.
 */
const LABEL_SIZE = 14
/** Canvas font shorthand for a row set at `size`. */
const rowFont = (size: number) => `${size}px ${ROW_FONT_FAMILY}`
/** A row's gutters: the label, the dotted leader at its narrowest, then the value. */
const LABEL_GAP = 4
const LEADER_MIN_W = 20
const VALUE_GAP = 6
/** Widest a value may print before it wraps — where the standard card cuts it off. */
const VALUE_MAX_W = 220
/** The 120px image frame, and the 85% inset the photo sits in. */
const IMAGE_BOX = 120
const IMAGE_INSET = 0.85
/**
 * Comments is the one field the lab writes prose into, and so the one that needs more
 * than a line. It is set a little smaller than the data rows and capped at three lines:
 * the card is a fixed-size print artefact, and every line the comment takes is a line
 * taken off the signature below it.
 */
const COMMENT_LINE_HEIGHT = 1.4
const COMMENT_MAX_LINES = 3

/**
 * The dotted leader between a label and its value, for a row set at `size`.
 *
 * Held to the first line's box rather than stretched to the row's height. The rows
 * stretch their items, which put the dots at the foot of a single line; once a value
 * wraps the row is taller, and a stretched leader would draw its dots under the last
 * line instead of leading the eye from the label to the first. The 4px lift is the
 * template's at 14px, kept in proportion when a row is set larger or smaller.
 */
function leaderStyle(size: number): CSSProperties {
  return {
    flex: 1,
    alignSelf: "flex-start",
    height: `${size * ROW_LINE_HEIGHT}px`,
    borderBottom: "2px dotted #a3a3a3",
    position: "relative",
    top: `${-(4 * size) / 14}px`,
    minWidth: `${LEADER_MIN_W}px`,
  }
}

/**
 * The leader on a row whose value is set at another size than its label.
 *
 * Such a row lines its label and value up on their baselines — top-aligned, a larger
 * value would sit lower than the label beside it — and an empty item in a baseline row
 * stands on the baseline itself, so the dots fall where they do on every other row.
 * Rows at the template's size keep the template's own leader, untouched.
 */
const BASELINE_LEADER: CSSProperties = {
  flex: 1,
  borderBottom: "2px dotted #a3a3a3",
  minWidth: `${LEADER_MIN_W}px`,
}

interface CustomSmallReportCardProps {
  data: CustomSmallReport
  onChange: (patch: Partial<CustomSmallReport>) => void
  onRemoveRow: (rowId: string) => void
  /** The gem's first image, sized against its measurements exactly as the standard card does. */
  imageId?: string
  obs: MeasurementSource
  target: RenderTarget
  /** Only the screen copy edits; the copy the exporters read is plain text. */
  editable?: boolean
  innerRef?: RefObject<HTMLDivElement | null>
}

export function CustomSmallReportCard({
  data,
  onChange,
  onRemoveRow,
  imageId,
  obs,
  target,
  editable = false,
  innerRef,
}: CustomSmallReportCardProps) {
  // Whether the comments editor is open. It is held here rather than inside the editor
  // because the block's first line shares a row with its own label, so there is no one
  // region that covers the value and nothing else to hang a click on.
  const [editingComments, setEditingComments] = useState(false)

  const size = fontSizer(data.fontSizes, SMALL_FONT_FIELDS)
  const rowSize = size("rows")
  const commentSize = size("comments")

  // The frame at its chosen size, and the photo's box: the frame less its 85% inset.
  const imageBox = IMAGE_BOX * data.imageBoxScale
  const gem = useRealSizeGemImage({
    imageId,
    obs,
    reportSize: "small",
    box: { w: imageBox * IMAGE_INSET, h: imageBox * IMAGE_INSET },
    target,
  })

  // Broken and sized once, so the on-screen card and the copy that becomes the PDF
  // carry the same lines — a name left to wrap on its own splits at the column edge.
  const gemName = layoutGemName(data.gemName, {
    maxWidth: NAME_COL_W,
    fontSize: size("gemName"),
    fontFamily: ROW_FONT_FAMILY,
    fontWeight: 700,
  })

  // The comment's first line shares the row with its label and the dotted leader; the
  // rest have the whole column. Measured against the label as it currently reads, since
  // on a custom card that label is itself something somebody can retype.
  const commentLines = wrapText(data.comments, {
    width: DATA_COL_W,
    firstLineWidth:
      DATA_COL_W -
      textWidth(`${data.commentsLabel}:`, rowFont(LABEL_SIZE)) -
      LABEL_GAP -
      LEADER_MIN_W -
      VALUE_GAP,
    maxLines: COMMENT_MAX_LINES,
    font: rowFont(commentSize),
  })

  const patchRow = (rowId: string, patch: Partial<{ label: string; value: string }>) =>
    onChange({ rows: data.rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)) })

  return (
    <div
      ref={innerRef}
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        backgroundColor: "#ffffff",
        overflow: "hidden",
        display: "flex",
        border: "1px solid #e2e8f0",
        padding: `30px ${CARD_PAD_R}px 24px ${CARD_PAD_L}px`,
        boxSizing: "border-box",
        position: "relative",
        boxShadow: "0 10px 30px -5px rgba(0,0,0,0.15)",
      }}
    >
      {/* Watermark */}
      {data.showWatermark && (
        <div
          style={{
            position: "absolute",
            top: "45%",
            left: "38%",
            transform: "translate(-50%, -50%)",
            opacity: 1,
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <img
            src={turtlesLogo}
            alt=""
            style={{ width: "700px", height: "950px", objectFit: "contain" }}
          />
        </div>
      )}

      {/* ── LEFT COLUMN ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          marginRight: `${COL_GAP}px`,
          position: "relative",
          minWidth: 0,
        }}
      >
        {/* Logo. Turning it off hides it rather than removing it, and the difference
            matters: this column overflows its own height by design — the signature is
            a 500px box clipped down to a signature — so the browser is already
            shrinking every item in it to fit. Drop the image and the box it sits in
            shrinks to nothing, taking the rows' negative offset with it and lifting the
            first rows clean off the top of the card. Hidden, it holds its place. */}
        <div style={{ width: "175px", marginTop: "-70px", zIndex: 1, marginLeft: "-15px" }}>
          <img
            src={grcMemoLogo}
            alt='GRC Logo'
            style={{ height: "175px", visibility: data.showLogo ? "visible" : "hidden" }}
          />
        </div>

        {/* Data rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontSize: `${LABEL_SIZE}px`,
            marginTop: "-65px",
            padding: "10px 0",
            fontFamily: ROW_FONT_FAMILY,
            color: "#1a1a1a",
            lineHeight: ROW_LINE_HEIGHT,
            flex: 1,
            zIndex: 2,
          }}
        >
          {data.rows.map((row) => {
            // The value's size; the label keeps the template's whatever this is.
            const own = row.fontSize ?? rowSize
            const resized = own !== LABEL_SIZE
            return (
            <div
              key={row.id}
              className='crc-row'
              style={{
                display: "flex",
                position: "relative",
                alignItems: resized ? "baseline" : undefined,
              }}
            >
              {editable && (
                <button
                  type='button'
                  className='crc-row-delete'
                  title='Remove this field'
                  onClick={() => onRemoveRow(row.id)}
                  style={{
                    position: "absolute",
                    left: "-26px",
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
              <span
                style={{ whiteSpace: "nowrap", paddingRight: `${LABEL_GAP}px`, minWidth: "10px" }}
              >
                <EditableText
                  value={row.label}
                  onChange={(label) => patchRow(row.id, { label })}
                  editable={editable}
                  hint='Label'
                  font={rowFont(LABEL_SIZE)}
                  title='Click to rename this field'
                />
                :
              </span>
              <span style={resized ? BASELINE_LEADER : leaderStyle(LABEL_SIZE)} />
              <EditableWrapText
                value={row.value}
                onChange={(value) => patchRow(row.id, { value })}
                editable={editable}
                placeholder='-'
                title='Click to edit this value'
                font={rowFont(own)}
                maxTextWidth={VALUE_MAX_W - VALUE_GAP}
                gutter={VALUE_GAP}
                style={{ ...WRAPPING_VALUE_STYLE, fontSize: `${own}px` }}
              />
            </div>
            )
          })}

          {/* Comments. Its first line shares the label's row, like every other value;
              the rest run the full width of the column underneath. The lines are
              measured and cut here rather than left to the browser, so the card, the
              PNG and the PDF all carry the same ones. */}
          <EditableOverlay
            value={data.comments}
            onChange={(comments) => onChange({ comments })}
            editable={editable}
            multiline
            editing={editingComments}
            onEditingChange={setEditingComments}
            style={{ marginTop: "8px", minHeight: `${LABEL_SIZE * ROW_LINE_HEIGHT}px` }}
            editorStyle={{
              fontSize: `${commentSize}px`,
              fontFamily: ROW_FONT_FAMILY,
              lineHeight: COMMENT_LINE_HEIGHT,
            }}
          >
            <div style={{ display: "flex" }}>
              <span
                style={{ whiteSpace: "nowrap", paddingRight: `${LABEL_GAP}px`, minWidth: "10px" }}
              >
                <EditableText
                  value={data.commentsLabel}
                  onChange={(commentsLabel) => onChange({ commentsLabel })}
                  editable={editable}
                  hint='Label'
                  font={rowFont(LABEL_SIZE)}
                  title='Click to rename this field'
                />
                :
              </span>
              <span style={leaderStyle(LABEL_SIZE)} />
              <span
                className={editable ? "crc-editable" : undefined}
                onClick={editable ? () => setEditingComments(true) : undefined}
                title={editable ? "Click to edit the comments" : undefined}
                style={{
                  whiteSpace: "pre",
                  paddingLeft: `${VALUE_GAP}px`,
                  fontSize: `${commentSize}px`,
                  // Set on the row's own line box, so the smaller type still sits on the
                  // same baseline as the label beside it.
                  lineHeight: `${LABEL_SIZE * ROW_LINE_HEIGHT}px`,
                  cursor: editable ? "text" : undefined,
                }}
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
                  fontSize: `${commentSize}px`,
                  lineHeight: COMMENT_LINE_HEIGHT,
                  cursor: editable ? "text" : undefined,
                }}
              >
                {line}
              </div>
            ))}
          </EditableOverlay>
        </div>

        {/* Signature */}
        {data.showSignature && (
          <img
            src={signatureImg}
            alt='Signature'
            // Where its ink lands is what says the card fits; see usePageOverflow.
            data-fit-signature
            style={{
              height: "500px",
              objectFit: "contain",
              marginTop: "-15px",
              marginLeft: "-12px",
              maxWidth: "58%",
              clipPath: "inset(25% 0 10% 0)",
              // The ink sits in the middle of this tall box, at its left edge.
              transform: transformFor(data.signatureX, data.signatureY, data.signatureScale),
              transformOrigin: "left center",
            }}
          />
        )}
      </div>

      {/* ── RIGHT COLUMN ── ending in the QR code; see usePageOverflow. */}
      <div
        data-fit-column
        style={{
          width: `${NAME_COL_W}px`,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "50px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Gem image */}
        {data.showGemImage && (
          <>
            <div
              // Measured where it lands once it is resized; see usePageOverflow.
              data-fit-box
              style={{
                width: `${imageBox}px`,
                height: `${imageBox}px`,
                // Held to its size: a column short of room would otherwise squash it.
                flexShrink: 0,
                backgroundColor: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: "1px solid #666",
              }}
            >
              {imageId ? (
                <div
                  style={{
                    width: "85%",
                    height: "85%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: data.imageScale === 1 ? undefined : `scale(${data.imageScale})`,
                  }}
                >
                  {gem.node}
                </div>
              ) : (
                <ImageIcon style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
              )}
            </div>

            <p
              style={{
                fontSize: `${size("imageCaption")}px`,
                fontFamily: ROW_FONT_FAMILY,
                color: "#888",
                textAlign: "center",
                marginTop: "5px",
                marginBottom: "16px",
                lineHeight: 1.3,
              }}
            >
              <EditableText
                value={data.imageCaption}
                onChange={(imageCaption) => onChange({ imageCaption })}
                editable={editable}
                hint='Caption'
                font={rowFont(size("imageCaption"))}
                maxWidth={NAME_COL_W}
                title='Click to edit the caption'
              />
            </p>
          </>
        )}

        {/* Gem name & weight */}
        <div style={{ textAlign: "center", marginBottom: "16px", fontFamily: ROW_FONT_FAMILY }}>
          {data.showHeatLine && (
            <p
              style={{
                fontWeight: 600,
                fontSize: `${size("heatLine")}px`,
                color: "#1e293b",
                lineHeight: 1.2,
                margin: 0,
                marginBottom: "4px",
              }}
            >
              <EditableText
                value={data.heatLine}
                onChange={(heatLine) => onChange({ heatLine })}
                editable={editable}
                hint='Heat'
                font={`600 ${size("heatLine")}px ${ROW_FONT_FAMILY}`}
                maxWidth={NAME_COL_W}
                title='Click to edit the heat treatment line'
              />
            </p>
          )}

          <EditableOverlay
            value={data.gemName}
            onChange={(name) => onChange({ gemName: name })}
            editable={editable}
            title='Click to edit the variety'
            editorStyle={{
              fontWeight: 700,
              fontSize: `${gemName.fontSize}px`,
              fontFamily: ROW_FONT_FAMILY,
              textAlign: "center",
              height: "100%",
            }}
          >
            <p
              style={{
                fontWeight: 700,
                fontSize: `${gemName.fontSize}px`,
                color: "#1e293b",
                lineHeight: gemName.lines.length > 1 ? 1.15 : 1.2,
                margin: 0,
              }}
            >
              {gemName.lines.length
                ? gemName.lines.map((line) => (
                    <span key={line} style={{ display: "block" }}>
                      {line}
                    </span>
                  ))
                : "—"}
            </p>
          </EditableOverlay>

          <p
            style={{
              fontSize: `${size("weightLine")}px`,
              color: "#1e293b",
              fontWeight: 700,
              marginTop: "4px",
              margin: 0,
            }}
          >
            <EditableText
              value={data.weightLine}
              onChange={(weightLine) => onChange({ weightLine })}
              editable={editable}
              hint='Weight'
              font={`700 ${size("weightLine")}px ${ROW_FONT_FAMILY}`}
              maxWidth={NAME_COL_W}
              title='Click to edit the weight'
            />
          </p>
        </div>

        {/* QR code. Never blank: an empty string is not a QR code the encoder accepts. */}
        {data.showQr && (
          <div style={{ marginTop: "-10px", marginBottom: "4px" }}>
            <QRCode value={data.qrValue || " "} size={60} />
          </div>
        )}
      </div>
    </div>
  )
}
