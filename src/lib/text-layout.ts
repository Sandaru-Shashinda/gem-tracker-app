/**
 * Measuring and breaking text for the report layouts.
 *
 * Every report is drawn twice — once on screen, once off-screen for the exporters, which
 * redraw it from cloned styles. Anything left for the browser to decide in that second
 * pass, where a line breaks and where the text runs out of room, can come out differently
 * from what the lab approved, so the lines are settled here instead.
 */

let cachedCtx: CanvasRenderingContext2D | null | undefined

/**
 * Width of `text` set in `font` — a canvas font shorthand, "700 18px Arial" — plus the
 * tracking the shorthand cannot carry.
 */
export function textWidth(text: string, font: string, letterSpacing = 0): number {
  if (cachedCtx === undefined) cachedCtx = document.createElement("canvas").getContext("2d")
  const tracking = letterSpacing * Math.max(text.length - 1, 0)
  if (!cachedCtx) {
    // No 2d context to measure with: fall back to a rough average advance. It errs wide,
    // so borderline text is broken rather than left to overflow its column.
    const size = Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 16)
    return text.length * size * 0.6 + tracking
  }
  cachedCtx.font = font
  return cachedCtx.measureText(text).width + tracking
}

export interface TextBlock {
  /** Width open to the block's lines. */
  width: number
  /** Width open to the first line, where it shares its row with a label. */
  firstLineWidth?: number
  /** Lines past this one are dropped, and the last line kept ends in an ellipsis. */
  maxLines: number
  /** Canvas font shorthand the text is set in. */
  font: string
}

/** Canvas metrics and DOM layout differ by a hair; keep a little of the width in reserve. */
const SAFETY = 0.98
const ELLIPSIS = "…"

/**
 * Breaks `text` into the lines of a fixed block, cut to `maxLines`.
 *
 * The lab types prose into a box whose height was settled before the report was written,
 * so a comment that outruns the block is trimmed back to an ellipsis rather than left to
 * push whatever sits under it off the page.
 */
export function wrapText(text: string | undefined | null, block: TextBlock): string[] {
  const source = (text ?? "").trim()
  if (!source || block.maxLines < 1) return []

  const { font, maxLines } = block
  const lines: string[] = []
  let line = ""
  let truncated = false

  const roomAt = (index: number) =>
    (index === 0 ? (block.firstLineWidth ?? block.width) : block.width) * SAFETY
  const fits = (candidate: string) => textWidth(candidate, font) <= roomAt(lines.length)
  const flush = () => {
    if (lines.length >= maxLines) {
      truncated = true
      return false
    }
    lines.push(line)
    line = ""
    return true
  }

  // Line breaks the lab typed are kept as breaks; the rest of the text is broken to fit.
  const atoms: string[] = []
  source.split(/\r?\n/).forEach((paragraph, i) => {
    if (i > 0) atoms.push("\n")
    atoms.push(...paragraph.split(/\s+/).filter(Boolean))
  })

  for (const atom of atoms) {
    if (truncated) break
    if (atom === "\n") {
      flush()
      continue
    }
    const candidate = line ? `${line} ${atom}` : atom
    if (fits(candidate)) {
      line = candidate
      continue
    }
    if (line && !flush()) break
    if (fits(atom)) {
      line = atom
      continue
    }
    // A word with no room of its own — a URL, an unspaced run of commas — is broken by
    // character rather than left to run out past the column.
    let rest = atom
    while (rest && !truncated) {
      let head = rest
      while (head.length > 1 && !fits(head)) head = head.slice(0, -1)
      line = head
      rest = rest.slice(head.length)
      if (rest && !flush()) break
    }
  }
  if (line) {
    if (lines.length < maxLines) lines.push(line)
    else truncated = true
  }

  if (truncated && lines.length) {
    const last = lines.length - 1
    let head = lines[last]
    while (head && textWidth(head + ELLIPSIS, font) > roomAt(last)) head = head.slice(0, -1)
    lines[last] = head.replace(/[\s,;:.]+$/, "") + ELLIPSIS
  }

  return lines
}
