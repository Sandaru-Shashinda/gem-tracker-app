import { PRIMARY_BAR_COLOR } from "./chartColors"

interface HorizontalBarListProps {
  rows: { label: string; value: number }[]
  /** Shown instead of the bars when every row is zero or there are none. */
  emptyText: string
}

/** One series of labelled bars, each carrying its own value — no legend needed. */
export function HorizontalBarList({ rows, emptyText }: HorizontalBarListProps) {
  const max = Math.max(...rows.map((r) => r.value), 0)

  if (max === 0) {
    return <p className='text-sm text-slate-500 py-6 text-center'>{emptyText}</p>
  }

  return (
    <ul className='space-y-3'>
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${row.value}`}>
          <div className='flex justify-between gap-3 text-sm mb-1'>
            <span className='text-slate-700 truncate'>{row.label}</span>
            <span className='font-semibold text-slate-900 tabular-nums'>{row.value}</span>
          </div>
          <div className='h-2 w-full rounded-full bg-slate-100'>
            {row.value > 0 && (
              <div
                className='h-2 rounded-full'
                style={{
                  width: `${Math.max((row.value / max) * 100, 2)}%`,
                  backgroundColor: PRIMARY_BAR_COLOR,
                }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
