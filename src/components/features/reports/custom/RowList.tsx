import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import type { CustomReportRow } from "@/lib/custom-report"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface RowListProps {
  heading: string
  rows: CustomReportRow[]
  /** True once this block, or the sheet it shares a column with, is at its limit. */
  full: boolean
  onMove: (index: number, delta: number) => void
  onRemove: (rowId: string) => void
  onAdd: () => void
}

/**
 * One block's row list in a builder's side panel: rename on the sheet, reorder and
 * remove here. Shared by the A5 and A4 builders, which both carry several blocks.
 *
 * At module scope on purpose. Declared inside a builder it would be a fresh component
 * type on every render, and React would tear the list down and rebuild it on each
 * keystroke typed into the sheet beside it — the same fault that cost the sheet's own
 * rows their focus after a single character.
 */
export function RowList({ heading, rows, full, onMove, onRemove, onAdd }: RowListProps) {
  return (
    <div className='space-y-3'>
      <div className='flex items-baseline justify-between'>
        <Label>{heading}</Label>
        <span className='text-xs text-slate-400'>
          {rows.length} {rows.length === 1 ? "field" : "fields"}
        </span>
      </div>

      <div className='space-y-1'>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className='flex items-center gap-1 rounded-md border px-2 py-1.5 text-sm'
          >
            <span className='flex-1 truncate text-slate-700'>{row.label || "Untitled"}</span>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
              title='Move up'
            >
              <ArrowUp className='h-3 w-3' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6'
              disabled={index === rows.length - 1}
              onClick={() => onMove(index, 1)}
              title='Move down'
            >
              <ArrowDown className='h-3 w-3' />
            </Button>
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-red-600 hover:text-red-700'
              onClick={() => onRemove(row.id)}
              title='Remove'
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className='rounded-md border border-dashed px-2 py-3 text-center text-xs text-slate-400'>
            No fields. Add one below.
          </p>
        )}
      </div>

      <Button variant='outline' size='sm' className='h-9 w-full' disabled={full} onClick={onAdd}>
        <Plus className='mr-1 h-3 w-3' />
        Add to {heading.toLowerCase()}
      </Button>
    </div>
  )
}
