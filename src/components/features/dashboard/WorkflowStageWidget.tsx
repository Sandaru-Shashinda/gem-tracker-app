import { Card } from "@/components/ui/card"
import { GEM_STATUSES, type DashboardStats, type GemStatus } from "@/lib/types"
import { HorizontalBarList } from "./HorizontalBarList"

interface WorkflowStageWidgetProps {
  statusCounts: DashboardStats["statusCounts"]
}

// A stage's draft and ready states are the same stone waiting in the same place, so
// they count together. Done is left out: it would dwarf the bars that need attention.
const STAGES: { label: string; statuses: GemStatus[] }[] = [
  { label: "Intake", statuses: [GEM_STATUSES.DRAFT_INTAKE, GEM_STATUSES.TOOK_IN] },
  { label: "Test 1", statuses: [GEM_STATUSES.DRAFT_TEST_1, GEM_STATUSES.READY_FOR_T1] },
  { label: "Test 2", statuses: [GEM_STATUSES.DRAFT_TEST_2, GEM_STATUSES.READY_FOR_T2] },
  {
    label: "Final approval",
    statuses: [GEM_STATUSES.READY_FOR_APPROVAL, GEM_STATUSES.DRAFT_APPROVAL],
  },
  { label: "Changes requested", statuses: [GEM_STATUSES.REQUEST_CHANGES] },
  { label: "Report", statuses: [GEM_STATUSES.SUBMITTED_FOR_REPORT] },
]

export function WorkflowStageWidget({ statusCounts }: WorkflowStageWidgetProps) {
  const rows = STAGES.map((stage) => ({
    label: stage.label,
    value: stage.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0),
  }))
  const inProgress = rows.reduce((sum, r) => sum + r.value, 0)

  return (
    <Card className='p-6 gap-4 h-full'>
      <div>
        <h3 className='font-semibold text-lg text-slate-900'>Workflow Pipeline</h3>
        <p className='text-sm text-slate-500'>
          Where the {inProgress} in-progress {inProgress === 1 ? "gem sits" : "gems sit"}
        </p>
      </div>
      <HorizontalBarList rows={rows} emptyText='Nothing in progress.' />
    </Card>
  )
}
