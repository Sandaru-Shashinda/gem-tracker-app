import type { CSSProperties, ReactNode, RefObject } from "react"
import QRCode from "react-qr-code"
import { ImageIcon, X } from "lucide-react"

import { useRealSizeGemImage } from "../../gems/RealSizeGemImage"
import type { MeasurementSource, RenderTarget } from "@/lib/real-size"
import { layoutGemName } from "@/lib/gem-name"
import {
  COLOUR_GRADE_STEPS,
  type CustomLargeReport,
  type CustomReportRow,
  type LargeRowList,
} from "@/lib/custom-report"
import {
  TREATMENT_ANSWERS,
  TREATMENT_SECTIONS,
  type TreatmentAnswer,
  type TreatmentKey,
} from "@/lib/treatments"
import turtlesLogo from "@/assets/Turtles.png"
import signatureImg from "@/assets/signature1.png"
import grcMemoLogo from "@/assets/grc_memo_logo_trimmed.png"
import { EditableOverlay, EditableText, EditableWrapText } from "./EditableField"
import { WRAPPING_VALUE_STYLE } from "./fieldStyles"

/**
 * The A4 report, drawn from an editable document instead of from a gem.
 *
 * The geometry below is LargeReportPreview's, constant for constant: the page padding,
 * the 150px header columns, the 40px column gutters, the signature crop fractions and
 * the 268px name column they leave room for. A custom report is the lab's own
 * certificate with different words in it, and one laid out a millimetre differently
 * would not be the same artefact. What changes is where the words come from — every one
 * is a field of {@link CustomLargeReport}, and on the screen copy every one is editable
 * where it is printed.
 *
 * Every piece of the page below is declared at module scope, never inside the card. A
 * component declared inside another is a new type on every render, which React
 * rebuilds rather than updates — taking the focused input with it after one keystroke.
 */

// A4 at 96 dpi → 794 × 1123 px (portrait)
export const A4_W = 794
export const A4_H = 1123

const COURIER_FAMILY = "'Nimbus Mono', 'Courier New', Courier, monospace"
const COURIER: CSSProperties = { fontFamily: COURIER_FAMILY, color: "#1a1a1a" }
const ROW_FONT = `400 11.5px ${COURIER_FAMILY}`
/** Widest a value may print before it wraps onto a further line. */
const VALUE_MAX_W = 220
const GOLD = "#C5A259"

/*
 * The scanned signature asset is 1800x1200 (3:2) and mostly whitespace. It is rendered
 * oversized inside a window cropped to its ink band, and the typed field beside it is
 * drawn to the same box so the two signature fields line up.
 *
 * Sized so the pair takes ~58% of the 682px content width, leaving 268px for the gem
 * name beside it — enough for a long variety ("Star Pink Sapphire") to stay on one line.
 */
const SIG_IMG_W = 215
const SIG_IMG_H = SIG_IMG_W / 1.5
const SIG_CROP_TOP = SIG_IMG_H * 0.26
const SIG_CROP_LEFT = SIG_IMG_W * 0.09
const SIG_BOX_W = SIG_IMG_W * 0.85
const SIG_BOX_H = SIG_IMG_H * 0.44
/* Fraction of the box above the rule: blank on the typed block, ink on the image. */
const SIG_RULE_OFFSET = 0.49

/* 268 + 24 gap + the signature pair (2 × 182.75 + 24) fills the 682px content width. */
const NAME_COL_W = 268
/** Size the name is set at when it fits the column on one line. */
const NAME_FONT_SIZE = 22

const COLUMN_STYLE: CSSProperties = {
  ...COURIER,
  fontSize: "11.5px",
  fontWeight: 400,
  display: "flex",
  flexDirection: "column",
  gap: "3px",
}

/** The lab's clarity scale. Its cells are fixed; only the marked one is a choice. */
const CLARITY_GRADES = [
  { key: "FL", label: "FL" },
  { key: "LC1", label: "LC 1" },
  { key: "LC2", label: "LC 2" },
  { key: "EC1", label: "EC 1" },
  { key: "EC2", label: "EC 2" },
  { key: "VI1", label: "VI 1" },
  { key: "VI2", label: "VI 2" },
  { key: "HI1", label: "HI 1" },
  { key: "HI2", label: "HI 2" },
] as const

const CLARITY_TD: CSSProperties = {
  border: "1px solid #111",
  padding: "2px 1px",
  textAlign: "center",
  fontSize: "6.5px",
  lineHeight: 1.25,
  fontFamily: "Arial, sans-serif",
  color: "#111",
  verticalAlign: "middle",
}

/**
 * The stone's grade is marked with a heavy border and a light tint rather than reversed
 * type: at this size white-on-black closes up as soon as ink spreads, and it disappears
 * altogether when a print dialog has background graphics switched off. The 2px rule
 * still reads as the marker even if the fill is dropped.
 */
const CLARITY_TD_ACTIVE: CSSProperties = {
  ...CLARITY_TD,
  backgroundColor: "#c9cbdd",
  color: "#000",
  fontWeight: 700,
  border: "2px solid #111",
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
}

/**
 * The editor for a line centred in the name column: as wide as the column and centred
 * on the line, rather than as wide as the line. The lines here shrink to their own text,
 * so an editor that matched them would be a few pixels wide for an empty field — and the
 * lines must shrink, or a two-line name stops matching the standard report's.
 */
const CENTRED_EDITOR: CSSProperties = {
  left: "50%",
  right: "auto",
  width: `${NAME_COL_W}px`,
  transform: "translateX(-50%)",
  textAlign: "center",
}

const ROW_DELETE_STYLE: CSSProperties = {
  position: "absolute",
  left: "-22px",
  top: "0px",
  width: "15px",
  height: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "9999px",
  border: "none",
  backgroundColor: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
  padding: 0,
}

// ---------------------------------------------------------------------------
// Pieces of the page
// ---------------------------------------------------------------------------

interface SectionTitleProps {
  value: string
  onChange: (next: string) => void
  editable: boolean
  fontSize?: number
  style?: CSSProperties
}

/** A section heading — DETAILS, RESULTS and the rest — retypeable where it prints. */
function SectionTitle({ value, onChange, editable, fontSize = 12, style }: SectionTitleProps) {
  return (
    <p
      style={{
        fontFamily: COURIER_FAMILY,
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        color: "#1a1a1a",
        textTransform: "uppercase",
        letterSpacing: "1px",
        margin: 0,
        paddingBottom: "2px",
        display: "inline-block",
        ...style,
      }}
    >
      <EditableText
        value={value}
        onChange={onChange}
        editable={editable}
        hint='Heading'
        font={`900 ${fontSize}px ${COURIER_FAMILY}`}
        letterSpacing={1}
        uppercase
        maxWidth={300}
        title='Click to rename this section'
      />
    </p>
  )
}

interface DataRowProps {
  row: CustomReportRow
  editable: boolean
  onChange: (patch: Partial<CustomReportRow>) => void
  onRemove: () => void
}

/** One label : leader : value row, set exactly as the standard A4 sets them. */
function DataRow({ row, editable, onChange, onRemove }: DataRowProps) {
  return (
    <div
      className='crc-row'
      style={{ display: "flex", alignItems: "baseline", width: "100%", position: "relative" }}
    >
      {editable && (
        <button
          type='button'
          className='crc-row-delete'
          title='Remove this field'
          onClick={onRemove}
          style={ROW_DELETE_STYLE}
        >
          <X style={{ width: "9px", height: "9px" }} />
        </button>
      )}
      <span style={{ whiteSpace: "nowrap", paddingRight: "4px", flexShrink: 0 }}>
        <EditableText
          value={row.label}
          onChange={(label) => onChange({ label })}
          editable={editable}
          hint='Label'
          font={ROW_FONT}
          maxWidth={200}
          title='Click to rename this field'
        />
        :
      </span>
      <span
        style={{
          flex: 1,
          borderBottom: "1.5px dotted #a3a3a3",
          position: "relative",
          top: "-3px",
          minWidth: "12px",
        }}
      />
      {/* The row aligns on baselines, so a wrapped value keeps the leader on its first line. */}
      <EditableWrapText
        value={row.value}
        onChange={(value) => onChange({ value })}
        editable={editable}
        title='Click to edit this value'
        style={{ ...WRAPPING_VALUE_STYLE, paddingLeft: "6px", maxWidth: `${VALUE_MAX_W}px` }}
      />
    </div>
  )
}

/** The tick is drawn as SVG so it survives export and does not depend on a glyph font. */
function CheckBox({ checked, size = 11 }: { checked: boolean; size?: number }) {
  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        border: "1.2px solid #1a1a1a",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg width={size - 2} height={size - 2} viewBox='0 0 10 10' style={{ display: "block" }}>
          <path
            d='M1.3 5.2 L3.9 7.9 L8.7 1.9'
            fill='none'
            stroke='#1a1a1a'
            strokeWidth='1.6'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
    </span>
  )
}

interface GradeRowProps {
  label: string
  value: string
  editable: boolean
  onLabelChange: (next: string) => void
  onValueChange: (next: string) => void
}

/**
 * Tone or saturation, graded on three fixed steps. The steps are the lab's scale, so the
 * label is what a custom report can retype; the grade is chosen by ticking a box, and
 * ticking the marked one again leaves the row ungraded.
 */
function GradeRow({ label, value, editable, onLabelChange, onValueChange }: GradeRowProps) {
  const selected = value.trim().toLowerCase()
  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "10px" }}>
      <span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        <EditableText
          value={label}
          onChange={onLabelChange}
          editable={editable}
          hint='Label'
          font={ROW_FONT}
          maxWidth={140}
          title='Click to rename this field'
        />
        :
      </span>
      {/* Pushed to the right edge so the three steps line up under the typed values. */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
        {COLOUR_GRADE_STEPS.map((step) => {
          const checked = step.toLowerCase() === selected
          return (
            <span
              key={step}
              onClick={editable ? () => onValueChange(checked ? "" : step) : undefined}
              title={editable ? `Mark ${step}` : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                cursor: editable ? "pointer" : undefined,
              }}
            >
              {step}
              <CheckBox checked={checked} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

interface TreatmentRowProps {
  label: string
  value: TreatmentAnswer
  editable: boolean
  onChange: (next: TreatmentAnswer) => void
}

/**
 * One treatment on the checklist. An unassessed treatment leaves both boxes empty, so
 * "no answer" stays visibly different from a certified "No". Ticking the marked box
 * again clears it back to unassessed.
 */
function TreatmentRow({ label, value, editable, onChange }: TreatmentRowProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: COURIER_FAMILY,
        color: "#1a1a1a",
        fontSize: "10px",
        fontWeight: 400,
        lineHeight: 1.2,
      }}
    >
      <span>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
        {TREATMENT_ANSWERS.map((answer) => {
          const checked = value === answer
          return (
            <span
              key={answer}
              onClick={editable ? () => onChange(checked ? "" : answer) : undefined}
              title={editable ? `Mark ${answer}` : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                whiteSpace: "nowrap",
                cursor: editable ? "pointer" : undefined,
              }}
            >
              {answer}
              <CheckBox checked={checked} size={8} />
            </span>
          )
        })}
      </span>
    </div>
  )
}

/** Titled, outlined region — used for the clarity chart and the statement. */
function Panel({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid #cfcfcf",
        borderRadius: "4px",
        padding: "10px 12px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {heading}
      {children}
    </div>
  )
}

interface ClarityChartProps {
  grade: string
  editable: boolean
  onChange: (next: string) => void
}

/** The graded clarity scale. Click a grade to mark it, click it again to leave it unmarked. */
function ClarityChart({ grade, editable, onChange }: ClarityChartProps) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td rowSpan={2} style={CLARITY_TD}>
            Flawless
          </td>
          <td colSpan={2} style={CLARITY_TD}>
            Loupe Clean
          </td>
          <td colSpan={2} style={CLARITY_TD}>
            Eye Clean
          </td>
          <td colSpan={2} style={CLARITY_TD}>
            Visible Inclusions
          </td>
          <td colSpan={2} style={CLARITY_TD}>
            Highly Included
          </td>
        </tr>
        <tr>
          {(["LC", "EC", "VI", "HI"] as const).flatMap((cat) => [
            <td key={`${cat}-minor`} style={CLARITY_TD}>
              Minor Inclusions
            </td>,
            <td key={`${cat}-highly`} style={CLARITY_TD}>
              Highly Included
            </td>,
          ])}
        </tr>
        <tr>
          {CLARITY_GRADES.map(({ key, label }) => {
            const active = key === grade
            return (
              <td
                key={key}
                onClick={editable ? () => onChange(active ? "" : key) : undefined}
                title={editable ? "Click to mark this grade" : undefined}
                style={{
                  ...(active ? CLARITY_TD_ACTIVE : CLARITY_TD),
                  fontSize: "7.5px",
                  cursor: editable ? "pointer" : undefined,
                }}
              >
                {label}
              </td>
            )
          })}
        </tr>
      </tbody>
    </table>
  )
}

interface TypedSignatureProps {
  data: CustomLargeReport
  onChange: (patch: Partial<CustomLargeReport>) => void
  editable: boolean
}

/**
 * The unsigned counterpart to the scanned signature asset: same box, same rule position,
 * so the pair reads as two matching fields with room to sign the left one by hand.
 * Hidden rather than removed when switched off, so dropping it cannot move the other.
 */
function TypedSignature({ data, onChange, editable }: TypedSignatureProps) {
  const line: CSSProperties = {
    fontSize: "8px",
    color: "#8d8b8b",
    fontWeight: 750,
    whiteSpace: "nowrap",
  }
  return (
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
      <div style={{ borderTop: "1.5px dotted #333", width: "70%" }}></div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          color: "#1a1a1a",
          lineHeight: "12px",
          whiteSpace: "nowrap",
          marginTop: "2px",
        }}
      >
        <EditableText
          value={data.signatoryName}
          onChange={(signatoryName) => onChange({ signatoryName })}
          editable={editable}
          placeholder='____________________'
          font='700 10px Arial, Helvetica, sans-serif'
          maxWidth={SIG_BOX_W}
          title='Click to edit the signatory'
        />
      </div>
      <div style={{ ...line, lineHeight: "8px" }}>
        <EditableText
          value={data.signatoryRole}
          onChange={(signatoryRole) => onChange({ signatoryRole })}
          editable={editable}
          hint='Role'
          font='750 8px Arial, Helvetica, sans-serif'
          maxWidth={SIG_BOX_W}
          title='Click to edit the role'
        />
      </div>
      <div style={{ ...line, lineHeight: "10px" }}>
        <EditableText
          value={data.signatoryCompany}
          onChange={(signatoryCompany) => onChange({ signatoryCompany })}
          editable={editable}
          hint='Company'
          font='750 8px Arial, Helvetica, sans-serif'
          maxWidth={SIG_BOX_W}
          title='Click to edit the company line'
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

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
}: CustomLargeReportCardProps) {
  // 170x160px box, less its 1px border on each side.
  const gemImage = useRealSizeGemImage({
    imageId,
    obs,
    reportSize: "large",
    box: { w: 168, h: 158 },
    target,
  })

  // The column fits "Star Pink Sapphire" on one line by design; anything longer breaks
  // before the colour and species rather than wrapping into the signatures beside it.
  const gemName = layoutGemName(data.gemName, {
    maxWidth: NAME_COL_W,
    fontSize: NAME_FONT_SIZE,
    fontFamily: COURIER_FAMILY,
    fontWeight: 900,
    letterSpacing: 0.5,
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
        editable={editable}
        onChange={(patch) => patchRow(list, row.id, patch)}
        onRemove={() => onRemoveRow(list, row.id)}
      />
    ))

  const setTreatment = (key: TreatmentKey, answer: TreatmentAnswer) =>
    onChange({ treatments: { ...data.treatments, [key]: answer } })

  const prose: CSSProperties = {
    ...COURIER,
    fontWeight: 600,
    margin: 0,
    lineHeight: 1.55,
    textAlign: "justify",
  }

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

      {/* ── HEADER: logo left, title centred, verification QR right ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* The logo column is matched to the QR column so the title stays centred. Both
            are hidden rather than removed when switched off, so the header keeps its
            height and nothing below it moves. */}
        <div style={{ width: "150px", flexShrink: 0 }}>
          <img
            src={grcMemoLogo}
            alt='GRC Logo'
            style={{
              width: "120px",
              height: "auto",
              objectFit: "contain",
              display: "block",
              filter: "brightness(0)",
              visibility: data.showLogo ? "visible" : "hidden",
            }}
          />
        </div>

        <div style={{ flex: 1, textAlign: "end" }}>
          <EditableOverlay
            value={data.title}
            onChange={(title) => onChange({ title })}
            editable={editable}
            title='Click to edit the report title'
            editorStyle={{
              fontFamily: COURIER_FAMILY,
              fontSize: "18px",
              fontWeight: 700,
              color: GOLD,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              textAlign: "right",
            }}
          >
            <h1
              style={{
                fontFamily: COURIER_FAMILY,
                fontSize: "18px",
                fontWeight: 700,
                color: GOLD,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
                margin: 0,
              }}
            >
              {data.title || "\u00a0"}
            </h1>
          </EditableOverlay>
          <EditableOverlay
            value={data.reportNumberLine}
            onChange={(reportNumberLine) => onChange({ reportNumberLine })}
            editable={editable}
            title='Click to edit the report number line'
            editorStyle={{ ...COURIER, fontSize: "12px", fontWeight: 500, textAlign: "right" }}
          >
            <p style={{ ...COURIER, fontSize: "12px", margin: "0px 0 0", fontWeight: 500 }}>
              {data.reportNumberLine || "\u00a0"}
            </p>
          </EditableOverlay>
          <EditableOverlay
            value={data.dateLine}
            onChange={(dateLine) => onChange({ dateLine })}
            editable={editable}
            title='Click to edit the date'
            style={{ marginTop: "2px" }}
            editorStyle={{ ...COURIER, fontSize: "12px", textAlign: "right" }}
          >
            <p style={{ ...COURIER, fontSize: "12px", margin: 0 }}>{data.dateLine || "\u00a0"}</p>
          </EditableOverlay>
        </div>

        <div
          style={{
            width: "150px",
            flexShrink: 0,
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: "4px",
            visibility: data.showQr ? "visible" : "hidden",
          }}
        >
          <QRCode value={data.qrValue || " "} size={72} />
        </div>
      </div>

      {/* Sections are separated by whitespace alone. */}
      <div style={{ height: "15px" }} />

      {/* ── DETAILS ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <SectionTitle
          value={data.detailsHeading}
          onChange={(detailsHeading) => onChange({ detailsHeading })}
          editable={editable}
        />
        <div style={{ display: "flex", gap: "40px", marginTop: "10px" }}>
          {/* Left: identity and size, then the cut */}
          <div style={{ ...COLUMN_STYLE, flex: 1 }}>
            {rowsOf("detailRows")}
            <div style={{ height: "8px" }} />
            {rowsOf("cutRows")}
          </div>

          {/* Right: colour breakdown */}
          <div style={{ ...COLUMN_STYLE, flex: 1 }}>
            {rowsOf("colourRows")}
            <GradeRow
              label={data.toneLabel}
              value={data.tone}
              editable={editable}
              onLabelChange={(toneLabel) => onChange({ toneLabel })}
              onValueChange={(tone) => onChange({ tone })}
            />
            <GradeRow
              label={data.saturationLabel}
              value={data.saturation}
              editable={editable}
              onLabelChange={(saturationLabel) => onChange({ saturationLabel })}
              onValueChange={(saturation) => onChange({ saturation })}
            />
          </div>
        </div>
      </div>

      <div style={{ height: "29px", marginTop: "35px" }} />

      {/* ── RESULTS + TREATMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div>
          <SectionTitle
            value={data.resultsHeading}
            onChange={(resultsHeading) => onChange({ resultsHeading })}
            editable={editable}
          />
          <div style={{ ...COLUMN_STYLE, marginTop: "10px" }}>{rowsOf("resultRows")}</div>
        </div>

        <div>
          <SectionTitle
            value={data.treatmentHeading}
            onChange={(treatmentHeading) => onChange({ treatmentHeading })}
            editable={editable}
          />

          {/* Always printed: on a certificate an unticked row is itself a statement. A
              stone assessed for nothing prints an empty grid, which reads as "not
              examined" rather than as a clean bill. */}
          <div style={{ marginTop: "9px" }}>
            {TREATMENT_SECTIONS.map((section, i) => (
              <div key={section.title} style={{ marginTop: i === 0 ? 0 : "5px" }}>
                <p
                  style={{
                    ...COURIER,
                    fontSize: "10px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                    lineHeight: 1.8,
                    margin: "0 0 2px",
                  }}
                >
                  {section.title}
                </p>
                {section.items.map((item) => (
                  <TreatmentRow
                    key={item.key}
                    label={item.label}
                    value={data.treatments[item.key]}
                    editable={editable}
                    onChange={(answer) => setTreatment(item.key, answer)}
                  />
                ))}
              </div>
            ))}
          </div>

          {data.showSpecialNote && (
            <>
              <SectionTitle
                value={data.specialNoteHeading}
                onChange={(specialNoteHeading) => onChange({ specialNoteHeading })}
                editable={editable}
                style={{ marginTop: "16px" }}
              />
              <EditableOverlay
                value={data.specialNote}
                onChange={(specialNote) => onChange({ specialNote })}
                editable={editable}
                multiline
                title='Click to edit the special note'
                style={{ marginTop: "8px" }}
                editorStyle={{ ...prose, fontSize: "11px" }}
              >
                <p style={{ ...prose, fontSize: "11px" }}>{data.specialNote || "\u00a0"}</p>
              </EditableOverlay>
            </>
          )}
        </div>
      </div>

      {/* ── CLARITY CHART + STATEMENT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0 40px",
          alignItems: "stretch",
          marginTop: "20px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {data.showClarityChart && (
          <Panel
            heading={
              <SectionTitle
                value={data.clarityHeading}
                onChange={(clarityHeading) => onChange({ clarityHeading })}
                editable={editable}
                fontSize={11}
                style={{ paddingBottom: 0 }}
              />
            }
          >
            <ClarityChart
              grade={data.clarityGrade}
              editable={editable}
              onChange={(clarityGrade) => onChange({ clarityGrade })}
            />
          </Panel>
        )}

        {data.showStatement && (
          <Panel
            heading={
              <SectionTitle
                value={data.statementHeading}
                onChange={(statementHeading) => onChange({ statementHeading })}
                editable={editable}
                fontSize={11}
                style={{ paddingBottom: 0 }}
              />
            }
          >
            <EditableOverlay
              value={data.statement}
              onChange={(statement) => onChange({ statement })}
              editable={editable}
              multiline
              title='Click to edit the statement'
              editorStyle={{ ...prose, fontSize: "10.5px", lineHeight: 1.6 }}
            >
              <p style={{ ...prose, fontSize: "10.5px", lineHeight: 1.6 }}>
                {data.statement || "\u00a0"}
              </p>
            </EditableOverlay>
          </Panel>
        )}
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
                style={{
                  width: "170px",
                  height: "160px",
                  border: "1px solid #aaa",
                  backgroundColor: "#f9f9f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {imageId ? (
                  gemImage.node
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
                style={{ width: "170px", marginTop: "4px" }}
                editorStyle={{ fontFamily: "Arial, sans-serif", fontSize: "9px", textAlign: "center" }}
              >
                <p
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontSize: "9px",
                    color: "#888",
                    margin: 0,
                    width: "170px",
                    textAlign: "center",
                  }}
                >
                  {data.imageCaption || "\u00a0"}
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
              editorStyle={{ ...COURIER, fontSize: "12px", letterSpacing: "1px", ...CENTRED_EDITOR }}
            >
              <p
                style={{
                  ...COURIER,
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "#333",
                  letterSpacing: "1px",
                  margin: 0,
                }}
              >
                {data.heatLine || "\u00a0"}
              </p>
            </EditableOverlay>
          )}

          {/* Gem name + weight */}
          <EditableOverlay
            value={data.gemName}
            onChange={(name) => onChange({ gemName: name })}
            editable={editable}
            title='Click to edit the variety'
            style={{ marginTop: "6px" }}
            editorStyle={{
              ...COURIER,
              fontSize: `${gemName.fontSize}px`,
              fontWeight: 900,
              color: GOLD,
              letterSpacing: "0.5px",
              ...CENTRED_EDITOR,
            }}
          >
            <p
              style={{
                ...COURIER,
                fontSize: `${gemName.fontSize}px`,
                fontWeight: 900,
                lineHeight: gemName.lines.length > 1 ? 1.15 : undefined,
                color: GOLD,
                letterSpacing: "0.5px",
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
            editorStyle={{ ...COURIER, fontSize: "14px", fontWeight: 600, ...CENTRED_EDITOR }}
          >
            <p
              style={{
                ...COURIER,
                fontSize: "14px",
                fontWeight: 600,
                color: "#444",
                margin: 0,
              }}
            >
              {data.weightLine || "\u00a0"}
            </p>
          </EditableOverlay>
        </div>

        {/* Right: the two signature fields */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", marginLeft: "30px" }}>
          <TypedSignature data={data} onChange={onChange} editable={editable} />

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
        editorStyle={{ fontFamily: "Arial, sans-serif", fontSize: "8.5px", textAlign: "right" }}
      >
        <p
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: "8.5px",
            color: "#888",
            margin: 0,
            textAlign: "end",
          }}
        >
          {data.termsLine || "\u00a0"}
        </p>
      </EditableOverlay>
    </div>
  )
}
