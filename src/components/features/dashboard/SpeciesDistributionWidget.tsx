import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import type { DashboardStats } from "@/lib/types"
import { OTHER_COLOR, SERIES_COLORS } from "./chartColors"

interface SpeciesDistributionWidgetProps {
  species: DashboardStats["species"]
}

export function SpeciesDistributionWidget({ species }: SpeciesDistributionWidgetProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const { slices, total } = useMemo(() => {
    const total = species.reduce((sum, s) => sum + s.count, 0)
    let start = 0
    let colorIndex = 0
    const slices = species.map((s) => {
      const percentage = total ? (s.count / total) * 100 : 0
      const slice = {
        ...s,
        percentage,
        startPercentage: start,
        color: s.name === "Other" ? OTHER_COLOR : SERIES_COLORS[colorIndex++],
      }
      start += percentage
      return slice
    })
    return { slices, total }
  }, [species])

  // SVG Calculation constants
  const size = 200
  const center = size / 2
  const radius = 70
  const strokeWidth = 30
  const circumference = 2 * Math.PI * radius
  // A surface-coloured gap between neighbouring slices, left off when there is only one.
  const gap = slices.length > 1 ? 2 : 0

  const focus = slices.find((s) => s.name === hovered)

  return (
    <Card className='p-6 gap-4 h-full'>
      <div>
        <h3 className='font-semibold text-lg text-slate-900'>Species Distribution</h3>
        <p className='text-sm text-slate-500'>Identified species across completed gems</p>
      </div>

      {total === 0 ? (
        <p className='text-sm text-slate-500 py-10 text-center'>No completed gems yet.</p>
      ) : (
        <>
          <div className='relative flex justify-center'>
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className='transform -rotate-90'
              role='img'
              aria-label={`Species distribution across ${total} completed gems`}
            >
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill='transparent'
                stroke='#f1f5f9'
                strokeWidth={strokeWidth}
              />
              {slices.map((item) => {
                const dashLength = Math.max((item.percentage / 100) * circumference - gap, 0)
                return (
                  <circle
                    key={item.name}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill='transparent'
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={-((item.startPercentage / 100) * circumference)}
                    opacity={hovered && hovered !== item.name ? 0.35 : 1}
                    className='cursor-pointer transition-opacity'
                    onMouseEnter={() => setHovered(item.name)}
                    onMouseLeave={() => setHovered(null)}
                  />
                )
              })}
            </svg>

            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-12 text-center'>
              <span className='text-2xl font-black text-slate-900 leading-none tabular-nums'>
                {focus ? focus.count : total}
              </span>
              <span className='text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1 truncate max-w-full'>
                {focus ? focus.name : "Completed"}
              </span>
            </div>
          </div>

          <div className='space-y-1'>
            {slices.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-default transition-colors ${hovered === item.name ? "bg-slate-50" : ""}`}
                onMouseEnter={() => setHovered(item.name)}
                onMouseLeave={() => setHovered(null)}
              >
                <span
                  className='w-3 h-3 shrink-0 rounded-sm'
                  style={{ backgroundColor: item.color }}
                />
                <span className='flex-1 text-sm font-medium text-slate-700 truncate'>
                  {item.name}
                </span>
                <span className='text-xs text-slate-500 tabular-nums'>{item.count}</span>
                <span className='text-sm font-semibold text-slate-900 w-10 text-right tabular-nums'>
                  {item.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
