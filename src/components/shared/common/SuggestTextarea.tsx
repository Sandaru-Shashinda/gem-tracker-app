import { useState, type ComponentProps } from "react"
import { Textarea } from "@/components/ui/textarea"

interface SuggestTextareaProps extends Omit<ComponentProps<"textarea">, "value" | "onChange"> {
  value: string
  onChange: (value: string) => void
  /** Earlier entries for this field. Picking one replaces what is in the box. */
  suggestions: string[]
}

/**
 * A textarea that offers what was written in it before. The list narrows as you type and
 * disappears once nothing matches, so it never gets in the way of writing something new.
 */
export function SuggestTextarea({
  value,
  onChange,
  suggestions,
  onBlur,
  onFocus,
  ...props
}: SuggestTextareaProps) {
  const [open, setOpen] = useState(false)

  const typed = (value || "").trim().toLowerCase()
  const matches = suggestions.filter((s) => {
    const lower = s.toLowerCase()
    return lower !== typed && lower.includes(typed)
  })

  return (
    <div className='relative'>
      <Textarea
        {...props}
        value={value || ""}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={(e) => {
          setOpen(true)
          onFocus?.(e)
        }}
        onBlur={(e) => {
          setOpen(false)
          onBlur?.(e)
        }}
      />
      {open && matches.length > 0 && (
        <div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden'>
          {matches.map((s) => (
            <button
              key={s}
              type='button'
              className='w-full text-left px-3 py-2 text-sm whitespace-pre-wrap line-clamp-3 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-0 border-slate-100'
              // mousedown, not click: the textarea must keep focus, or its blur would
              // close the list before the click ever landed.
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(s)
                setOpen(false)
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
