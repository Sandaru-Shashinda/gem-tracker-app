import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { gemsApi } from "@/lib/api/gems"
import type { ActivityData, ActivityRange } from "@/lib/types"
import { SERIES_COLORS } from "./chartColors"
import { useElementWidth } from "./useElementWidth"

type Granularity = ActivityData["granularity"]
type Bucket = ActivityData["buckets"][number]

const SERIES = [
  { key: "intake", label: "Taken in", color: SERIES_COLORS[0] },
  { key: "completed", label: "Completed", color: SERIES_COLORS[1] },
] as const

const RANGES: { value: ActivityRange; label: string; subtitle: string }[] = [
  { value: "month", label: "This month", subtitle: "Day by day, this month" },
  { value: "6m", label: "Last 6 months", subtitle: "Month by month, last 6 months" },
  { value: "year", label: "Last year", subtitle: "Month by month, last 12 months" },
  { value: "all", label: "All time", subtitle: "Since the first gem was taken in" },
]

const HEIGHT = 260
const MARGIN = { top: 12, right: 8, bottom: 28, left: 32 }
const GRID_LINES = 4
// The narrowest a bucket's axis label can be given before labels start to collide.
const MIN_LABEL_WIDTH: Record<Granularity, number> = { day: 22, month: 46, year: 40 }

/** A round step that splits `max` into about GRID_LINES whole-number bands. */
function niceStep(max: number) {
  const raw = Math.max(max, 1) / GRID_LINES
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalised = raw / magnitude
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude
  return Math.max(1, Math.round(step))
}

/** A bar with its data end rounded and its baseline end square. */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}

function keyDate(key: string) {
  const [year, month = 1, day = 1] = key.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function axisLabel(key: string, granularity: Granularity, index: number) {
  const date = keyDate(key)
  if (granularity === "day") return format(date, "d")
  if (granularity === "year") return key
  return format(date, index === 0 || date.getMonth() === 0 ? "MMM yy" : "MMM")
}

function fullLabel(key: string, granularity: Granularity) {
  const date = keyDate(key)
  if (granularity === "day") return format(date, "EEE, d MMM yyyy")
  if (granularity === "year") return key
  return format(date, "MMMM yyyy")
}

/** The bucket today falls in, so the chart can mark it and not average over the future. */
function currentKey(granularity: Granularity) {
  const now = new Date()
  if (granularity === "day") return format(now, "yyyy-MM-dd")
  if (granularity === "year") return format(now, "yyyy")
  return format(now, "yyyy-MM")
}

type Result = { range: ActivityRange; data: ActivityData } | { range: ActivityRange; error: true }

export function ActivityChart() {
  const [range, setRange] = useState<ActivityRange>("month")
  const [result, setResult] = useState<Result | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    gemsApi.getActivity(range).then(
      (data) => !cancelled && setResult({ range, data }),
      (err) => {
        console.error("Failed to fetch activity:", err)
        if (!cancelled) setResult({ range, error: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [range, reloadKey])

  // The last chart stays up, dimmed, while the next range loads.
  const loading = result?.range !== range
  const data = result && "data" in result ? result.data : null
  const failed = !loading && result && "error" in result
  const subtitle = RANGES.find((r) => r.value === range)?.subtitle

  return (
    <Card className='p-6 gap-4 h-full'>
      <div>
        <h3 className='font-semibold text-lg text-slate-900'>Activity</h3>
        <p className='text-sm text-slate-500'>Gems taken in and completed · {subtitle}</p>
      </div>

      {failed ? (
        <div className='flex flex-col items-center justify-center gap-3 py-16'>
          <p className='text-sm text-slate-500'>Couldn't load activity.</p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => {
              setResult(null)
              setReloadKey((k) => k + 1)
            }}
          >
            Retry
          </Button>
        </div>
      ) : !data ? (
        <div className='space-y-4'>
          <Skeleton className='h-14 w-full' />
          <Skeleton className='w-full' style={{ height: HEIGHT }} />
        </div>
      ) : (
        <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
          <ActivitySummary data={data} />
          <ActivityBars data={data} />
        </div>
      )}

      <div
        role='group'
        aria-label='Time range'
        className='flex flex-wrap justify-center gap-1 rounded-lg bg-slate-100 p-1 self-center'
      >
        {RANGES.map((r) => (
          <button
            key={r.value}
            type='button'
            aria-pressed={range === r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              range === r.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

function ActivitySummary({ data }: { data: ActivityData }) {
  const { buckets, granularity } = data
  const unit = granularity === "day" ? "day" : granularity === "month" ? "month" : "year"
  const intake = buckets.reduce((sum, b) => sum + b.intake, 0)
  const completed = buckets.reduce((sum, b) => sum + b.completed, 0)

  // Average over the buckets that have happened, so the rest of this month doesn't
  // drag the figure down.
  const nowKey = currentKey(granularity)
  const elapsed = Math.max(buckets.filter((b) => b.key <= nowKey).length, 1)
  const busiest = buckets.reduce<Bucket | null>(
    (best, b) => (b.intake > (best?.intake ?? 0) ? b : best),
    null,
  )

  const items = [
    { label: "Taken in", value: intake, color: SERIES[0].color },
    { label: "Completed", value: completed, color: SERIES[1].color },
    { label: `Avg. taken in / ${unit}`, value: (intake / elapsed).toFixed(1) },
    {
      label: `Busiest ${unit}`,
      value: busiest ? fullLabel(busiest.key, granularity) : "—",
      hint: busiest ? `${busiest.intake} taken in` : undefined,
    },
  ]

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
      {items.map((item) => (
        <div key={item.label} className='rounded-lg border border-slate-100 px-3 py-2 min-w-0'>
          <div className='flex items-center gap-1.5'>
            {"color" in item && item.color && (
              <span className='w-2.5 h-2.5 rounded-sm' style={{ backgroundColor: item.color }} />
            )}
            <p className='text-xs text-slate-500 truncate'>{item.label}</p>
          </div>
          <p className='text-lg font-bold text-slate-900 tabular-nums truncate'>{item.value}</p>
          {"hint" in item && item.hint && (
            <p className='text-xs text-slate-500 truncate'>{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}

function ActivityBars({ data }: { data: ActivityData }) {
  const { buckets, granularity } = data
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<number | null>(null)

  const plotW = Math.max(width - MARGIN.left - MARGIN.right, 0)
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
  const maxValue = Math.max(...buckets.flatMap((b) => [b.intake, b.completed]), 0)
  const step = niceStep(maxValue)
  const yMax = Math.max(step * Math.ceil(maxValue / step), step)
  const y = (v: number) => MARGIN.top + plotH - (v / yMax) * plotH
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step)

  const band = buckets.length ? plotW / buckets.length : 0
  const barW = Math.max(Math.min(16, (band * 0.75) / 2 - 1), 2)
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_WIDTH[granularity] / Math.max(band, 1)))
  const nowKey = currentKey(granularity)

  const hoveredBucket = hovered === null ? null : buckets[hovered]
  const tooltipLeft =
    hovered === null
      ? 0
      : Math.min(Math.max(MARGIN.left + band * (hovered + 0.5), 80), Math.max(width - 80, 80))

  return (
    <div>
      <div className='flex items-center gap-4 text-xs mb-2'>
        {SERIES.map((s) => (
          <div key={s.key} className='flex items-center gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-sm' style={{ backgroundColor: s.color }} />
            <span className='text-slate-600'>{s.label}</span>
          </div>
        ))}
      </div>

      <div ref={containerRef} className='relative w-full' style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role='img'
            aria-label={`Gems taken in and completed per ${granularity}`}
            onMouseLeave={() => setHovered(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "#cbd5e1" : "#f1f5f9"}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(t)}
                  textAnchor='end'
                  dominantBaseline='middle'
                  className='fill-slate-400 text-[11px] tabular-nums'
                >
                  {t}
                </text>
              </g>
            ))}

            {buckets.map((b, i) => {
              const cx = MARGIN.left + band * (i + 0.5)
              const isNow = b.key === nowKey
              return (
                <g key={b.key}>
                  {hovered === i && (
                    <rect
                      x={cx - band / 2}
                      y={MARGIN.top}
                      width={band}
                      height={plotH}
                      className='fill-slate-100'
                    />
                  )}
                  {SERIES.map((s, si) => {
                    const value = b[s.key]
                    if (value === 0) return null
                    const x = si === 0 ? cx - barW - 1 : cx + 1
                    return (
                      <path
                        key={s.key}
                        d={barPath(x, y(value), barW, y(0) - y(value))}
                        fill={s.color}
                      />
                    )
                  })}
                  {(i % labelEvery === 0 || isNow) && (
                    <text
                      x={cx}
                      y={HEIGHT - 8}
                      textAnchor='middle'
                      className={`text-[11px] ${isNow ? "fill-slate-900 font-bold" : "fill-slate-500"}`}
                    >
                      {axisLabel(b.key, granularity, i)}
                    </text>
                  )}
                  <rect
                    x={cx - band / 2}
                    y={MARGIN.top}
                    width={band}
                    height={plotH}
                    fill='transparent'
                    onMouseEnter={() => setHovered(i)}
                  />
                </g>
              )
            })}
          </svg>
        )}

        {hoveredBucket && (
          <div
            className='pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md whitespace-nowrap'
            style={{ left: tooltipLeft }}
          >
            <p className='font-semibold text-slate-900 mb-1'>
              {fullLabel(hoveredBucket.key, granularity)}
            </p>
            {SERIES.map((s) => (
              <div key={s.key} className='flex items-center gap-2'>
                <span className='w-2.5 h-2.5 rounded-sm' style={{ backgroundColor: s.color }} />
                <span className='text-slate-600'>{s.label}</span>
                <span className='ml-auto pl-3 font-semibold text-slate-900 tabular-nums'>
                  {hoveredBucket[s.key]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
