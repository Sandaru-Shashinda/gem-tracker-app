import { useState, type ReactNode } from "react"
import { Loader2, Search } from "lucide-react"

import { useGemImage } from "./GemImage"
import type { GemCropMeta } from "@/lib/gem-crop"
import { computeRealSize, PX_PER_MM, type MeasurementSource, type ReportSize } from "@/lib/real-size"

/**
 * Renders a gem photo at its true physical size on a certificate.
 *
 * Only possible when the image was cropped to the stone's outline at intake *and*
 * the testers have entered measurements. Anything short of that renders exactly as
 * before — contain-fit inside its box, captioned "Image is approximate" — so the
 * images that predate this feature keep working untouched.
 *
 * This is a hook rather than a component because the certificates print the caption
 * *outside* the image's bordered box, while only the sizing logic knows what the
 * caption should say.
 */

interface UseRealSizeGemImageArgs {
  /** May be empty — the hook then reports `error` and the caller draws its own placeholder. */
  imageId: string | undefined
  /** Stage observations holding messurementX/Y/Z, in millimetres. */
  obs: MeasurementSource | null | undefined
  /** Which report canvas this is drawn on — determines the pixels-per-mm scale. */
  reportSize: ReportSize
  /** Space available for the image, in report canvas pixels. */
  box: { w: number; h: number }
  alt?: string
}

interface UseRealSizeGemImageResult {
  /** Ready to drop inside the certificate's existing image box. */
  node: ReactNode
  /** "Actual size (1:1)", "Not to scale", or "Image is approximate". */
  caption: string
  mode: "exact" | "scaled" | "unavailable"
  loading: boolean
  error: boolean
}

export function useRealSizeGemImage({
  imageId,
  obs,
  reportSize,
  box,
  alt,
}: UseRealSizeGemImageArgs): UseRealSizeGemImageResult {
  const { image, loading, error } = useGemImage(imageId ?? "")
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const crop = (image?.metadata?.gemCrop as GemCropMeta | undefined) ?? null

  const sizing = computeRealSize({
    obs,
    crop,
    natural,
    pxPerMm: PX_PER_MM[reportSize],
    box,
  })

  if (loading) {
    return {
      node: <Loader2 className='w-4 h-4 animate-spin' style={{ color: "#cbd5e1" }} />,
      caption: sizing.caption,
      mode: sizing.mode,
      loading,
      error,
    }
  }

  if (error || !image?.url) {
    return {
      node: <Search className='w-4 h-4' style={{ color: "#94a3b8" }} />,
      caption: sizing.caption,
      mode: sizing.mode,
      loading,
      error: true,
    }
  }

  // The image has to be on the page before it can be measured, so it always renders;
  // until `natural` is known, sizing falls through to the contain-fit branch.
  const sized = sizing.mode !== "unavailable"

  return {
    node: (
      <img
        src={image.url}
        alt={alt || image.name}
        onLoad={(e) => {
          const el = e.currentTarget
          if (el.naturalWidth && el.naturalHeight) {
            setNatural((prev) =>
              prev?.w === el.naturalWidth && prev?.h === el.naturalHeight
                ? prev
                : { w: el.naturalWidth, h: el.naturalHeight },
            )
          }
        }}
        style={
          sized
            ? { width: `${sizing.width}px`, height: `${sizing.height}px`, display: "block" }
            : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
        }
      />
    ),
    caption: sizing.caption,
    mode: sizing.mode,
    loading,
    error,
  }
}
