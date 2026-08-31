/**
 * Laying a gem name into the name column of a report.
 *
 * The name is the headline of every certificate, and the one field whose length the lab
 * does not choose: "Ruby" and "Star Pink Sapphire" are set in the same box. Left to wrap
 * on its own the line breaks wherever it runs out of room, which on the small card puts
 * "Star Pink" over "Sapphire" — the colour is torn off the species and the two lines read
 * as two different stones.
 *
 * A name that does not fit is therefore broken deliberately: the last two words, the
 * colour and the species, stay together on the closing line, and the qualifiers in front
 * of them ("Star", "Natural Star") take the first. If the wider of the two lines is still
 * too wide for the column the type steps down until it fits — but only so far, since past
 * a point a shrunken headline reads as a mistake rather than as a fit.
 */

export interface GemNameColumn {
  /** Usable width of the column, in the report's own pixels. */
  maxWidth: number
  /** Size the name is set at when it fits on one line. */
  fontSize: number
  fontFamily: string
  fontWeight: number | string
  /** Extra tracking the column applies, in px — measureText knows nothing about it. */
  letterSpacing?: number
  /** Set when the column draws the name in caps, so it is measured in caps. */
  uppercase?: boolean
}

export interface GemNameLayout {
  /** The name as it should be drawn, one entry per line. Empty for a nameless gem. */
  lines: string[]
  /** Size to set the lines at: the column's own, unless the name had to shrink to fit. */
  fontSize: number
}

/** Canvas metrics and DOM layout differ by a hair; keep a little of the column in reserve. */
const SAFETY = 0.98
/** How far the type may step down before the fit itself starts to look like a mistake. */
const MIN_SCALE = 0.75
const STEP = 0.5

let cachedCtx: CanvasRenderingContext2D | null | undefined

function textWidth(text: string, font: string, letterSpacing: number): number {
  if (cachedCtx === undefined) cachedCtx = document.createElement("canvas").getContext("2d")
  const tracking = letterSpacing * Math.max(text.length - 1, 0)
  if (!cachedCtx) {
    // No 2d context to measure with: fall back to a rough average advance. It errs wide,
    // so a borderline name gets broken rather than left to overflow the column.
    const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 16)
    return text.length * size * 0.6 + tracking
  }
  cachedCtx.font = font
  return cachedCtx.measureText(text).width + tracking
}

export function layoutGemName(
  name: string | undefined | null,
  column: GemNameColumn
): GemNameLayout {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { lines: [], fontSize: column.fontSize }

  const limit = column.maxWidth * SAFETY
  const widest = (lines: string[], size: number) => {
    const font = `${column.fontWeight} ${size}px ${column.fontFamily}`
    return Math.max(
      ...lines.map((line) =>
        textWidth(column.uppercase ? line.toUpperCase() : line, font, column.letterSpacing ?? 0)
      )
    )
  }

  // Three words is the shortest name carrying a qualifier in front of the colour and
  // species, so it is also the shortest one there is a right place to break.
  let lines = [words.join(" ")]
  if (words.length >= 3 && widest(lines, column.fontSize) > limit) {
    lines = [words.slice(0, -2).join(" "), words.slice(-2).join(" ")]
  }

  let fontSize = column.fontSize
  const floor = column.fontSize * MIN_SCALE
  while (fontSize - STEP >= floor && widest(lines, fontSize) > limit) fontSize -= STEP

  return { lines, fontSize }
}
