import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GemFormActionsProps {
  isSubmitting: boolean
  isActionLoading: boolean
  isValid: boolean
  showDraft: boolean
  onDraft: () => void
}

export function GemFormActions({
  isSubmitting,
  isActionLoading,
  isValid,
  showDraft,
  onDraft,
}: GemFormActionsProps) {
  const busy = isSubmitting || isActionLoading
  return (
    <div className='flex justify-end gap-4 pt-4 border-t'>
      <Button
        type='submit'
        className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
        variant='outline'
        disabled={busy || !isValid}
      >
        {busy ? <Loader2 className='animate-spin h-6 w-6' /> : "Submit Lab Analysis"}
      </Button>
      {showDraft && (
        <Button
          type='button'
          variant='outline'
          className='h-12 px-8 font-bold border-blue-200 text-blue-700 hover:bg-blue-50'
          onClick={onDraft}
          disabled={busy}
        >
          {isActionLoading ? <Loader2 className='animate-spin h-5 w-5' /> : "Save Draft"}
        </Button>
      )}
    </div>
  )
}
