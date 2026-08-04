/**
 * Automatic gem outline detection.
 *
 * Gem photos are shot on a plain, consistent background (white / black / grey card),
 * which lets us separate stone from background with plain canvas work — no ML model,
 * no extra dependency.
 *
 * The output is a bounding box in *source image* pixels. Cropping to that box is what
 * makes real-size rendering possible later: once the stored image is tight to the
 * stone, image width *is* gem width, so sizing becomes one multiplication.
 */

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface GemBounds {
  /** Bounding box in source-image pixel coordinates, padding already applied. */
  rect: CropRect
  /**
   * Padding actually present in `rect`, as a fraction of gem size *per side*.
   *
   * Not simply {@link PAD_FRAC}: rounding to whole pixels and the edge trims move
   * the box around, and real-size rendering divides this back out — so a value that
   * merely reflects the intent rather than the result would print every gem wrong
   * by a few percent.
   */
  padFrac: number
  /** 0..1 — how much to trust this box. Low values should prompt the operator to check. */
  confidence: number
  /** false => detection failed outright, fall back to a manual crop. */
  ok: boolean
  /** Human-readable explanation when `ok` is false or confidence is poor. */
  reason?: string
}

/** Long edge of the analysis canvas. Small is good: fast, and it blurs away sensor noise + JPEG blocking. */
const WORK_MAX = 256
/** Thickness of the border ring sampled to learn the background colour. */
const BORDER_RING = 2
/** Fraction of the box added on each side so the crop never shaves the stone's edge. */
export const PAD_FRAC = 0.02
/** Rows/columns below this share of the peak row/column coverage are wisps, not stone. */
const EDGE_TRIM_FRAC = 0.02
/**
 * Pixels below this share of the component's peak contrast against the background are
 * shadow rather than stone. Relative, so it adapts to a pale stone on white just as
 * well as a dark one — the stone's own core contrast sets the bar.
 */
const SHADOW_CONTRAST_FRAC = 0.25
/** Box must cover at least this fraction of the frame to be a plausible stone. */
const MIN_AREA_FRAC = 0.005
/** Above this, background was never separated — we just boxed the whole photo. */
const MAX_AREA_FRAC = 0.95

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

interface BackgroundModel {
  r: number
  g: number
  b: number
  luma: number
  tolLuma: number
  tolChroma: number
}

/**
 * Learns the background colour from a ring of pixels around the frame border.
 *
 * Median rather than mean so a tweezer tip or a stray label intruding at the edge
 * doesn't drag the estimate. Tolerances widen on noisy backgrounds via the spread
 * of the ring itself.
 */
function sampleBackground(data: Uint8ClampedArray, w: number, h: number): BackgroundModel {
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []

  for (let y = 0; y < h; y++) {
    const onVerticalEdge = y < BORDER_RING || y >= h - BORDER_RING
    for (let x = 0; x < w; x++) {
      const onHorizontalEdge = x < BORDER_RING || x >= w - BORDER_RING
      if (!onVerticalEdge && !onHorizontalEdge) continue
      const i = (y * w + x) * 4
      rs.push(data[i])
      gs.push(data[i + 1])
      bs.push(data[i + 2])
    }
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)] ?? 0
  }

  const r = median(rs)
  const g = median(gs)
  const b = median(bs)
  const bgLuma = luma(r, g, b)

  // Spread of the ring's brightness — a gradient-lit or textured backdrop needs looser tolerance.
  let variance = 0
  for (let i = 0; i < rs.length; i++) {
    const d = luma(rs[i], gs[i], bs[i]) - bgLuma
    variance += d * d
  }
  const stdDev = Math.sqrt(variance / Math.max(1, rs.length))

  return {
    r,
    g,
    b,
    luma: bgLuma,
    tolLuma: Math.min(70, Math.max(26, stdDev * 3)),
    tolChroma: Math.min(80, Math.max(32, stdDev * 3)),
  }
}

/**
 * Brightness and colour are tested separately on purpose: a dark blue sapphire on a
 * dark grey card is close in brightness but far in colour, and a pale champagne
 * diamond on white is the reverse. Requiring both to be close catches each case.
 */
function isBackgroundPixel(r: number, g: number, b: number, bg: BackgroundModel): boolean {
  if (Math.abs(luma(r, g, b) - bg.luma) > bg.tolLuma) return false
  return chromaDistance(r, g, b, bg) <= bg.tolChroma
}

/** Opponent-colour distance (red-green, yellow-blue) — independent of brightness. */
function chromaDistance(r: number, g: number, b: number, bg: BackgroundModel): number {
  const dRG = r - g - (bg.r - bg.g)
  const dYB = r + g - 2 * b - (bg.r + bg.g - 2 * bg.b)
  return Math.sqrt(dRG * dRG + dYB * dYB * 0.25)
}

/** How far a pixel stands out from the background, on whichever axis separates it best. */
function backgroundDistance(r: number, g: number, b: number, bg: BackgroundModel): number {
  return Math.max(Math.abs(luma(r, g, b) - bg.luma), chromaDistance(r, g, b, bg))
}

/**
 * Marks background by flooding inward from the frame edges.
 *
 * Flood fill rather than a global threshold is the important choice here: a dark
 * inclusion or a deep shadow facet *inside* the stone matches the background colour
 * of a black card, but it is not reachable from the border, so it stays foreground.
 */
function floodBackground(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bg: BackgroundModel,
): { isBg: Uint8Array; borderMatch: number } {
  const isBg = new Uint8Array(w * h)
  const visited = new Uint8Array(w * h)
  const stack: number[] = []

  let borderTotal = 0
  let borderMatched = 0

  const pushIfBackground = (x: number, y: number) => {
    const p = y * w + x
    if (visited[p]) return
    visited[p] = 1
    const i = p * 4
    if (isBackgroundPixel(data[i], data[i + 1], data[i + 2], bg)) {
      isBg[p] = 1
      stack.push(p)
    }
  }

  for (let x = 0; x < w; x++) {
    borderTotal += 2
    const top = x * 4
    const bottom = ((h - 1) * w + x) * 4
    if (isBackgroundPixel(data[top], data[top + 1], data[top + 2], bg)) borderMatched++
    if (isBackgroundPixel(data[bottom], data[bottom + 1], data[bottom + 2], bg)) borderMatched++
    pushIfBackground(x, 0)
    pushIfBackground(x, h - 1)
  }
  for (let y = 0; y < h; y++) {
    borderTotal += 2
    const left = y * w * 4
    const right = (y * w + w - 1) * 4
    if (isBackgroundPixel(data[left], data[left + 1], data[left + 2], bg)) borderMatched++
    if (isBackgroundPixel(data[right], data[right + 1], data[right + 2], bg)) borderMatched++
    pushIfBackground(0, y)
    pushIfBackground(w - 1, y)
  }

  while (stack.length) {
    const p = stack.pop()!
    const x = p % w
    const y = (p / w) | 0
    if (x > 0) pushIfBackground(x - 1, y)
    if (x < w - 1) pushIfBackground(x + 1, y)
    if (y > 0) pushIfBackground(x, y - 1)
    if (y < h - 1) pushIfBackground(x, y + 1)
  }

  return { isBg, borderMatch: borderTotal ? borderMatched / borderTotal : 0 }
}

/** 3x3 erode then dilate — removes dust specks and single-pixel noise without shrinking the stone. */
function morphologicalOpen(mask: Uint8Array, w: number, h: number): Uint8Array {
  const apply = (src: Uint8Array, wantAll: boolean) => {
    const out = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let hit = wantAll
        for (let dy = -1; dy <= 1 && hit === wantAll; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            // Treat outside-the-frame as background so erode trims edge-touching blobs.
            const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : src[ny * w + nx]
            if (wantAll && !v) {
              hit = false
              break
            }
            if (!wantAll && v) {
              hit = true
              break
            }
          }
        }
        out[y * w + x] = hit ? 1 : 0
      }
    }
    return out
  }
  return apply(apply(mask, true), false) // erode, then dilate
}

/**
 * Keeps only the biggest blob. Drops tweezer tips, scale rulers, and detached dust
 * that survived the open — the stone is reliably the largest thing in frame.
 */
function largestComponent(
  mask: Uint8Array,
  w: number,
  h: number,
): { pixels: Uint8Array; area: number } | null {
  const label = new Uint8Array(w * h)
  let best: { pixels: Uint8Array; area: number } | null = null
  const stack: number[] = []

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue

    const component = new Uint8Array(w * h)
    let area = 0
    stack.push(start)
    label[start] = 1

    while (stack.length) {
      const p = stack.pop()!
      component[p] = 1
      area++
      const x = p % w
      const y = (p / w) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const np = ny * w + nx
          if (mask[np] && !label[np]) {
            label[np] = 1
            stack.push(np)
          }
        }
      }
    }

    if (!best || area > best.area) best = { pixels: component, area }
  }

  return best
}

/**
 * Regrows the full connected component of `mask` that contains `seed`.
 *
 * The open() used to reject dust also erodes a pixel off the stone's outline, and at
 * the extreme tips of a rounded shape the dilate cannot put it back — so the opened
 * mask under-measures the gem. Selecting the component on the opened mask but
 * measuring it on the original recovers the true extent with no fudge factor, while
 * still leaving detached dust behind (it is a different component).
 */
function componentContaining(mask: Uint8Array, seed: number, w: number, h: number) {
  const pixels = new Uint8Array(w * h)
  if (!mask[seed]) return { pixels, area: 0 }

  let area = 0
  const stack = [seed]
  pixels[seed] = 1

  while (stack.length) {
    const p = stack.pop()!
    area++
    const x = p % w
    const y = (p / w) | 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const np = ny * w + nx
        if (mask[np] && !pixels[np]) {
          pixels[np] = 1
          stack.push(np)
        }
      }
    }
  }

  return { pixels, area }
}

/**
 * Drops the low-contrast fringe of a component — a soft drop shadow.
 *
 * A shadow stays connected to the stone and is often nearly as wide, so neither the
 * connected-component step nor a coverage trim removes it, and it would inflate the
 * box by tens of percent. What separates it is contrast: a shadow sits close to the
 * background colour while the stone does not.
 *
 * Returns the surviving mask, or the original if the split would throw away most of
 * the stone (a genuinely low-contrast gem, where trimming is the greater risk).
 */
function dropShadowFringe(
  component: Uint8Array,
  area: number,
  data: Uint8ClampedArray,
  w: number,
  h: number,
  bg: BackgroundModel,
): { pixels: Uint8Array; area: number } {
  let peak = 0
  for (let p = 0; p < component.length; p++) {
    if (!component[p]) continue
    const i = p * 4
    const d = backgroundDistance(data[i], data[i + 1], data[i + 2], bg)
    if (d > peak) peak = d
  }

  const floor = peak * SHADOW_CONTRAST_FRAC
  const strict = new Uint8Array(w * h)
  for (let p = 0; p < component.length; p++) {
    if (!component[p]) continue
    const i = p * 4
    if (backgroundDistance(data[i], data[i + 1], data[i + 2], bg) >= floor) strict[p] = 1
  }

  const core = largestComponent(strict, w, h)
  // Losing more than half the component means the contrast split found structure
  // inside the stone rather than a shadow beside it — don't trust it.
  if (!core || core.area < area * 0.5) return { pixels: component, area }
  return core
}

/**
 * Trims rows and columns at the edge of the box that hold almost no stone — the
 * single-pixel tips of a rounded outline, and stray wisps the open left behind.
 *
 * The threshold is deliberately low. Over-including by a hair costs a fraction of a
 * millimetre; cutting into the stone is visible and wrong.
 */
function trimEdges(
  component: Uint8Array,
  w: number,
  h: number,
  box: { x0: number; y0: number; x1: number; y1: number },
) {
  const rowCounts = new Array<number>(h).fill(0)
  const colCounts = new Array<number>(w).fill(0)

  for (let y = box.y0; y <= box.y1; y++) {
    for (let x = box.x0; x <= box.x1; x++) {
      if (component[y * w + x]) {
        rowCounts[y]++
        colCounts[x]++
      }
    }
  }

  const peakRow = Math.max(...rowCounts.slice(box.y0, box.y1 + 1))
  const peakCol = Math.max(...colCounts.slice(box.x0, box.x1 + 1))
  const rowFloor = peakRow * EDGE_TRIM_FRAC
  const colFloor = peakCol * EDGE_TRIM_FRAC

  let { x0, y0, x1, y1 } = box
  while (y0 < y1 && rowCounts[y0] <= rowFloor) y0++
  while (y1 > y0 && rowCounts[y1] <= rowFloor) y1--
  while (x0 < x1 && colCounts[x0] <= colFloor) x0++
  while (x1 > x0 && colCounts[x1] <= colFloor) x1--

  return { x0, y0, x1, y1 }
}

/**
 * Finds the gem's bounding box in a photo.
 *
 * Returned rect is in source-image pixels with {@link PAD_FRAC} padding already added;
 * anything consuming it for real-size maths must divide that padding back out.
 */
export function detectGemBounds(img: HTMLImageElement | HTMLCanvasElement): GemBounds {
  const srcW = img instanceof HTMLImageElement ? img.naturalWidth : img.width
  const srcH = img instanceof HTMLImageElement ? img.naturalHeight : img.height

  const whole: GemBounds = {
    rect: { x: 0, y: 0, w: srcW, h: srcH },
    padFrac: 0,
    confidence: 0,
    ok: false,
  }

  if (!srcW || !srcH) return { ...whole, reason: "Image has no dimensions." }

  const ratio = Math.min(1, WORK_MAX / Math.max(srcW, srcH))
  const w = Math.max(8, Math.round(srcW * ratio))
  const h = Math.max(8, Math.round(srcH * ratio))

  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return { ...whole, reason: "Canvas is unavailable in this browser." }

  ctx.drawImage(img, 0, 0, w, h)

  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, w, h).data
  } catch {
    // Cross-origin images taint the canvas. Local uploads never hit this.
    return { ...whole, reason: "Image could not be read for analysis." }
  }

  const bg = sampleBackground(data, w, h)
  const { isBg, borderMatch } = floodBackground(data, w, h, bg)

  const foreground = new Uint8Array(w * h)
  for (let i = 0; i < foreground.length; i++) foreground[i] = isBg[i] ? 0 : 1

  // Pick the gem on the opened mask (dust-free), then measure it on the original.
  const opened = largestComponent(morphologicalOpen(foreground, w, h), w, h)
  if (!opened || opened.area < 4) {
    return { ...whole, reason: "No gem could be separated from the background." }
  }
  const seed = opened.pixels.indexOf(1)
  const blob = componentContaining(foreground, seed, w, h)

  const component = dropShadowFringe(blob.pixels, blob.area, data, w, h, bg)

  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!component.pixels[y * w + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  if (x1 < x0 || y1 < y0) {
    return { ...whole, reason: "No gem could be separated from the background." }
  }

  const trimmed = trimEdges(component.pixels, w, h, { x0, y0, x1, y1 })

  const boxW = trimmed.x1 - trimmed.x0 + 1
  const boxH = trimmed.y1 - trimmed.y0 + 1
  const areaFrac = (boxW * boxH) / (w * h)

  // A gem roughly fills its own bounding box; a sprawling reflection or a mis-flood does not.
  const fillRatio = component.area / (boxW * boxH)
  const areaScore = areaFrac > MAX_AREA_FRAC || areaFrac < MIN_AREA_FRAC ? 0 : 1
  const confidence = Math.max(
    0,
    Math.min(1, borderMatch * Math.min(1, fillRatio / 0.7) * areaScore),
  )

  // Convert back to source pixels and pad, clamped to the frame.
  const inv = 1 / ratio
  const gemW = boxW * inv
  const gemH = boxH * inv
  const padX = gemW * PAD_FRAC
  const padY = gemH * PAD_FRAC
  const px = Math.max(0, Math.round(trimmed.x0 * inv - padX))
  const py = Math.max(0, Math.round(trimmed.y0 * inv - padY))
  const rect: CropRect = {
    x: px,
    y: py,
    w: Math.min(srcW - px, Math.round(gemW + padX * 2)),
    h: Math.min(srcH - py, Math.round(gemH + padY * 2)),
  }

  // What padding actually survived rounding, the edge trim, and clamping to the frame.
  //
  // Measured against the *untrimmed* component extent, because that is the stone's
  // real span: trimEdges only shaves the sub-2%-coverage tips of a rounded outline,
  // which belong to the gem even though they are too thin to anchor the crop on.
  // Measuring against the trimmed box instead would under-report the gem by the trim
  // width and print every stone a few percent small.
  const refW = (x1 - x0 + 1) * inv
  const refH = (y1 - y0 + 1) * inv
  // Clamped at zero: when the frame edge cuts the padding short, erring towards a
  // slightly small gem beats claiming padding that isn't there.
  const padFrac = Math.max(0, (rect.w / refW - 1 + (rect.h / refH - 1)) / 4)

  if (areaFrac > MAX_AREA_FRAC) {
    return {
      rect,
      padFrac,
      confidence,
      ok: false,
      reason: "The gem could not be told apart from the background — please crop manually.",
    }
  }
  if (areaFrac < MIN_AREA_FRAC) {
    return {
      rect,
      padFrac,
      confidence,
      ok: false,
      reason: "Only a speck was detected, not a gem — please crop manually.",
    }
  }

  return {
    rect,
    padFrac,
    confidence,
    ok: true,
    reason:
      confidence < 0.6 ? "Detection is uncertain — please check the box before confirming." : undefined,
  }
}
