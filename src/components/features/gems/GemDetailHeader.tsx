import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/common/StatusBadge"
import { GEM_STATUSES, type Gem } from "@/lib/types"

interface GemDetailHeaderProps {
  gem: Gem
}

export function GemDetailHeader({ gem }: GemDetailHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className='flex items-center gap-4'>
      <Button variant='outline' size='icon' onClick={() => navigate(-1)}>
        <ArrowLeft className='h-4 w-4' />
      </Button>
      <div>
        <h2 className='text-2xl font-bold text-slate-800'>Processing: {gem.gemId}</h2>
        <p className='text-sm text-slate-500'>
          Updated: {new Date(gem.updatedAt).toLocaleString()}
        </p>
      </div>
      <StatusBadge status={gem.status} />

      {gem.status === GEM_STATUSES.DONE && (
        <Button
          variant='default'
          className='bg-emerald-600 hover:bg-emerald-700'
          onClick={() => navigate(`/reports/${gem._id}`)}
        >
          View Report Certificate
        </Button>
      )}
    </div>
  )
}
