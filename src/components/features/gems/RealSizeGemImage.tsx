import { useState, type ReactNode } from "react"
import { Loader2, Search } from "lucide-react"

import { useGemImage } from "./GemImage"
import type { GemCropMeta } from "@/lib/gem-crop"
import {
  computeRealSize,
  fitBoxFor,
  gemShadow,
  PX_PER_MM,
  type MeasurementSource,
  type RenderTarget,
  type ReportSize,
} from "@/lib/real-size"

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
  /**
   * Which copy of the certificate this is — the off-screen one that becomes the PDF,
   * or the one on screen, which insets the box so a stone can never sit against its
   * frame on a phone. Defaults to "print" so a caller that forgets cannot silently
   * shrink a certificate.
   */
  target?: RenderTarget
  alt?: string
}

interface UseRealSizeGemImageResult {
  /** Ready to drop inside the certificate's existing image box. */
  node: ReactNode
  /**
   * How the image ended up being sized. Diagnostic only — certificates carry a fixed
   * "Image is approximate" disclaimer whatever this says.
   */
  mode: "exact" | "scaled" | "unavailable"
  loading: boolean
  error: boolean
}

export function useRealSizeGemImage({
  imageId,
  obs,
  reportSize,
  box,
  target = "print",
  alt,
}: UseRealSizeGemImageArgs): UseRealSizeGemImageResult {
  const { image, loading, error } = useGemImage(imageId ?? "")
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)

  const crop = (image?.metadata?.gemCrop as GemCropMeta | undefined) ?? null

  const fitBox = fitBoxFor(box, target)

  const sizing = computeRealSize({
    obs,
    crop,
    natural,
    pxPerMm: PX_PER_MM[reportSize],
    box: fitBox,
  })

  if (loading) {
    return {
      node: <Loader2 className='w-4 h-4 animate-spin' style={{ color: "#cbd5e1" }} />,
      mode: sizing.mode,
      loading,
      error,
    }
  }

  if (error || !image?.url) {
    return {
      node: <Search className='w-4 h-4' style={{ color: "#94a3b8" }} />,
      mode: sizing.mode,
      loading,
      error: true,
    }
  }

  // The image has to be on the page before it can be measured, so it always renders;
  // until `natural` is known, sizing falls through to the contain-fit branch.
  const sized = sizing.mode !== "unavailable"

  // Scale the shadow to how big the gem actually comes out. Before the image has been
  // measured there is no rendered size yet, so fall back to the box it sits in.
  const longestEdge = sized ? Math.max(sizing.width, sizing.height) : Math.max(fitBox.w, fitBox.h)
  const shadow = gemShadow(longestEdge)

  /** Hard ceiling in pixels, so no path can draw the gem outside its frame. */
  const boxLimit = { maxWidth: `${fitBox.w}px`, maxHeight: `${fitBox.h}px` }

  return {
    node: (
      // Shrink-wraps the image so the shadow's percentage width resolves against the
      // photo rather than the certificate's image box, which is usually much wider.
      <div style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
        {/* First in DOM and absolutely positioned, so the statically-positioned image
            paints over its top half — only the lower half of the ellipse shows. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: `${((1 - shadow.widthFrac) / 2) * 100}%`,
            width: `${shadow.widthFrac * 100}%`,
            height: `${shadow.height}px`,
            bottom: `-${shadow.height / 2}px`,
            background: shadow.background,
            pointerEvents: "none",
          }}
        />
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
              ? {
                  width: `${sizing.width}px`,
                  height: `${sizing.height}px`,
                  display: "block",
                  position: "relative",
                  // computeRealSize already fits the box; these are the backstop that
                  // keeps a gem from ever spilling over the certificate's border if it
                  // doesn't.
                  ...boxLimit,
                  objectFit: "contain",
                }
              : {
                  display: "block",
                  position: "relative",
                  // Percentages were the obvious way to write this and were wrong: the
                  // wrapper shrink-wraps the image, so `max-height: 100%` resolves
                  // against an auto height and is dropped entirely. A portrait photo
                  // then rendered past the frame and was clipped by its overflow —
                  // which is what a QR visitor saw whenever crop metadata was missing.
                  ...boxLimit,
                  objectFit: "contain",
                }
          }
        />
      </div>
    ),
    mode: sizing.mode,
    loading,
    error,
  }
}
