import { useState } from "react"
import { ArrowLeft, Pencil, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/common/StatusBadge"
import { type Gem, UserRole } from "@/lib/types"
import { useGem } from "@/hooks/useGemStore"
import { DeleteGemDialog } from "./DeleteGemDialog"

interface GemDetailHeaderProps {
  gem: Gem
}

export function GemDetailHeader({ gem }: GemDetailHeaderProps) {
  const navigate = useNavigate()
  const { user, refreshGems } = useGem()
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Same split as the API: intake is written by helpers and admins, deleting is admin only.
  const canEditIntake = user?.role === UserRole.ADMIN || user?.role === UserRole.HELPER
  const canDelete = user?.role === UserRole.ADMIN

  return (
    <div className='flex flex-wrap items-center gap-4'>
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

      {(canEditIntake || canDelete) && (
        <div className='ml-auto flex items-center gap-2'>
          {canEditIntake && (
            <Button variant='outline' onClick={() => navigate(`/intake/${gem._id}`)}>
              <Pencil className='h-4 w-4 mr-2' />
              Edit Intake
            </Button>
          )}
          {canDelete && (
            <Button
              variant='outline'
              onClick={() => setConfirmDelete(true)}
              className='text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Delete
            </Button>
          )}
        </div>
      )}

      <DeleteGemDialog
        gem={confirmDelete ? gem : null}
        onOpenChange={setConfirmDelete}
        onDeleted={() => {
          refreshGems()
          navigate("/queue", { replace: true })
        }}
      />
    </div>
  )
}
