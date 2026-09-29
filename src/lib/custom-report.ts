/**
 * The document a custom card report is drawn from.
 *
 * The standard small card in SmallReportPreview reads straight off the gem: which rows
 * it prints, what they are called and the order they come in are all fixed, because
 * every certificate issued from it has to look the same as the last one. A custom card
 * is the opposite job — a one-off where the lab decides what the card says — so it
 * cannot render from a gem at all. It renders from this: a plain document of labels and
 * strings that somebody has already had the chance to rewrite.
 *
 * {@link buildCustomSmallReport} is the bridge between the two. It lays the gem out into
 * that document exactly as the standard card would have printed it, so a custom card
 * opens on the real certificate rather than on an empty form, and every edit from there
 * is a deliberate departure from it.
 */
import type { Gem } from "./types"
import { SIGNATORY_ROLE } from "./report-signature"
import { normalizeTreatments, type TreatmentValues } from "./treatments"

export interface CustomReportRow {
  /** Stable across edits and reorders, so React keeps the right editor with the right row. */
  id: string
  label: string
  value: string
}

export interface CustomSmallReport {
  rows: CustomReportRow[]
  /** Comments keeps its own pair: it is the one field set as a block rather than a row. */
  commentsLabel: string
  comments: string
  /** The heat line above the gem name — "Heated" / "Un - Heated" on the standard card. */
  heatLine: string
  showHeatLine: boolean
  gemName: string
  weightLine: string
  imageCaption: string
  qrValue: string
  showLogo: boolean
  showWatermark: boolean
  showGemImage: boolean
  showSignature: boolean
  showQr: boolean
}

/** Labels offered when adding a row, so the common ones are not retyped by hand. */
export const CUSTOM_REPORT_FIELD_PRESETS = [
  "GRC Number",
  "Date",
  "Weight",
  "Color",
  "Shape & Cut",
  "Dimension",
  "Species",
  "Variety",
  "Origin",
  "Transparency",
  "Clarity",
  "Cutting Style",
  "Treatment",
  "Refractive Index",
  "Hardness",
  "Conclusion",
] as const

/**
 * The card as the API stores it.
 *
 * Rows lose their ids on the way out and are given fresh ones on the way back in: an
 * id is a React key, meaningful only to the page currently drawing the card, and
 * persisting one would be persisting a rendering detail. A row's position in the list
 * is the whole of what identifies it.
 */
export type StoredCustomSmallReport = Omit<CustomSmallReport, "rows"> & {
  rows: Array<{ label: string; value: string }>
}

export function toStoredCustomReport(data: CustomSmallReport): StoredCustomSmallReport {
  const { rows, ...rest } = data
  return { ...rest, rows: rows.map(({ label, value }) => ({ label, value })) }
}

/**
 * A stored card, read back over the one this gem would produce today.
 *
 * The fallback is what makes a card saved before a field existed still open: anything
 * the stored document does not carry is taken from the gem's own card rather than left
 * undefined, which would print as a blank row on a certificate somebody had approved.
 */
export function fromStoredCustomReport(
  stored: Partial<StoredCustomSmallReport> | null | undefined,
  fallback: CustomSmallReport,
): CustomSmallReport {
  if (!stored) return fallback

  const { rows, ...rest } = stored
  const present = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined && value !== null),
  )

  return {
    ...fallback,
    ...present,
    rows: Array.isArray(rows)
      ? rows.map((row) => newCustomReportRow(row?.label ?? "", row?.value ?? ""))
      : fallback.rows,
  }
}

let rowSeq = 0
export function customReportRowId(): string {
  rowSeq += 1
  return `row-${rowSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export function newCustomReportRow(label = "New field", value = ""): CustomReportRow {
  return { id: customReportRowId(), label, value }
}

/** Weight as both the row and the headline under the gem name print it. */
function formatWeight(weight: number | undefined): string {
  return weight ? `${Number(weight).toFixed(2)} ct` : ""
}

/**
 * The gem, laid out exactly as the standard small card prints it.
 *
 * Kept deliberately in step with SmallReportPreview's own `rows`: a custom card that
 * opened on anything else would make every difference between the two look like an
 * edit somebody made on purpose.
 */
export function buildCustomSmallReport(gem: Gem, verificationUrl: string): CustomSmallReport {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}

  const shapeAndCut = obs.isMixCut
    ? `${obs.cuttingShape || ""} mix cut`.trim()
    : obs.cuttingShape || ""

  const dimension = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
    : ""

  const rows: CustomReportRow[] = [
    ["GRC Number", gem.gemId],
    ["Date", new Date(gem.updatedAt).toLocaleDateString("en-GB")],
    ["Weight", formatWeight(gem.weight)],
    ["Color", gem.color],
    ["Shape & Cut", shapeAndCut],
    ["Dimension", dimension],
    ["Species", obs.species],
    ["Variety", obs.variety],
  ].map(([label, value]) => newCustomReportRow(label as string, (value as string) ?? ""))

  return {
    rows,
    commentsLabel: "Comments",
    comments: obs.comments ?? "",
    heatLine: obs.isHeated ? "Heated" : "Un - Heated",
    showHeatLine: Boolean(obs.showHeatInReport),
    gemName: finalData.finalVariety || obs.variety || "",
    weightLine: formatWeight(gem.weight),
    imageCaption: "Image is approximate",
    qrValue: verificationUrl,
    showLogo: true,
    showWatermark: true,
    showGemImage: true,
    showSignature: true,
    showQr: true,
  }
}

/* ────────────────────────────── MEDIUM (A5) ────────────────────────────── */

/**
 * The document a custom A5 report is drawn from.
 *
 * Same idea as the card above and a bigger sheet of paper: two blocks of rows rather
 * than one, a clarity scale, a pair of signature fields and a footer, all of which the
 * standard report reads off the gem and this one reads off whatever somebody typed.
 *
 * The clarity scale is the one thing here that is not free text. Its cells are the
 * lab's published grades, not this report's wording, so what a custom report chooses
 * about it is which grade is marked — {@link CustomMediumReport.clarityGrade} — and
 * whether the scale is printed at all.
 */
export interface CustomMediumReport {
  title: string
  /** The upper block: the stone's description, as the standard report lays it out. */
  rows: CustomReportRow[]
  resultsHeading: string
  /** The lower block, printed under the results heading. */
  resultRows: CustomReportRow[]
  commentsLabel: string
  comments: string
  /** Key of the marked grade — EXC, LC1, LC2, EC1, EC2, VI1, VI2, HI1, HI2. "" marks none. */
  clarityGrade: string
  showClarityTable: boolean
  qrValue: string
  showQr: boolean
  termsLine: string
  imageCaption: string
  showGemImage: boolean
  showWatermark: boolean
  heatLine: string
  showHeatLine: boolean
  gemName: string
  weightLine: string
  signatoryName: string
  signatoryRole: string
  signatoryCompany: string
  showTypedSignature: boolean
  showSignatureImage: boolean
}

/** Labels offered when adding a row to an A5 report. */
export const CUSTOM_MEDIUM_FIELD_PRESETS = [
  "GRC Number",
  "Date",
  "Description",
  "Weight",
  "Shape",
  "Cut",
  "Measurements",
  "Transparency",
  "Clarity",
  "Color",
  "Species",
  "Variety",
  "Origin",
  "Treatment",
  "Refractive Index",
  "Hardness",
  "Conclusion",
] as const

/**
 * The gem, laid out exactly as the standard A5 report prints it.
 *
 * Kept deliberately in step with MediumReportPreview's own rows and fallbacks, down to
 * the weight's gram-or-carat rule and the name it prints when a gem has none: a custom
 * report that opened on anything else would make every difference between the two look
 * like an edit somebody made on purpose.
 */
export function buildCustomMediumReport(
  gem: Gem,
  verificationUrl: string,
  signatoryName: string,
): CustomMediumReport {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}

  const formatDate = (value?: string | Date) =>
    new Date(value ?? Date.now()).toLocaleDateString("en-GB")

  // Jewellery is weighed in grams, loose stones in carats — the standard report decides
  // this from the description, and so does the document it hands over.
  const isJewelry =
    (finalData.itemDescription || obs.itemDescription || gem.itemDescription || "")
      .toLowerCase()
      .includes("bracelet") ||
    (finalData.finalVariety || obs.variety || "").toLowerCase().includes("bracelet")

  const displayWeight = gem.weight
    ? `${Number(gem.weight).toFixed(2)} ${isJewelry ? "g" : "ct"}`
    : ""

  const measurements = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
    : ""

  const row = (label: string, value: unknown) =>
    newCustomReportRow(label, value === undefined || value === null ? "" : String(value))

  return {
    title: "GEMOLOGICAL REPORT OF CEYLON",
    rows: [
      row("GRC Number", gem.gemId),
      row("Date", formatDate(gem.updatedAt)),
      row("Description", finalData.itemDescription || obs.itemDescription || gem.itemDescription),
      row("Weight", displayWeight),
      row("Shape", obs.shape || obs.cuttingShape),
      row("Cut", obs.crownStyle || obs.cuttingStyle || obs.cut),
      row("Measurements", measurements),
      row("Transparency", obs.transparency),
      row("Clarity", obs.clarityGrade),
    ],
    resultsHeading: "Results",
    resultRows: [
      row("Color", gem.color),
      row("Species", obs.species),
      row("Variety", finalData.finalVariety || obs.variety),
    ],
    commentsLabel: "Comments",
    comments: obs.comments ?? "",
    clarityGrade: (obs.clarityGrade || "").replace(/[\s()]/g, "").toUpperCase(),
    showClarityTable: true,
    qrValue: verificationUrl,
    showQr: true,
    termsLine: "For complete terms and updates, visit www.grc.lk",
    imageCaption: "Image is approximate",
    showGemImage: true,
    showWatermark: true,
    heatLine: obs.isHeated ? "Heated" : "Un - Heated",
    showHeatLine: Boolean(obs.showHeatInReport),
    // The standard report falls back to "BLUE SAPPHIRE" here, which was safe while it
    // only ever ran on an approved gem — one of those always has a variety, so the
    // fallback never showed. A custom gem is never approved and never has one, so that
    // same fallback would print a stone type onto every custom A5 that nobody entered
    // and somebody would have to notice and delete. Blank is the honest headline.
    gemName: finalData.finalVariety || obs.variety || "",
    weightLine: displayWeight,
    signatoryName,
    signatoryRole: SIGNATORY_ROLE,
    signatoryCompany: "Gemological Report Of Ceylon (Pvt) Ltd",
    showTypedSignature: true,
    showSignatureImage: true,
  }
}

/** The A5 report as the API stores it: same document, rows stripped of their React keys. */
export type StoredCustomMediumReport = Omit<CustomMediumReport, "rows" | "resultRows"> & {
  rows: Array<{ label: string; value: string }>
  resultRows: Array<{ label: string; value: string }>
}

export function toStoredCustomMediumReport(data: CustomMediumReport): StoredCustomMediumReport {
  const { rows, resultRows, ...rest } = data
  const plain = (list: CustomReportRow[]) => list.map(({ label, value }) => ({ label, value }))
  return { ...rest, rows: plain(rows), resultRows: plain(resultRows) }
}

export function fromStoredCustomMediumReport(
  stored: Partial<StoredCustomMediumReport> | null | undefined,
  fallback: CustomMediumReport,
): CustomMediumReport {
  if (!stored) return fallback

  const { rows, resultRows, ...rest } = stored
  const present = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined && value !== null),
  )
  const revive = (list: Array<{ label?: string; value?: string }> | undefined) =>
    Array.isArray(list) ? list.map((r) => newCustomReportRow(r?.label ?? "", r?.value ?? "")) : null

  return {
    ...fallback,
    ...present,
    rows: revive(rows) ?? fallback.rows,
    resultRows: revive(resultRows) ?? fallback.resultRows,
  }
}

/* ────────────────────────────── LARGE (A4) ────────────────────────────── */

/**
 * The document a custom A4 report is drawn from.
 *
 * The A4 is the lab's full certificate, and it carries structure the two smaller sheets
 * do not: a colour breakdown with graded boxes, a treatment checklist, a clarity chart
 * and a statement panel alongside the rows. The rows are free text as on the others.
 * The structured parts are not — their scales and the treatment list are the lab's
 * published vocabulary, not this report's wording — so what a custom A4 chooses about
 * them is the answer each one records: which grade box is ticked, which treatments are
 * Yes or No, which clarity grade is marked.
 */
export interface CustomLargeReport {
  // Header
  title: string
  reportNumberLine: string
  dateLine: string
  showLogo: boolean
  showQr: boolean
  qrValue: string

  // Details: the left column is two groups — the stone and its size, then its cut —
  // printed with a gap between them, and the right column is its colour.
  detailsHeading: string
  detailRows: CustomReportRow[]
  cutRows: CustomReportRow[]
  colourRows: CustomReportRow[]
  toneLabel: string
  /** "Low" | "Medium" | "High", or "" for ungraded — every box then prints empty. */
  tone: string
  saturationLabel: string
  saturation: string

  // Results and treatment
  resultsHeading: string
  resultRows: CustomReportRow[]
  treatmentHeading: string
  /** The checklist's answers. The treatments themselves are the lab's fixed list. */
  treatments: TreatmentValues
  specialNoteHeading: string
  specialNote: string
  /**
   * Whether the special note block prints. The standard report prints it only when the
   * lab wrote one; a custom report needs a way to add one to a stone that had none, so
   * the choice is its own switch rather than read off whether the text is empty.
   */
  showSpecialNote: boolean

  // Panels
  clarityHeading: string
  /** Key of the marked grade — FL, LC1, LC2, EC1, EC2, VI1, VI2, HI1, HI2. "" marks none. */
  clarityGrade: string
  showClarityChart: boolean
  statementHeading: string
  statement: string
  showStatement: boolean

  // Gem image, name and signatures
  showGemImage: boolean
  imageCaption: string
  heatLine: string
  showHeatLine: boolean
  gemName: string
  weightLine: string
  signatoryName: string
  signatoryRole: string
  signatoryCompany: string
  showTypedSignature: boolean
  showSignatureImage: boolean

  // Page
  termsLine: string
  showWatermark: boolean
}

/** The three steps tone and saturation are graded on. */
export const COLOUR_GRADE_STEPS = ["Low", "Medium", "High"] as const

/** Labels offered when adding a row to an A4 report. */
export const CUSTOM_LARGE_FIELD_PRESETS = [
  "Item Description",
  "Weight",
  "Measurements",
  "Shape",
  "Cutting Style: Crown",
  "Cutting Style: Pavilion",
  "Hue",
  "Color",
  "Clarity",
  "Transparency",
  "Species",
  "Variety",
  "Geographic Origin",
  "Refractive Index",
  "Hardness",
  "Conclusion",
] as const

/** The statement every standard A4 prints. */
export const LARGE_STATEMENT_TEXT =
  "The geographic origin and color description are an expert opinion based on a collection of observation and analytical data."

/**
 * The top clarity grade was recorded as "Exc" before the scale was renamed FL
 * (Flawless). Records still hold that value, and it has to keep marking the same cell.
 */
function normaliseLargeClarity(grade: string | undefined): string {
  const raw = (grade || "").replace(/[\s()]/g, "").toUpperCase()
  return raw === "EXC" ? "FL" : raw
}

/**
 * The gem, laid out exactly as the standard A4 prints it.
 *
 * Kept deliberately in step with LargeReportPreview: its rows, its long-form US date,
 * the "One loose stone" it prints for a blank description, and the heat line it shows
 * only for an unheated stone. A custom report that opened on anything else would make
 * every difference between the two look like an edit somebody made on purpose.
 */
export function buildCustomLargeReport(
  gem: Gem,
  verificationUrl: string,
  signatoryName: string,
): CustomLargeReport {
  const finalData = gem.finalApproval || {}
  const obs = finalData.finalObservations || {}

  const date = new Date(gem.updatedAt ?? Date.now()).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const weight = gem.weight ? `${Number(gem.weight).toFixed(2)} ct` : ""
  const measurements = obs.messurementX
    ? `${Number(obs.messurementX).toFixed(2)} x ${Number(obs.messurementY).toFixed(2)} x ${Number(obs.messurementZ).toFixed(2)} mm`
    : ""

  const row = (label: string, value: unknown) =>
    newCustomReportRow(label, value === undefined || value === null ? "" : String(value))

  return {
    title: "Gemological Report of Ceylon",
    reportNumberLine: `GRC Report Number – ${gem.gemId || "—"}`,
    dateLine: date,
    showLogo: true,
    showQr: true,
    qrValue: verificationUrl,

    detailsHeading: "DETAILS",
    detailRows: [
      row("Item Description", finalData.itemDescription || obs.itemDescription || "One loose stone"),
      row("Weight", weight),
      row("Measurements", measurements),
    ],
    cutRows: [
      row("Shape", obs.shape || obs.cuttingShape),
      row("Cutting Style: Crown", obs.crownStyle),
      row("Cutting Style: Pavilion", obs.pavilionStyle),
    ],
    colourRows: [row("Hue", obs.hue)],
    toneLabel: "Tone",
    tone: obs.tone ?? "",
    saturationLabel: "Saturation",
    saturation: obs.saturation ?? "",

    resultsHeading: "RESULTS",
    resultRows: [
      row("Color", gem.color),
      row("Clarity", obs.clarityGrade),
      row("Transparency", obs.transparency),
      row("Species", obs.species),
      row("Variety", finalData.finalVariety || obs.variety),
      row("Geographic Origin", obs.origin),
    ],
    treatmentHeading: "TREATMENT",
    treatments: normalizeTreatments(obs.treatments),
    specialNoteHeading: "SPECIAL NOTE",
    specialNote: obs.specialNote ?? "",
    showSpecialNote: Boolean(obs.specialNote),

    clarityHeading: "CLARITY CHART",
    clarityGrade: normaliseLargeClarity(obs.clarityGrade),
    showClarityChart: true,
    statementHeading: "STATEMENT",
    statement: LARGE_STATEMENT_TEXT,
    showStatement: true,

    showGemImage: true,
    imageCaption: "Image is approximate",
    heatLine: "Un - Heated",
    // The standard A4 calls out an unheated stone and leaves a heated one unsaid.
    showHeatLine: Boolean(obs.showHeatInReport && !obs.isHeated),
    gemName: finalData.finalVariety || obs.variety || "",
    weightLine: weight,
    signatoryName,
    signatoryRole: SIGNATORY_ROLE,
    signatoryCompany: "Gemological Report Of Ceylon (Pvt) Ltd",
    showTypedSignature: true,
    showSignatureImage: true,

    termsLine: "For complete terms and updates, visit www.grc.lk",
    showWatermark: true,
  }
}

/** The four row lists an A4 carries. */
export type LargeRowList = "detailRows" | "cutRows" | "colourRows" | "resultRows"
const LARGE_ROW_LISTS: LargeRowList[] = ["detailRows", "cutRows", "colourRows", "resultRows"]

/** The A4 report as the API stores it: same document, rows stripped of their React keys. */
export type StoredCustomLargeReport = Omit<CustomLargeReport, LargeRowList> &
  Record<LargeRowList, Array<{ label: string; value: string }>>

export function toStoredCustomLargeReport(data: CustomLargeReport): StoredCustomLargeReport {
  const stored = { ...data } as unknown as StoredCustomLargeReport
  for (const list of LARGE_ROW_LISTS) {
    stored[list] = data[list].map(({ label, value }) => ({ label, value }))
  }
  return stored
}

export function fromStoredCustomLargeReport(
  stored: Partial<StoredCustomLargeReport> | null | undefined,
  fallback: CustomLargeReport,
): CustomLargeReport {
  if (!stored) return fallback

  const present = Object.fromEntries(
    Object.entries(stored).filter(
      ([key, value]) =>
        value !== undefined && value !== null && !LARGE_ROW_LISTS.includes(key as LargeRowList),
    ),
  )
  const revive = (list: Array<{ label?: string; value?: string }> | undefined) =>
    Array.isArray(list) ? list.map((r) => newCustomReportRow(r?.label ?? "", r?.value ?? "")) : null

  const result = { ...fallback, ...present } as CustomLargeReport
  for (const list of LARGE_ROW_LISTS) {
    result[list] = revive(stored[list]) ?? fallback[list]
  }
  // A stored checklist from before a treatment was added is missing that key; the
  // normaliser fills it rather than letting it print as neither answer nor blank.
  result.treatments = normalizeTreatments(stored.treatments ?? fallback.treatments)
  return result
}
