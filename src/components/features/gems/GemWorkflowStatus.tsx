import { Microscope } from "lucide-react"
import { StatusBadge } from "@/components/shared/common/StatusBadge"
import { type Gem, GEM_STATUSES } from "@/lib/types"
import { GemImage } from "./GemImage"

interface GemWorkflowStatusProps {
  gem: Gem
}

export function GemWorkflowStatus({ gem }: GemWorkflowStatusProps) {
  const firstImageId = gem.images && gem.images.length > 0 ? gem.images[0] : null

  return (
    <div className='h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm'>
      <div className='w-48 h-48 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center mb-6 border border-slate-100 shadow-inner'>
        {firstImageId ? (
          <GemImage imageId={firstImageId} className='h-full w-full object-cover' />
        ) : (
          <Microscope className='text-slate-200' size={60} />
        )}
      </div>
      <h3 className='text-xl font-bold text-slate-800 mb-2'>
        {gem.status === GEM_STATUSES.DONE ? "Workflow Finalized" : "Pending Next Stage"}
      </h3>
      <p className='text-slate-500 text-center max-w-sm leading-relaxed'>
        {gem.status === GEM_STATUSES.DONE ? (
          "The scientific analysis is complete. You can view or print the official certificate above."
        ) : (
          <>
            This record is currently in <StatusBadge status={gem.status} />. Please wait for the
            assigned staff to complete their tasks.
          </>
        )}
      </p>
    </div>
  )
}
