import { useMemo } from "react"
import { Card } from "@/components/ui/card"
import type { Gem } from "@/lib/types"

interface SpeciesDistributionWidgetProps {
  gems: Gem[]
}

const COLORS = [
  "#2563eb", // Blue 600
  "#6366f1", // Indigo 500
  "#ec4899", // Pink 500
  "#f59e0b", // Amber 500
  "#10b981", // Emerald 500
  "#8b5cf6", // Purple 500
  "#f43f5e", // Rose 500
  "#06b6d4", // Cyan 500
  "#f97316", // Orange 500
  "#64748b", // Slate 500
]

export function SpeciesDistributionWidget({ gems }: SpeciesDistributionWidgetProps) {
  const stats = useMemo(() => {
    const completedGems = gems.filter((g) => g.status === "COMPLETED")
    const totalCompleted = completedGems.length

    if (totalCompleted === 0) return []

    const counts: Record<string, number> = {}
    completedGems.forEach((gem) => {
      const species = gem.finalApproval?.finalObservations?.species || "Unknown"
      counts[species] = (counts[species] || 0) + 1
    })

    let accumulatedPercentage = 0

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalCompleted) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item, index) => {
        const startPercentage = accumulatedPercentage
        accumulatedPercentage += item.percentage
        return {
          ...item,
          color: COLORS[index % COLORS.length],
          startPercentage,
        }
      })
  }, [gems])

  if (stats.length === 0) return null

  // SVG Calculation constants
  const size = 200
  const center = size / 2
  const radius = 70
  const strokeWidth = 30
  const circumference = 2 * Math.PI * radius

  return (
    <Card className='p-6 overflow-hidden'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h3 className='font-bold text-lg text-slate-900'>Species Identification Distribution</h3>
        </div>
        <div className='flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100'>
          <div className='w-2 h-2 bg-emerald-600 rounded-full'></div>
          <span className='text-[10px] font-black text-emerald-700 uppercase'>Data Verified</span>
        </div>
      </div>

      <div className='grid grid-cols-1  gap-10 items-center'>
        {/* Pie/Donut Chart */}
        <div className='relative flex justify-center'>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className='transform -rotate-90'
          >
            {/* Background circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill='transparent'
              stroke='#f1f5f9'
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {stats.map((item, index) => {
              const dashLength = (item.percentage / 100) * circumference

              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill='transparent'
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference}`}
                  strokeDashoffset={-((item.startPercentage / 100) * circumference)}
                  className='transition-all duration-1000 ease-in-out hover:opacity-80 cursor-pointer'
                  style={{
                    transitionProperty: "stroke-dasharray, stroke-dashoffset",
                    transformOrigin: "center",
                  }}
                />
              )
            })}
          </svg>

          {/* Center Info */}
          <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
            <span className='text-2xl font-black text-slate-900 leading-none'>
              {gems.filter((g) => g.status === "COMPLETED").length}
            </span>
            <span className='text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1'>
              Total Samples
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className='space-y-3'>
          {stats.map((item) => (
            <div key={item.name} className='flex items-center group cursor-default'>
              <div
                className='w-3 h-3 rounded-sm mr-3 transition-transform group-hover:scale-125'
                style={{ backgroundColor: item.color }}
              ></div>
              <div className='flex-1 flex justify-between items-center px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors'>
                <span className='text-sm font-bold text-slate-700 truncate mr-2'>{item.name}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-[10px] font-black text-slate-400'>{item.count} qty</span>
                  <span className='text-sm font-black text-slate-900 min-w-[45px] text-right'>
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='mt-8 pt-4 border-t border-slate-50'>
        <div className='flex justify-between items-center opacity-40'>
          <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>
            Scientific Distribution Model 1.0
          </p>
          <div className='flex gap-2'>
            <div className='w-1 h-1 bg-slate-400 rounded-full'></div>
            <div className='w-1 h-1 bg-slate-400 rounded-full'></div>
            <div className='w-1 h-1 bg-slate-400 rounded-full'></div>
          </div>
        </div>
      </div>
    </Card>
  )
}
