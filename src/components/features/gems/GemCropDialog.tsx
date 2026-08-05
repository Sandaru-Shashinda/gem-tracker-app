import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Maximize2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  clampRect,
  wholeImageMeta,
  type CropRect,
  type GemCropMeta,
  type PendingCrop,
} from "@/lib/gem-crop"

/**
 * Reviews gem outlines that detection was not confident about.
 *
 * Confident detections never reach this dialog — they are cropped and uploaded
 * without interrupting anyone. What lands here is the leftovers: clutter in frame,
 * a background the flood could not separate, several stones in one shot. Those are
 * worth a human's eye, because a wrong crop silently yields a certificate claiming a
 * size the stone does not have.
 */

export interface CropResult {
  rect: CropRect
  meta: GemCropMeta
}

interface GemCropDialogProps {
  /** Pre-analysed photos needing review; the dialog walks them one at a time. */
  items: PendingCrop[]
  open: boolean
  /** Called once per item, in queue order, after the operator confirms. */
  onComplete: (results: CropResult[]) => void
  onCancel: () => void
}

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
type DragState =
  | { kind: "move"; startX: number; startY: number; origin: CropRect }
  | { kind: "resize"; handle: Handle; startX: number; startY: number; origin: CropRect }
  | null

const HANDLES: { id: Handle; className: string; cursor: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2", cursor: "ns-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2", cursor: "nesw-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2", cursor: "nwse-resize" },
  { id: "s", className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "ns-resize" },
  { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2", cursor: "nesw-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2", cursor: "ew-resize" },
]

export function GemCropDialog({ items, open, onComplete, onCancel }: GemCropDialogProps) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<CropResult[]>([])
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [rect, setRect] = useState<CropRect | null>(null)
  const [edited, setEdited] = useState(false)

  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState>(null)

  const current = items[index]
  const naturalSize = current?.naturalSize ?? { w: 0, h: 0 }
  const detected = current?.bounds.rect ?? null
  const confidence = current?.bounds.confidence ?? 0
  const warning = current?.bounds.reason
  // Detection already ran before the dialog opened, so there is nothing to wait for
  // here beyond the browser painting the photo.
  const readable = naturalSize.w > 0 && naturalSize.h > 0

  // Show the photo and seed the box whenever the queue advances.
  useEffect(() => {
    if (!open || !current) return
    const url = URL.createObjectURL(current.file)
    setImageUrl(url)
    setRect(readable ? current.bounds.rect : null)
    setEdited(false)
    return () => URL.revokeObjectURL(url)
  }, [open, current, readable])

  // Reset the queue each time the dialog is opened with a fresh batch.
  useEffect(() => {
    if (open) {
      setIndex(0)
      setResults([])
    }
  }, [open, items])

  /** Converts a pointer delta in on-screen pixels into source-image pixels. */
  const scaleFactor = useCallback(() => {
    const frame = frameRef.current
    if (!frame || !naturalSize.w) return 1
    return naturalSize.w / frame.clientWidth
  }, [naturalSize.w])

  useEffect(() => {
    if (!open) return

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !naturalSize.w) return
      const k = scaleFactor()
      const dx = (e.clientX - drag.startX) * k
      const dy = (e.clientY - drag.startY) * k
      const o = drag.origin

      if (drag.kind === "move") {
        setRect(clampRect({ ...o, x: o.x + dx, y: o.y + dy }, naturalSize.w, naturalSize.h))
        setEdited(true)
        return
      }

      let { x, y, w, h } = o
      const MIN = 8
      if (drag.handle.includes("w")) {
        const nx = Math.min(x + dx, x + w - MIN)
        w += x - nx
        x = nx
      }
      if (drag.handle.includes("e")) w = Math.max(MIN, w + dx)
      if (drag.handle.includes("n")) {
        const ny = Math.min(y + dy, y + h - MIN)
        h += y - ny
        y = ny
      }
      if (drag.handle.includes("s")) h = Math.max(MIN, h + dy)

      setRect(clampRect({ x, y, w, h }, naturalSize.w, naturalSize.h))
      setEdited(true)
    }

    const onPointerUp = () => {
      dragRef.current = null
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
    }
  }, [open, naturalSize, scaleFactor])

  const startMove = (e: React.PointerEvent) => {
    if (!rect) return
    e.preventDefault()
    dragRef.current = { kind: "move", startX: e.clientX, startY: e.clientY, origin: rect }
  }

  const startResize = (e: React.PointerEvent, handle: Handle) => {
    if (!rect) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { kind: "resize", handle, startX: e.clientX, startY: e.clientY, origin: rect }
  }

  const advance = (result: CropResult) => {
    const next = [...results, result]
    if (index + 1 < items.length) {
      setResults(next)
      setIndex(index + 1)
    } else {
      onComplete(next)
    }
  }

  const handleConfirm = () => {
    if (!rect || !current) return
    advance({
      rect,
      meta: {
        version: 1,
        source: edited ? "adjusted" : "auto",
        rect,
        originalSize: naturalSize,
        // A hand-drawn box is placed on the stone's edge, so it carries no padding.
        // The detected box reports the padding it actually ended up with, which is
        // not quite PAD_FRAC once rounding and the edge trims have had their say.
        padFrac: edited ? 0 : current.bounds.padFrac,
        confidence: edited ? 1 : confidence,
        tight: true,
      },
    })
  }

  const handleUseWhole = () => {
    if (!naturalSize.w) return
    advance({
      rect: { x: 0, y: 0, w: naturalSize.w, h: naturalSize.h },
      meta: wholeImageMeta(naturalSize.w, naturalSize.h),
    })
  }

  const resetToDetected = () => {
    if (!detected) return
    setRect(detected)
    setEdited(false)
  }

  if (!open || !current) return null

  // Percentages keep the overlay correct at any preview scale, without measuring the DOM.
  const box =
    rect && naturalSize.w
      ? {
          left: `${(rect.x / naturalSize.w) * 100}%`,
          top: `${(rect.y / naturalSize.h) * 100}%`,
          width: `${(rect.w / naturalSize.w) * 100}%`,
          height: `${(rect.h / naturalSize.h) * 100}%`,
        }
      : null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Check gem outline
            {items.length > 1 ? ` (${index + 1} of ${items.length})` : ""}
          </DialogTitle>
          <DialogDescription>
            Automatic detection wasn't sure about this photo. The box should sit on the edges of
            the stone — it is what lets the certificate print the gem at its true size.
          </DialogDescription>
        </DialogHeader>

        <div className='flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800'>
          <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
          <span>
            {warning ??
              `Detection confidence was only ${Math.round(confidence * 100)}% — please adjust the box if it is wrong.`}
          </span>
        </div>

        {/* The frame shrink-wraps the image rather than filling the row, so the
            percentage-positioned overlay lines up with the photo instead of with
            letterbox bars. */}
        <div className='flex justify-center overflow-hidden rounded-lg bg-slate-100'>
          <div
            ref={frameRef}
            className='relative select-none'
            style={{ touchAction: "none", lineHeight: 0 }}
          >
            {imageUrl && (
              <img
                src={imageUrl}
                alt={current.file.name}
                className='block max-h-[55vh] max-w-full'
                draggable={false}
              />
            )}

            {box && (
              <div
                className='absolute cursor-move border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]'
                style={box}
                onPointerDown={startMove}
              >
                {HANDLES.map((handle) => (
                  <div
                    key={handle.id}
                    role='presentation'
                    onPointerDown={(e) => startResize(e, handle.id)}
                    className={`absolute h-3 w-3 rounded-sm border border-white bg-blue-500 ${handle.className}`}
                    style={{ cursor: handle.cursor }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between text-xs text-slate-500'>
          <span>
            {rect
              ? `Crop: ${Math.round(rect.w)} × ${Math.round(rect.h)} px`
              : "This file could not be read."}
          </span>
          {!edited && confidence > 0 && (
            <span>Detection confidence: {Math.round(confidence * 100)}%</span>
          )}
        </div>

        <DialogFooter className='gap-2'>
          <Button type='button' variant='ghost' onClick={onCancel}>
            Cancel
          </Button>
          <Button type='button' variant='outline' onClick={handleUseWhole} disabled={!readable}>
            <Maximize2 className='mr-2 h-4 w-4' />
            Use whole image
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={resetToDetected}
            disabled={!detected || !edited}
          >
            <RotateCcw className='mr-2 h-4 w-4' />
            Reset
          </Button>
          <Button type='button' onClick={handleConfirm} disabled={!rect}>
            {index + 1 < items.length ? "Confirm & next" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
