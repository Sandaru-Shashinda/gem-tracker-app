import { Card } from "@/components/ui/card"
import { REPORT_MODES, type DashboardStats } from "@/lib/types"
import { SERIES_COLORS } from "./chartColors"

interface ReportModeWidgetProps {
  reportModes: DashboardStats["reportModes"]
}

const MODES = [
  { mode: REPORT_MODES.DEFAULT, label: "Default report", color: SERIES_COLORS[0] },
  { mode: REPORT_MODES.CUSTOM, label: "Custom report", color: SERIES_COLORS[1] },
]

export function ReportModeWidget({ reportModes }: ReportModeWidgetProps) {
  const rows = MODES.map((m) => ({ ...m, count: reportModes[m.mode] ?? 0 }))
  const total = rows.reduce((sum, r) => sum + r.count, 0)
  const pct = (count: number) => (total ? (count / total) * 100 : 0)

  return (
    <Card className='p-6 gap-4 h-full'>
      <div>
        <h3 className='font-semibold text-lg text-slate-900'>Report Style</h3>
        <p className='text-sm text-slate-500'>What gems were taken in for</p>
      </div>

      {total === 0 ? (
        <p className='text-sm text-slate-500 py-6 text-center'>No gems yet.</p>
      ) : (
        <>
          <div
            className='flex h-3 w-full gap-0.5 overflow-hidden rounded-full'
            role='img'
            aria-label={rows.map((r) => `${r.label}: ${r.count}`).join(", ")}
          >
            {rows
              .filter((r) => r.count > 0)
              .map((r) => (
                <div
                  key={r.mode}
                  title={`${r.label}: ${r.count}`}
                  style={{ width: `${pct(r.count)}%`, backgroundColor: r.color }}
                />
              ))}
          </div>

          <div className='space-y-2'>
            {rows.map((r) => (
              <div key={r.mode} className='flex items-center gap-3 text-sm'>
                <span className='w-3 h-3 shrink-0 rounded-sm' style={{ backgroundColor: r.color }} />
                <span className='flex-1 text-slate-700'>{r.label}</span>
                <span className='text-xs text-slate-500 tabular-nums'>{r.count}</span>
                <span className='w-10 text-right font-semibold text-slate-900 tabular-nums'>
                  {pct(r.count).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
