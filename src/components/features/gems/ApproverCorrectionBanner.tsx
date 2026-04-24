interface ApproverCorrectionBannerProps {
  note: string | undefined
  isAdmin: boolean
  onDismiss: () => void
}

export function ApproverCorrectionBanner({ note, isAdmin, onDismiss }: ApproverCorrectionBannerProps) {
  return (
    <div className='mb-4 flex items-start justify-between gap-3 rounded-lg border border-yellow-400 bg-yellow-50 p-4'>
      <div>
        <p className='text-sm font-bold text-yellow-800'>Correction Flagged by Approver</p>
        {note && <p className='mt-1 text-sm text-yellow-700'>{note}</p>}
      </div>
      {isAdmin && (
        <button
          type='button'
          onClick={onDismiss}
          className='shrink-0 text-xs font-semibold text-yellow-700 underline hover:text-yellow-900'
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
