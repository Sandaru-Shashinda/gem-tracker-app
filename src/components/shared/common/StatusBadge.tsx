import { Badge } from "@/components/ui/badge"
import { type GemStatus } from "@/lib/types"

// Nice human-readable labels
const statusLabels: Record<GemStatus, string> = {
  DRAFT_INTAKE: "Draft Intake",
  TOOK_IN: "Took In",
  DRAFT_TEST_1: "Draft Test 1",
  READY_FOR_T1: "Ready for T1",
  DRAFT_TEST_2: "Draft Test 2",
  READY_FOR_T2: "Ready for T2",
  READY_FOR_APPROVAL: "Ready for Approval",
  DRAFT_APPROVAL: "Draft Approval",
  SUBMITTED_FOR_REPORT: "Submitted for Report",
  REQUEST_CHANGES: "Changes Requested",
  DONE: "Done",
}

// Color mapping – pure Tailwind classes (light/dark mode friendly)
const statusColors: Record<GemStatus, string> = {
  // Draft / early stages → muted gray
  DRAFT_INTAKE: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  TOOK_IN: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  DRAFT_TEST_1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  DRAFT_TEST_2: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  DRAFT_APPROVAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",

  // Ready for something → subtle blue/primary tones
  READY_FOR_T1: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  READY_FOR_T2: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  READY_FOR_APPROVAL: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",

  // Submitted / in review → info blue
  SUBMITTED_FOR_REPORT: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",

  // Needs attention → red/orange warning
  REQUEST_CHANGES: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",

  // Completed → success green
  DONE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
}

export function StatusBadge({ status }: { status: GemStatus | string }) {
  // Fallback for unknown / invalid status
  const safeStatus = status in statusColors ? (status as GemStatus) : null

  const label = safeStatus ? statusLabels[safeStatus] : status || "Unknown"

  const colorClass = safeStatus
    ? statusColors[safeStatus]
    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"

  // Optional: add subtle hover effect + rounded style consistent with shadcn
  return (
    <Badge
      className={`
        border-transparent px-2.5 py-0.5 text-xs font-medium
        transition-colors hover:opacity-90
        ${colorClass}
      `}
    >
      {label}
    </Badge>
  )
}
