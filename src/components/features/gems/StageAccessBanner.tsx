import { Lock } from "lucide-react"

interface StageAccessBannerProps {
  /** True when the gem is at a testing stage but assigned to a different tester. */
  assignedElsewhere: boolean
}

/**
 * Shown above a read-only analysis form. The form itself stays visible and filled in —
 * a tester can still read what the lab recorded — but nothing on it can be changed, and
 * saying so up front is clearer than leaving them to discover it at a disabled button.
 */
export function StageAccessBanner({ assignedElsewhere }: StageAccessBannerProps) {
  return (
    <div className='mb-4 flex items-start gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4'>
      <Lock size={16} className='mt-0.5 shrink-0 text-slate-500' />
      <div>
        <p className='text-sm font-bold text-slate-800'>Not assigned to you</p>
        <p className='mt-1 text-sm text-slate-600'>
          {assignedElsewhere
            ? "This gem is assigned to another tester at its current stage. You can read the analysis below, but it is locked for editing."
            : "This gem is not at a stage you are assigned to. You can read the analysis below, but it is locked for editing."}
        </p>
      </div>
    </div>
  )
}
