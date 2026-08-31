import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GemFormActionsProps {
  isSubmitting: boolean
  isActionLoading: boolean
  isValid: boolean
  showDraft: boolean
  /** False when this stage of the gem belongs to someone else — see resolveActiveStage. */
  canWrite: boolean
  /** Surfaced from a failed save, or from the form refusing to submit. */
  error?: string | null
  onDraft: () => void
}

export function GemFormActions({
  isSubmitting,
  isActionLoading,
  isValid,
  showDraft,
  canWrite,
  error,
  onDraft,
}: GemFormActionsProps) {
  const busy = isSubmitting || isActionLoading
  return (
    <div className='space-y-3 pt-4 border-t'>
      {error && (
        <p className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700'>
          {error}
        </p>
      )}
      {canWrite && !isValid && !busy && (
        <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700'>
          Fill in R.I. Min, Species and Variety to enable submitting.
        </p>
      )}
      <div className='flex justify-end gap-4'>
        <Button
          type='submit'
          className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
          variant='outline'
          disabled={busy || !isValid || !canWrite}
        >
          {busy ? <Loader2 className='animate-spin h-6 w-6' /> : "Submit Lab Analysis"}
        </Button>
        {showDraft && (
          <Button
            type='button'
            variant='outline'
            className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
            onClick={onDraft}
            disabled={busy || !canWrite}
          >
            {isActionLoading ? <Loader2 className='animate-spin h-5 w-5' /> : "Save Draft"}
          </Button>
        )}
      </div>
    </div>
  )
}
