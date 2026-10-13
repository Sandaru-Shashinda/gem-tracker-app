import type { CSSProperties, RefObject } from "react"
import QRCode from "react-qr-code"
import { ImageIcon } from "lucide-react"

import { useRealSizeGemImage } from "../../gems/RealSizeGemImage"
import type { MeasurementSource, RenderTarget } from "@/lib/real-size"
import { layoutGemName } from "@/lib/gem-name"
import {
  fontSizer,
  LARGE_FONT_FIELDS,
  type CustomLargeReport,
  type CustomReportRow,
  type LargeRowList,
} from "@/lib/custom-report"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo_trimmed.png"
import { EditableOverlay } from "./EditableField"
import { transformFor } from "./fieldStyles"
import { CENTRED_EDITOR, COLUMN_STYLE, COURIER, COURIER_FAMILY, NAME_COL_W } from "./a4Styles"
import {
  A4_H,
  A4_W,
  ClarityChart,
  DataRow,
  GOLD,
  IMAGE_BOX_H,
  IMAGE_BOX_W,
  LABEL_SIZE,
  SectionTitle,
  SIG_BOX_H,
  SIG_BOX_W,
  SIG_CROP_LEFT,
  SIG_CROP_TOP,
  SIG_IMG_H,
  SIG_IMG_W,
  TypedSignature,
} from "./CustomPremiumReportCard"

/**
 * The large report, drawn from an editable document instead of from a gem.
 *
 * The geometry is LargeReportPreview's, spacing for spacing, and the pieces it shares
 * with the premium A4 — rows, section headings, the clarity chart, the signature block —
 * are the premium card's own, imported rather than copied. What changes is where the
 * words come from: every one is a field of {@link CustomLargeReport}, and on the screen
 * copy every one is editable where it is printed.
 */

/** The gem name's own colour on this sheet; the title above it stays the lab's gold. */
const NAME_COLOR = "#2f55a4"

interface CustomLargeReportCardProps {
  data: CustomLargeReport
  onChange: (patch: Partial<CustomLargeReport>) => void
  onRemoveRow: (list: LargeRowList, rowId: string) => void
  /** The gem's first image, sized against its measurements exactly as the standard report does. */
  imageId?: string
  obs: MeasurementSource
  target: RenderTarget
  /** Only the screen copy edits; the copy the exporters read is plain text. */
  editable?: boolean
  innerRef?: RefObject<HTMLDivElement | null>
  /**
   * The signatory's own signature, written above the typed field's rule. Passed only for
   * the digital copy a QR scan opens; the builder's exports leave the rule blank to sign.
   */
  signatureImage?: string
}

export function CustomLargeReportCard({
  data,
  onChange,
  onRemoveRow,
  imageId,
  obs,
  target,
  editable = false,
  innerRef,
  signatureImage,
}: CustomLargeReportCardProps) {
  const size = fontSizer(data.fontSizes, LARGE_FONT_FIELDS)
  const rowSize = size("rows")
  const headingSize = size("headings")
  // Labels stay at the template's size; only values are resized.
  const column: CSSProperties = { ...COLUMN_STYLE, fontSize: `${LABEL_SIZE}px` }

  // The frame at its chosen size; the photo's box is the frame less its 1px border.
  const imageW = IMAGE_BOX_W * data.imageBoxScale
  const imageH = IMAGE_BOX_H * data.imageBoxScale
  const gemImage = useRealSizeGemImage({
    imageId,
    obs,
    reportSize: "large",
    box: { w: imageW - 2, h: imageH - 2 },
    target,
  })

  // Set in caps on this sheet, so it is measured in caps; a name too long for the column
  // breaks before the colour and species rather than wrapping into the signatures.
  const gemName = layoutGemName(data.gemName, {
    maxWidth: NAME_COL_W,
    fontSize: size("gemName"),
    fontFamily: COURIER_FAMILY,
    fontWeight: 900,
    letterSpacing: 0.5,
    uppercase: true,
  })

  const patchRow = (list: LargeRowList, rowId: string, patch: Partial<CustomReportRow>) =>
    onChange({
      [list]: data[list].map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    } as Partial<CustomLargeReport>)

  const rowsOf = (list: LargeRowList) =>
    data[list].map((row) => (
      <DataRow
        key={row.id}
        row={row}
        blockSize={rowSize}
        editable={editable}
        onChange={(patch) => patchRow(list, row.id, patch)}
        onRemove={() => onRemoveRow(list, row.id)}
      />
    ))

  // Line breaks are the author's: the treatment finding is one sentence to a line.
  const prose: CSSProperties = { ...COURIER, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }

  return (
    <div
      ref={innerRef}
      // The page is one column ending in the footer; see usePageOverflow.
      data-fit-column
      style={{
        width: A4_W,
        height: A4_H,
        backgroundColor: "#ffffff",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "44px 56px 36px 56px",
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
            zIndex: 0,
          }}
        >
          <img
            src={turtlesLogo}
            alt=''
            style={{ width: "700px", height: "700px", objectFit: "contain" }}
          />
        </div>
      )}

      {/* ── HEADER: logo left, title beside it, verification QR right. The logo and QR
          are hidden rather than removed when switched off, so nothing else moves. ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "28px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <img
          src={grcMemoLogo}
          alt='GRC Logo'
          style={{
            width: "150px",
            height: "auto",
            objectFit: "contain",
            display: "block",
            flexShrink: 0,
            filter: "brightness(0)",
            visibility: data.showLogo ? "visible" : "hidden",
          }}
        />

        <div style={{ flex: 1, paddingTop: "4px" }}>
          <EditableOverlay
            value={data.title}
            onChange={(title) => onChange({ title })}
            editable={editable}
            title='Click to edit the report title'
            editorStyle={{
              fontFamily: COURIER_FAMILY,
              fontSize: `${size("title")}px`,
              fontWeight: 700,
              color: GOLD,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            <h1
              style={{
                fontFamily: COURIER_FAMILY,
                fontSize: `${size("title")}px`,
                fontWeight: 700,
                color: GOLD,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                margin: 0,
              }}
            >
              {data.title || " "}
            </h1>
          </EditableOverlay>
          <EditableOverlay
            value={data.reportNumberLine}
            onChange={(reportNumberLine) => onChange({ reportNumberLine })}
            editable={editable}
            title='Click to edit the report number line'
            style={{ marginTop: "2px" }}
            editorStyle={{ ...COURIER, fontSize: `${size("reportNumberLine")}px`, fontWeight: 500 }}
          >
            <p
              style={{
                ...COURIER,
                fontSize: `${size("reportNumberLine")}px`,
                margin: 0,
                fontWeight: 500,
              }}
            >
              {data.reportNumberLine || " "}
            </p>
          </EditableOverlay>
          <EditableOverlay
            value={data.dateLine}
            onChange={(dateLine) => onChange({ dateLine })}
            editable={editable}
            title='Click to edit the date'
            style={{ marginTop: "2px" }}
            editorStyle={{ ...COURIER, fontSize: `${size("dateLine")}px` }}
          >
            <p style={{ ...COURIER, fontSize: `${size("dateLine")}px`, margin: 0 }}>
              {data.dateLine || " "}
            </p>
          </EditableOverlay>
        </div>

        <div
          style={{
            flexShrink: 0,
            paddingTop: "4px",
            visibility: data.showQr ? "visible" : "hidden",
          }}
        >
          <QRCode value={data.qrValue || " "} size={72} />
        </div>
      </div>

      {/* ── DETAILS ── */}
      <div style={{ position: "relative", zIndex: 2, marginTop: "56px" }}>
        <SectionTitle
          value={data.detailsHeading}
          onChange={(detailsHeading) => onChange({ detailsHeading })}
          editable={editable}
          fontSize={headingSize}
        />
        <div style={{ display: "flex", gap: "40px", marginTop: "10px" }}>
          {/* Left: identity and size */}
          <div style={{ ...column, flex: 1 }}>{rowsOf("detailRows")}</div>
          {/* Right: shape and cut */}
          <div style={{ ...column, flex: 1 }}>{rowsOf("cutRows")}</div>
        </div>
      </div>

      {/* ── RESULTS + TREATMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          marginTop: "110px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <SectionTitle
            value={data.resultsHeading}
            onChange={(resultsHeading) => onChange({ resultsHeading })}
            editable={editable}
            fontSize={headingSize}
          />
          <div style={{ ...column, marginTop: "10px" }}>{rowsOf("resultRows")}</div>
        </div>

        <div>
          <SectionTitle
            value={data.treatmentHeading}
            onChange={(treatmentHeading) => onChange({ treatmentHeading })}
            editable={editable}
            fontSize={headingSize}
          />
          <EditableOverlay
            value={data.treatment}
            onChange={(treatment) => onChange({ treatment })}
            editable={editable}
            multiline
            title='Click to edit the treatment finding'
            style={{ marginTop: "10px" }}
            editorStyle={{ ...prose, fontSize: `${size("treatments")}px` }}
          >
            <p style={{ ...prose, fontSize: `${size("treatments")}px` }}>
              {data.treatment || " "}
            </p>
          </EditableOverlay>

          {data.showSpecialNote && (
            <>
              <SectionTitle
                value={data.specialNoteHeading}
                onChange={(specialNoteHeading) => onChange({ specialNoteHeading })}
                editable={editable}
                fontSize={headingSize}
                style={{ marginTop: "16px" }}
              />
              <EditableOverlay
                value={data.specialNote}
                onChange={(specialNote) => onChange({ specialNote })}
                editable={editable}
                multiline
                title='Click to edit the special note'
                style={{ marginTop: "8px" }}
                editorStyle={{ ...prose, fontSize: `${size("specialNote")}px` }}
              >
                <p style={{ ...prose, fontSize: `${size("specialNote")}px` }}>
                  {data.specialNote || " "}
                </p>
              </EditableOverlay>
            </>
          )}
        </div>
      </div>

      {/* ── CLARITY CHART + STATEMENT. Each keeps its own column when the other is
          switched off, so the statement never slides under the results. ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          alignItems: "start",
          marginTop: "44px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          {data.showClarityChart && (
            <>
              <EditableOverlay
                value={data.clarityHeading}
                onChange={(clarityHeading) => onChange({ clarityHeading })}
                editable={editable}
                title='Click to rename the clarity chart'
                style={{ marginBottom: "3px" }}
                editorStyle={{ fontFamily: "Arial, sans-serif", fontSize: "7.5px" }}
              >
                <p
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "7.5px",
                    color: "#111",
                    margin: 0,
                  }}
                >
                  {data.clarityHeading || " "}
                </p>
              </EditableOverlay>
              <ClarityChart
                grade={data.clarityGrade}
                editable={editable}
                onChange={(clarityGrade) => onChange({ clarityGrade })}
              />
            </>
          )}
        </div>

        <div>
          {data.showStatement && (
            <EditableOverlay
              value={data.statement}
              onChange={(statement) => onChange({ statement })}
              editable={editable}
              multiline
              title='Click to edit the statement'
              editorStyle={{ ...prose, fontSize: `${size("statement")}px`, lineHeight: 1.6 }}
            >
              <p style={{ ...prose, fontSize: `${size("statement")}px`, lineHeight: 1.6 }}>
                {data.statement || " "}
              </p>
            </EditableOverlay>
          )}
        </div>
      </div>

      {/* ── GEM IMAGE + SIGNATURES ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "24px",
          marginTop: "auto",
          paddingTop: "16px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left: the true-size gem image, the name and the weight */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: `${NAME_COL_W}px`,
            flexShrink: 0,
          }}
        >
          {data.showGemImage && (
            <>
              <div
                // Measured where it lands once it is resized; see usePageOverflow.
                data-fit-box
                style={{
                  width: `${imageW}px`,
                  height: `${imageH}px`,
                  // Held to its size: a column short of room would otherwise squash it.
                  flexShrink: 0,
                  border: "1px solid #aaa",
                  backgroundColor: "#f9f9f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {imageId ? (
                  <div
                    style={{
                      display: "flex",
                      transform:
                        data.imageScale === 1 ? undefined : `scale(${data.imageScale})`,
                    }}
                  >
                    {gemImage.node}
                  </div>
                ) : (
                  <ImageIcon style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
                )}
              </div>
              {/* Centred under the image box, not the wider name column. */}
              <EditableOverlay
                value={data.imageCaption}
                onChange={(imageCaption) => onChange({ imageCaption })}
                editable={editable}
                title='Click to edit the caption'
                style={{ width: `${imageW}px`, marginTop: "4px" }}
                editorStyle={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: `${size("imageCaption")}px`,
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: `${size("imageCaption")}px`,
                    color: "#888",
                    margin: 0,
                    width: `${imageW}px`,
                    textAlign: "center",
                  }}
                >
                  {data.imageCaption || " "}
                </p>
              </EditableOverlay>
            </>
          )}

          {data.showHeatLine && (
            <EditableOverlay
              value={data.heatLine}
              onChange={(heatLine) => onChange({ heatLine })}
              editable={editable}
              title='Click to edit the heat treatment line'
              style={{ marginTop: "14px" }}
              editorStyle={{
                ...COURIER,
                fontSize: `${size("heatLine")}px`,
                letterSpacing: "1px",
                ...CENTRED_EDITOR,
              }}
            >
              <p
                style={{
                  ...COURIER,
                  fontSize: `${size("heatLine")}px`,
                  fontWeight: 400,
                  color: "#333",
                  letterSpacing: "1px",
                  margin: 0,
                }}
              >
                {data.heatLine || " "}
              </p>
            </EditableOverlay>
          )}

          {/* Gem name + weight */}
          <EditableOverlay
            value={data.gemName}
            onChange={(name) => onChange({ gemName: name })}
            editable={editable}
            title='Click to edit the variety'
            style={{ marginTop: "12px" }}
            editorStyle={{
              ...COURIER,
              fontSize: `${gemName.fontSize}px`,
              fontWeight: 900,
              color: NAME_COLOR,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              ...CENTRED_EDITOR,
            }}
          >
            <p
              style={{
                ...COURIER,
                fontSize: `${gemName.fontSize}px`,
                fontWeight: 900,
                lineHeight: gemName.lines.length > 1 ? 1.15 : undefined,
                color: NAME_COLOR,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                textAlign: "center",
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

          <EditableOverlay
            value={data.weightLine}
            onChange={(weightLine) => onChange({ weightLine })}
            editable={editable}
            title='Click to edit the weight'
            style={{ marginTop: "3px" }}
            editorStyle={{ ...COURIER, fontSize: `${size("weightLine")}px`, ...CENTRED_EDITOR }}
          >
            <p style={{ ...COURIER, fontSize: `${size("weightLine")}px`, color: "#444", margin: 0 }}>
              {data.weightLine || " "}
            </p>
          </EditableOverlay>
        </div>

        {/* Right: the two signature fields */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", marginLeft: "30px" }}>
          <TypedSignature
            data={data}
            onChange={onChange}
            editable={editable}
            signatureImage={signatureImage}
          />

          {/* Already-signed block, kept as the scanned asset. Sized about its own centre
              and nudged by the layout; where it lands is checked by usePageOverflow. */}
          <div
            data-fit-box
            style={{
              position: "relative",
              width: `${SIG_BOX_W}px`,
              height: `${SIG_BOX_H}px`,
              overflow: "hidden",
              flexShrink: 0,
              visibility: data.showSignatureImage ? "visible" : "hidden",
              transform: transformFor(data.signatureX, data.signatureY, data.signatureScale),
              transformOrigin: "center center",
            }}
          >
            <img
              src={signatureImg}
              alt='Authorized Signature'
              style={{
                position: "absolute",
                top: `${-SIG_CROP_TOP}px`,
                left: `${-SIG_CROP_LEFT}px`,
                width: `${SIG_IMG_W}px`,
                height: `${SIG_IMG_H}px`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <EditableOverlay
        value={data.termsLine}
        onChange={(termsLine) => onChange({ termsLine })}
        editable={editable}
        title='Click to edit the footer line'
        style={{ margin: "12px 100px 0 0", position: "relative", zIndex: 2 }}
        editorStyle={{
          fontFamily: "Arial, sans-serif",
          fontSize: `${size("termsLine")}px`,
          textAlign: "right",
        }}
      >
        <p
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: `${size("termsLine")}px`,
            color: "#888",
            margin: 0,
            textAlign: "end",
          }}
        >
          {data.termsLine || " "}
        </p>
      </EditableOverlay>
    </div>
  )
}
