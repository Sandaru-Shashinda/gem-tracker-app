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
  caption: string
  /** Why 1:1 was not possible, for the console / future debugging. */
  reason?: string
}

/** Beyond this disagreement between crop aspect and L:W, the crop and the numbers don't describe the same view. */
const ASPECT_TOLERANCE = 0.15

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null
  const n = typeof value === "number" ? value : parseFloat(String(value))
  return Number.isFinite(n) && n > 0 ? n : null
}

const UNAVAILABLE = (reason: string): RealSizeResult => ({
  mode: "unavailable",
  width: 0,
  height: 0,
  caption: "Image is approximate",
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

  if (aspectOff > ASPECT_TOLERANCE) {
    const longPx = Math.max(width, height)
    if (cropAspect >= 1) {
      width = longPx
      height = longPx / cropAspect
    } else {
      height = longPx
      width = longPx * cropAspect
    }
    return {
      mode: "scaled",
      width,
      height,
      caption: "Not to scale",
      reason: "Crop shape does not match the measured dimensions.",
    }
  }

  // A large stone can simply be bigger than the box the certificate layout allows.
  if (width > box.w || height > box.h) {
    const fit = Math.min(box.w / width, box.h / height)
    return {
      mode: "scaled",
      width: width * fit,
      height: height * fit,
      caption: "Not to scale",
      reason: "Gem is larger than the image area on this report size.",
    }
  }

  return { mode: "exact", width, height, caption: "Actual size (1:1)" }
}
