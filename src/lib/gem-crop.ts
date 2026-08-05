import { detectGemBounds, type CropRect, type GemBounds } from "./gem-outline"

/**
 * Crop bookkeeping for gem photos.
 *
 * The crop is decided at intake (the only moment the full-resolution original exists)
 * but the millimetre measurements that turn it into a real-size render arrive much
 * later, from the testers. So the crop facts travel with the image as metadata and
 * are read back at report time.
 */

export interface GemCropMeta {
  version: 1
  /** How the box was arrived at — useful when auditing a certificate's provenance. */
  source: "auto" | "adjusted" | "manual"
  /** Chosen box in original photo pixels. */
  rect: CropRect
  originalSize: { w: number; h: number }
  /**
   * Padding baked into the stored image, as a fraction of gem size *per side*.
   * Real-size maths must divide this back out, otherwise every gem prints ~4% oversized.
   */
  padFrac: number
  confidence: number
  /**
   * Whether the rect actually hugs the stone. Only tight crops can be printed 1:1 —
   * an operator who chose "use whole image" leaves unknown space around the gem, so
   * there is nothing to scale from.
   */
  tight: boolean
}

/**
 * Crop metadata keyed by the File it belongs to.
 *
 * A WeakMap keeps `File[]` state and the `handleIntake(data, images)` signature
 * untouched all the way down the upload path, and entries disappear with the files.
 */
const cropRegistry = new WeakMap<File, GemCropMeta>()

export const setCropMeta = (file: File, meta: GemCropMeta) => {
  cropRegistry.set(file, meta)
}

export const getCropMeta = (file: File): GemCropMeta | undefined => cropRegistry.get(file)

/** Loads a File into an HTMLImageElement, revoking the object URL once decoded. */
export const loadImageFromFile = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read the image file"))
    }
    img.src = url
  })

/** Clamps a rect to the image frame and guarantees it stays at least 1px on each axis. */
export const clampRect = (rect: CropRect, maxW: number, maxH: number): CropRect => {
  const w = Math.max(1, Math.min(Math.round(rect.w), maxW))
  const h = Math.max(1, Math.min(Math.round(rect.h), maxH))
  return {
    x: Math.max(0, Math.min(Math.round(rect.x), maxW - w)),
    y: Math.max(0, Math.min(Math.round(rect.y), maxH - h)),
    w,
    h,
  }
}

/**
 * Produces a new File containing only the given rect.
 *
 * Cropping happens *before* the existing `compressImage()` pass, which is a quality
 * win rather than just a reordering: the 800px cap and ~30KB JPEG budget then get
 * spent entirely on the stone instead of mostly on background card.
 */
export const cropImageFile = async (file: File, rect: CropRect): Promise<File> => {
  const img = await loadImageFromFile(file)
  const safe = clampRect(rect, img.naturalWidth, img.naturalHeight)

  const canvas = document.createElement("canvas")
  canvas.width = safe.w
  canvas.height = safe.h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  // Matches the white-background flatten that compressImage already does for PNGs.
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, safe.w, safe.h)
  ctx.drawImage(img, safe.x, safe.y, safe.w, safe.h, 0, 0, safe.w, safe.h)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  )
  if (!blob) throw new Error("Canvas toBlob failed while cropping")

  return new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" })
}

/**
 * Detection at or above this confidence is accepted without asking.
 *
 * A clean stone on a plain card scores 1.0, so the ordinary intake photo never
 * interrupts anyone. Anything that scores lower — clutter in frame, a background the
 * flood could not separate, more than one stone — is worth two seconds of a human's
 * attention, because a wrong crop silently produces a certificate claiming a size the
 * stone does not have.
 */
export const AUTO_CONFIRM_CONFIDENCE = 0.85

export interface PendingCrop {
  file: File
  bounds: GemBounds
  naturalSize: { w: number; h: number }
}

export interface CropDecision {
  /** Accepted automatically; ready to crop and upload. */
  auto: Array<{ file: File; rect: CropRect; meta: GemCropMeta }>
  /** Detection was not confident enough — put these in front of the operator. */
  review: PendingCrop[]
}

/** Builds the metadata for a box that came straight from detection, unedited. */
export const autoCropMeta = (bounds: GemBounds, naturalSize: { w: number; h: number }): GemCropMeta => ({
  version: 1,
  source: "auto",
  rect: bounds.rect,
  originalSize: naturalSize,
  padFrac: bounds.padFrac,
  confidence: bounds.confidence,
  tight: true,
})

/**
 * Runs outline detection over a batch of photos and splits them by whether a human
 * needs to look. Files that fail to decode go to review so the operator sees the
 * problem rather than having it swallowed.
 */
export const analyzeGemPhotos = async (files: File[]): Promise<CropDecision> => {
  const decision: CropDecision = { auto: [], review: [] }

  for (const file of files) {
    try {
      const img = await loadImageFromFile(file)
      const naturalSize = { w: img.naturalWidth, h: img.naturalHeight }
      const bounds = detectGemBounds(img)

      if (bounds.ok && bounds.confidence >= AUTO_CONFIRM_CONFIDENCE) {
        decision.auto.push({ file, rect: bounds.rect, meta: autoCropMeta(bounds, naturalSize) })
      } else {
        decision.review.push({ file, bounds, naturalSize })
      }
    } catch {
      decision.review.push({
        file,
        bounds: {
          rect: { x: 0, y: 0, w: 0, h: 0 },
          padFrac: 0,
          confidence: 0,
          ok: false,
          reason: "This image file could not be read.",
        },
        naturalSize: { w: 0, h: 0 },
      })
    }
  }

  return decision
}

/** The metadata to record when the operator opts out of cropping entirely. */
export const wholeImageMeta = (w: number, h: number): GemCropMeta => ({
  version: 1,
  source: "manual",
  rect: { x: 0, y: 0, w, h },
  originalSize: { w, h },
  // No crop means no known gem edges: nothing to compensate for, and nothing to
  // scale from, so real-size rendering falls back to today's contain-fit.
  padFrac: 0,
  confidence: 0,
  tight: false,
})

export type { CropRect }
