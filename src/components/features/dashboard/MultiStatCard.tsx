import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { STAT_ICON_COLORS, type StatIconColor } from "./chartColors"

interface MultiStatCardProps {
  title: string
  icon: LucideIcon
  color: StatIconColor
  items: { label: string; value: number | string }[]
}

/** A StatCard carrying several related values side by side under one title. */
export function MultiStatCard({ title, icon: Icon, color, items }: MultiStatCardProps) {
  return (
    <Card className='p-6 flex items-center gap-4'>
      <div
        className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center ${STAT_ICON_COLORS[color]}`}
      >
        <Icon size={24} />
      </div>
      <div className='w-full min-w-0'>
        <p className='text-sm font-medium text-slate-500 text-center'>{title}</p>
        <div
          className='grid divide-x divide-slate-100 mt-1'
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <div key={item.label} className='text-center px-1'>
              <p className='text-2xl font-bold text-slate-900 tabular-nums'>{item.value}</p>
              <p className='text-xs text-slate-500'>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
