import { AlertTriangle } from "lucide-react"

interface OverflowWarningProps {
  /** Pixels past the page's end, from usePageOverflow. Nothing renders at 0. */
  overflow: number
  /** What the sheet is called — "card", "A5", "A4" — as the message names it. */
  page: string
}

/** Says, under a custom report's editor, when its page has grown too long to print whole. */
export function OverflowWarning({ overflow, page }: OverflowWarningProps) {
  if (overflow <= 0) return null
  return (
    <div className='mt-3 flex w-full items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800'>
      <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
      <p>
        <span className='font-semibold'>
          This {page} is {Math.ceil(overflow)}px too long.
        </span>{" "}
        The signatures and footer are pushed into the print margin or off the page. Shorten a
        long value or a block of text, remove a row, or switch an element off in the panel.
      </p>
    </div>
  )
}
