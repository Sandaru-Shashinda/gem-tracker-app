import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { STAT_ICON_COLORS, type StatIconColor } from "./chartColors"

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: StatIconColor
  /** A short line under the value, e.g. a comparison or a rate. */
  hint?: string
}

export function StatCard({ title, value, icon: Icon, color, hint }: StatCardProps) {
  return (
    <Card className='p-6 flex items-center gap-4'>
      <div
        className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${STAT_ICON_COLORS[color]}`}
      >
        <Icon size={24} />
      </div>
      <div className='min-w-0 max-w-full'>
        <p className='text-sm font-medium text-slate-500'>{title}</p>
        <p className='text-2xl font-bold text-slate-900 tabular-nums truncate'>{value}</p>
        {hint && <p className='text-xs text-slate-500 truncate'>{hint}</p>}
      </div>
    </Card>
  )
}
