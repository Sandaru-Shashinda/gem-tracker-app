import type { GemCropMeta } from "./gem-crop"

/**
 * Turning measured millimetres into report pixels.
 *
 * Each report preview is laid out on a fixed-width canvas that maps to a physical
 * paper size. Those constants already existed in the preview components; they are
 * restated here as an explicit pixels-per-millimetre scale, which is the only thing
 * standing between a CSS pixel size and a printed size.
 */

export const PX_PER_MM = {
  /** LargeReportPreview A4_W = 794px across A4's 210mm. */
  large: 794 / 210,
  /** MediumReportPreview inner canvas is 1120px across A5 landscape's 210mm. */
  medium: 1120 / 210,
  /** SmallReportPreview CARD_WIDTH = 640px across a 85.6mm bank card. */
  small: 640 / 85.6,
  /** VerbalReportPreview CARD_W = 794px, also A4 width. */
  verbal: 794 / 210,
} as const

export type ReportSize = keyof typeof PX_PER_MM

/**
 * Which copy of a certificate a gem is being drawn into.
 *
 * Every preview renders its card twice: the copy shown on screen, and an off-screen
 * copy at natural size that becomes the PNG/PDF. Only the second is a physical
 * artefact, so only it is sized 1:1 — see {@link fitBoxFor} for why the other is not.
 */
export type RenderTarget = "print" | "screen"

/**
 * Share of the certificate's image box a gem may fill on screen.
 *
 * A phone that scans the QR code shrinks the whole card to its viewport, and at that
 * size a stone drawn edge-to-edge in its frame reads as artwork that has been cropped
 * rather than as a gem — the more so for a large stone, whose true size genuinely does
 * fill the frame. The screen copy therefore keeps a margin inside the frame; the print
 * copy never does, because a millimetre on paper is the whole point of it.
 */
const SCREEN_FIT = 0.85

/** The space a gem may occupy on the given copy: the frame itself, or an inset of it. */
export function fitBoxFor(box: { w: number; h: number }, target: RenderTarget) {
  return target === "screen" ? { w: box.w * SCREEN_FIT, h: box.h * SCREEN_FIT } : box
}

/** The dimension fields as they exist on the stage observations (misspelling is the schema's). */
export interface MeasurementSource {
  messurementX?: number | string | null
  messurementY?: number | string | null
  messurementZ?: number | string | null
}

export interface RealSizeResult {
  /** exact = printed 1:1. scaled = uniformly shrunk to fit. unavailable = fall back to contain-fit. */
  mode: "exact" | "scaled" | "unavailable"
  /** Render size in report canvas pixels. Meaningless when mode is "unavailable". */
  width: number
  height: number
  /**
   * Why 1:1 was not possible. Diagnostic only — the certificates always print the
   * fixed "Image is approximate" disclaimer regardless of how the sizing turned out.
   */
  reason?: string
}

/** Beyond this disagreement between crop aspect and L:W, the crop and the numbers don't describe the same view. */
const ASPECT_TOLERANCE = 0.15

/**
 * Share of the image box a gem may fill once it has to be scaled down anyway,
 * leaving the remainder for its drop shadow to fall into.
 *
 * Applied only on the already-scaled path. A gem printing at true 1:1 must never be
 * shrunk for decoration, so this deliberately does not touch the exact case.
 */
const SHADOW_ROOM = 0.9

/** Shadow width, as a share of the image width. Narrower than the stone reads as ground contact. */
const SHADOW_WIDTH_FRAC = 0.55
/** Shadow height, as a share of the image's longest edge. */
const SHADOW_HEIGHT_FRAC = 0.1

/**
 * A soft ellipse sitting under the gem, proportional to how large it renders.
 *
 * This is deliberately a separate element rather than a `box-shadow`. Stored gem
 * photos are opaque JPEGs — the crop flattens them onto white — so they are white
 * rectangles on a white certificate, and any box-shadow traces the *photo's* border,
 * advertising the image as a pasted-in rectangle. Clipping that back with a negative
 * spread leaves a lip exactly as wide as the photo, which still reads as the bottom
 * edge of a box. A box-shadow's spread is uniform on all four sides, so its width
 * cannot be narrowed independently at all.
 *
 * An ellipse narrower than the stone, fading to nothing at its own edges, has no
 * straight edge anywhere to give the rectangle away.
 *
 * Sizes are fractions of the image because gems render at true physical size: the
 * same layout shows a 23px melee and a 190px stone, and a fixed shadow would be a
 * smudge under one and invisible under the other.
 */
export function gemShadow(longestEdgePx: number) {
  const height = Math.max(4, longestEdgePx * SHADOW_HEIGHT_FRAC)
  return {
    /** Share of the image's width, applied as a CSS percentage. */
    widthFrac: SHADOW_WIDTH_FRAC,
    height,
    /**
     * Centred on the image's bottom edge, so the upper half hides behind the photo
     * and only the lower half shows — this is what {@link SHADOW_ROOM} accommodates.
     */
    reachBelow: height / 2,
    background:
      "radial-gradient(ellipse closest-side, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.2) 55%, rgba(15, 23, 42, 0) 100%)",
  }
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) && n > 0 ? n : null
}

const UNAVAILABLE = (reason: string): RealSizeResult => ({
  mode: "unavailable",
  width: 0,
  height: 0,
  reason,
})

export interface ComputeRealSizeArgs {
  obs: MeasurementSource | null | undefined
  crop: GemCropMeta | null | undefined
  /** Natural pixel size of the stored (already cropped) image. */
  natural: { w: number; h: number } | null
  pxPerMm: number
  /** The report's image box, in the same canvas pixels. */
  box: { w: number; h: number }
}

/**
 * Works out how large the stored gem image must be drawn to print at life size.
 *
 * Every failure path falls back to today's behaviour — contain-fit with an
 * "Image is approximate" caption — because the vast majority of existing images
 * predate cropping and have no metadata at all.
 */
export function computeRealSize({
  obs,
  crop,
  natural,
  pxPerMm,
  box,
}: ComputeRealSizeArgs): RealSizeResult {
  if (!crop?.tight) return UNAVAILABLE("Image was not cropped to the gem outline.")
  if (!natural?.w || !natural?.h) return UNAVAILABLE("Image size not known yet.")

  const x = toNumber(obs?.messurementX)
  const y = toNumber(obs?.messurementY)
  if (!x || !y) return UNAVAILABLE("Measurements have not been entered yet.")

  const longMm = Math.max(x, y)
  const shortMm = Math.min(x, y)

  // The photo's own orientation decides which measurement is the horizontal one —
  // nobody records whether the stone was shot with its length across or up the frame.
  const landscape = natural.w >= natural.h
  const widthMm = landscape ? longMm : shortMm
  const heightMm = landscape ? shortMm : longMm

  // The crop carries `padFrac` of empty space on each side, so the image is wider
  // than the stone by that much and must be drawn correspondingly larger.
  const padScale = 1 + 2 * (crop.padFrac ?? 0)

  let width = widthMm * pxPerMm * padScale
  let height = heightMm * pxPerMm * padScale

  // A crop whose shape disagrees with the measured L:W is describing a different view
  // (a side-on shot, or a bad box). Stretching it to fit would misrepresent the stone,
  // so scale uniformly off the long axis and drop the 1:1 claim.
  const cropAspect = natural.w / natural.h
  const measuredAspect = width / height
  const aspectOff = Math.abs(cropAspect - measuredAspect) / measuredAspect

  let mode: RealSizeResult["mode"] = "exact"
  let reason: string | undefined

  if (aspectOff > ASPECT_TOLERANCE) {
    const longPx = Math.max(width, height)
    if (cropAspect >= 1) {
      width = longPx
      height = longPx / cropAspect
    } else {
      height = longPx
      width = longPx * cropAspect
    }
    mode = "scaled"
    reason = "Crop shape does not match the measured dimensions."
  }

  // Fit to the box last, and unconditionally — a large stone can simply be bigger than
  // the image area the certificate layout allows, and the reshaping above can push it
  // past the box too. Overflowing here would spill the gem over the certificate's
  // border, so this clamp has to sit after every branch that sets a size.
  if (width > box.w || height > box.h) {
    // SHADOW_ROOM keeps the drop shadow inside the box rather than clipped against it.
    // Safe to apply here because this branch is already not to scale; the exact path
    // above never reaches it and so is never shrunk for decoration.
    const fit = Math.min(box.w / width, box.h / height) * SHADOW_ROOM
    width *= fit
    height *= fit
    mode = "scaled"
    reason = reason ?? "Gem is larger than the image area on this report size."
  }

  return { mode, width, height, reason }
}
