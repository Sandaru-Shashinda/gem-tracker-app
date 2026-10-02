import { RotateCcw } from "lucide-react"

import { defaultLayout, type CustomLayout, type FontField } from "@/lib/custom-report"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

/** The type sizes the inputs accept, in px. */
const MIN_SIZE = 4
const MAX_SIZE = 72

interface SizeInputProps {
  /** The override, or undefined when the element prints at its template size. */
  value: number | undefined
  /** The size it prints at without one — shown as the placeholder. */
  fallback: number
  onChange: (next: number | undefined) => void
  title?: string
}

/**
 * A type size in px. Blank means "the template's size", which is shown greyed.
 *
 * Takes any positive number while it is being typed and clamps when the field is left.
 * Clamping on every keystroke would refuse the "1" of "16" — below the minimum — and a
 * controlled input that refuses a keystroke snaps back, so "16" could never be typed.
 */
export function SizeInput({ value, fallback, onChange, title }: SizeInputProps) {
  return (
    <input
      type='number'
      inputMode='decimal'
      min={MIN_SIZE}
      max={MAX_SIZE}
      step={0.5}
      value={value ?? ""}
      placeholder={String(fallback)}
      title={title}
      className='h-7 w-14 rounded-md border border-slate-200 bg-white px-1.5 text-xs tabular-nums placeholder:text-slate-400'
      onChange={(e) => {
        if (e.target.value === "") return onChange(undefined)
        const next = Number(e.target.value)
        if (Number.isFinite(next) && next > 0) onChange(next)
      }}
      onBlur={() => {
        if (value === undefined) return
        const clamped = Math.min(MAX_SIZE, Math.max(MIN_SIZE, value))
        if (clamped !== value) onChange(clamped)
      }}
    />
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  /** How the value reads beside the slider — "125%", "-12px". */
  format: (value: number) => string
  onChange: (next: number) => void
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  return (
    <div className='space-y-1'>
      <div className='flex items-baseline justify-between text-xs'>
        <span className='text-slate-600'>{label}</span>
        <span className='tabular-nums text-slate-500'>{format(value)}</span>
      </div>
      <input
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className='w-full accent-blue-600'
      />
    </div>
  )
}

const percent = (v: number) => `${Math.round(v * 100)}%`
const pixels = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}px`

interface LayoutPanelProps {
  layout: CustomLayout
  /** The card's text elements, with the size each prints at on the template. */
  fontFields: readonly FontField[]
  onChange: (patch: Partial<CustomLayout>) => void
}

/**
 * The geometry a custom report can depart from its template by: the signature's size
 * and position, the gem image's frame and zoom, and the type size of each text element.
 *
 * Everything here starts at the value that leaves the template exactly as it is, and
 * each group has its own reset back to it. Moving or growing anything can push the page
 * past its margins; the editor's overflow warning reports that as it happens.
 */
export function LayoutPanel({ layout, fontFields, onChange }: LayoutPanelProps) {
  const initial = defaultLayout()

  const setFontSize = (key: string, next: number | undefined) => {
    const fontSizes = { ...layout.fontSizes }
    const template = fontFields.find((f) => f.key === key)?.size
    // A size equal to the template's is no override at all.
    if (next === undefined || next === template) delete fontSizes[key]
    else fontSizes[key] = next
    onChange({ fontSizes })
  }

  const signatureMoved =
    layout.signatureScale !== initial.signatureScale ||
    layout.signatureX !== initial.signatureX ||
    layout.signatureY !== initial.signatureY
  const imageChanged =
    layout.imageBoxScale !== initial.imageBoxScale || layout.imageScale !== initial.imageScale

  return (
    <div className='space-y-6'>
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label>Signature</Label>
          {signatureMoved && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
              onClick={() =>
                onChange({
                  signatureScale: initial.signatureScale,
                  signatureX: initial.signatureX,
                  signatureY: initial.signatureY,
                })
              }
            >
              <RotateCcw className='mr-1 h-3 w-3' />
              Reset
            </Button>
          )}
        </div>
        <SliderRow
          label='Size'
          value={layout.signatureScale}
          min={0.5}
          max={2}
          step={0.05}
          format={percent}
          onChange={(signatureScale) => onChange({ signatureScale })}
        />
        <SliderRow
          label='Left / right'
          value={layout.signatureX}
          min={-150}
          max={150}
          step={1}
          format={pixels}
          onChange={(signatureX) => onChange({ signatureX })}
        />
        <SliderRow
          label='Up / down'
          value={layout.signatureY}
          min={-150}
          max={150}
          step={1}
          format={pixels}
          onChange={(signatureY) => onChange({ signatureY })}
        />
      </div>

      <div className='space-y-3 border-t pt-5'>
        <div className='flex items-center justify-between'>
          <Label>Gem image</Label>
          {imageChanged && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
              onClick={() =>
                onChange({ imageBoxScale: initial.imageBoxScale, imageScale: initial.imageScale })
              }
            >
              <RotateCcw className='mr-1 h-3 w-3' />
              Reset
            </Button>
          )}
        </div>
        <SliderRow
          label='Frame size'
          value={layout.imageBoxScale}
          min={0.5}
          max={2}
          step={0.05}
          format={percent}
          onChange={(imageBoxScale) => onChange({ imageBoxScale })}
        />
        <SliderRow
          label='Image zoom'
          value={layout.imageScale}
          min={0.5}
          max={5}
          step={0.05}
          format={percent}
          onChange={(imageScale) => onChange({ imageScale })}
        />
        {layout.imageScale !== 1 && (
          <p className='text-[11px] leading-snug text-amber-700'>
            Zoomed, the stone no longer prints at its measured size.
          </p>
        )}
      </div>

      <div className='space-y-2 border-t pt-5'>
        <div className='flex items-center justify-between'>
          <Label>Text sizes (px)</Label>
          {Object.keys(layout.fontSizes).length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
              onClick={() => onChange({ fontSizes: {} })}
            >
              <RotateCcw className='mr-1 h-3 w-3' />
              Reset
            </Button>
          )}
        </div>
        {fontFields.map((field) => (
          <div key={field.key} className='flex items-center justify-between gap-2'>
            <span className='text-xs text-slate-600'>{field.label}</span>
            <SizeInput
              value={layout.fontSizes[field.key]}
              fallback={field.size}
              onChange={(next) => setFontSize(field.key, next)}
              title={`${field.label} — blank prints at ${field.size}px`}
            />
          </div>
        ))}
        <p className='text-[11px] leading-snug text-slate-500'>
          Blank keeps the template's size. A single row can also be sized on its own in the
          field list above.
        </p>
      </div>
    </div>
  )
}
