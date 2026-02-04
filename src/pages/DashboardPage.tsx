import { useMemo } from "react"
import { MainLayout } from "@/components/layout/MainLayout"
import { StatCard } from "@/components/features/dashboard/StatCard"
import { SpeciesDistributionWidget } from "@/components/features/dashboard/SpeciesDistributionWidget"
import { FileText, Activity, CheckCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useGem } from "@/hooks/useGemStore"
import { BASE_URL } from "@/lib/api/config"
import { GemTimeline } from "@/components/features/gems/GemTimeline"
import { GEM_STATUSES } from "@/lib/types"

export function DashboardPage() {
  const { user, gems } = useGem()

  const stats = useMemo(() => {
    return {
      total: gems.length,
      pending: gems.filter((g) => g.status !== GEM_STATUSES.DONE).length,
      completed: gems.filter((g) => g.status === GEM_STATUSES.DONE).length,
      myPending: gems.filter((g) => {
        if (user?.role === "HELPER") return g.status === GEM_STATUSES.TOOK_IN
        if (user?.role === "TESTER")
          return g.status === GEM_STATUSES.READY_FOR_T1 || g.status === GEM_STATUSES.READY_FOR_T2
        if (user?.role === "ADMIN") return g.status === GEM_STATUSES.READY_FOR_APPROVAL
        return false
      }).length,
    }
  }, [gems, user])

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex justify-between items-center'>
          <h2 className='text-2xl font-bold text-slate-800'>
            Welcome back, {user?.name.split(" ")[0]}
          </h2>
          <span className='text-sm text-slate-500'>{new Date().toLocaleDateString()}</span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard title='Total Gems' value={stats.total} icon={FileText} color='blue' />
          <StatCard title='Pending Workflow' value={stats.pending} icon={Activity} color='amber' />
          <StatCard title='Completed' value={stats.completed} icon={CheckCircle} color='emerald' />
          <StatCard
            title='My Action Items'
            value={stats.myPending}
            icon={AlertCircle}
            color='purple'
          />
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='space-y-6 lg:col-span-2'>
            <Card className='p-6 h-full flex flex-col'>
              <h3 className='font-semibold text-lg mb-4 flex items-center gap-2'>
                <Activity size={20} className='text-blue-500' />
                Recent Gems
              </h3>
              <div className='overflow-y-auto pr-2 -mr-2 flex-1 space-y-5'>
                {gems.slice(0, 5).map((gem) => {
                  return (
                    <Card key={gem._id} className='group p-4 pb-10'>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='h-10 w-10 shrink-0 rounded bg-slate-100 overflow-hidden border border-slate-200'>
                          {gem.imageUrl ? (
                            <img
                              src={`${BASE_URL}${gem.imageUrl}`}
                              alt={gem.gemId}
                              className='h-full w-full object-cover'
                            />
                          ) : (
                            <div className='h-full w-full flex items-center justify-center text-slate-300'>
                              <FileText size={16} />
                            </div>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex justify-between items-center'>
                            <p className='font-bold text-slate-800 truncate text-sm'>{gem.gemId}</p>
                          </div>
                        </div>
                      </div>

                      {/* Visual Timeline */}
                      <GemTimeline gem={gem} />
                    </Card>
                  )
                })}
              </div>
            </Card>
          </div>

          <div className='lg:col-span-1'>
            <SpeciesDistributionWidget gems={gems} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
