import { useCallback, useEffect, useState } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { StatCard } from "@/components/features/dashboard/StatCard"
import { SpeciesDistributionWidget } from "@/components/features/dashboard/SpeciesDistributionWidget"
import { ActivityChart } from "@/components/features/dashboard/ActivityChart"
import { WorkflowStageWidget } from "@/components/features/dashboard/WorkflowStageWidget"
import { TopCustomersWidget } from "@/components/features/dashboard/TopCustomersWidget"
import { ReportModeWidget } from "@/components/features/dashboard/ReportModeWidget"
import { MultiStatCard } from "@/components/features/dashboard/MultiStatCard"
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Timer,
  FileCheck,
  CalendarCheck,
  Sparkles,
  Gem as GemIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useGem } from "@/hooks/useGemStore"
import { gemsApi } from "@/lib/api/gems"
import type { DashboardStats } from "@/lib/types"

export function DashboardPage() {
  const { user } = useGem()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(
    () =>
      gemsApi.getDashboardStats().then(setStats, (err) => {
        console.error("Failed to fetch dashboard stats:", err)
        setError("Couldn't load dashboard figures.")
      }),
    [],
  )

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const retry = () => {
    setError(null)
    fetchStats()
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-slate-800'>
            Welcome back, {user?.name.split(" ")[0]}
          </h2>
          <span className='text-sm text-slate-500'>{new Date().toLocaleDateString()}</span>
        </div>

        {error ? (
          <Card className='p-6 flex-row items-center justify-between'>
            <p className='text-sm text-slate-600'>{error}</p>
            <Button variant='outline' size='sm' onClick={retry}>
              Retry
            </Button>
          </Card>
        ) : !stats ? (
          <DashboardSkeleton />
        ) : (
          <DashboardContent stats={stats} />
        )}
      </div>
    </MainLayout>
  )
}

const REPORT_SIZES = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
] as const

const bySize = (counts: DashboardStats["reportTypesDone"]) =>
  REPORT_SIZES.map((s) => ({ label: s.label, value: counts[s.key] ?? 0 }))

function DashboardContent({ stats }: { stats: DashboardStats }) {
  const topSpecies = stats.topSpeciesThisMonth

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard title='Total Gems' value={stats.totalGems} icon={FileText} color='blue' />
        <MultiStatCard
          title='Workflow'
          icon={CheckCircle}
          color='emerald'
          items={[
            { label: "Completed", value: stats.completedGems },
            { label: "Pending", value: stats.pendingWorkflow },
          ]}
        />
        <StatCard
          title='My Action Items'
          value={stats.myActionItems}
          icon={AlertCircle}
          color='purple'
        />
        <StatCard
          title='Avg. Turnaround'
          value={
            stats.averageTurnaroundDays === null
              ? "—"
              : `${stats.averageTurnaroundDays.toFixed(1)} days`
          }
          icon={Timer}
          color='teal'
          hint='Intake to final approval'
        />
        <MultiStatCard
          title='Reports Done'
          icon={FileCheck}
          color='indigo'
          items={bySize(stats.reportTypesDone)}
        />
        <MultiStatCard
          title='Reports Done This Month'
          icon={CalendarCheck}
          color='sky'
          items={bySize(stats.reportTypesDoneThisMonth)}
        />
        <StatCard
          title='Top Species This Month'
          value={topSpecies?.name ?? "—"}
          icon={Sparkles}
          color='amber'
          hint={
            topSpecies
              ? `${topSpecies.count} ${topSpecies.count === 1 ? "gem" : "gems"} identified`
              : "No gems completed yet this month"
          }
        />
        <StatCard
          title='Carats Received'
          value={`${stats.totalCarats.toFixed(2)} ct`}
          icon={GemIcon}
          color='rose'
          hint={`Avg. ${stats.averageCarats.toFixed(2)} ct per gem`}
        />
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <ActivityChart />
        </div>
        <SpeciesDistributionWidget species={stats.species} />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <WorkflowStageWidget statusCounts={stats.statusCounts} />
        <TopCustomersWidget customers={stats.topCustomers} />
        <ReportModeWidget reportModes={stats.reportModes} />
      </div>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className='h-[104px] rounded-xl' />
        ))}
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <Skeleton className='h-[340px] rounded-xl lg:col-span-2' />
        <Skeleton className='h-[340px] rounded-xl' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className='h-[260px] rounded-xl' />
        ))}
      </div>
    </>
  )
}
