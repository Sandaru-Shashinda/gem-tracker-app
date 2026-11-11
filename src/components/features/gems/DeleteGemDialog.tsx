import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { gemsApi } from "@/lib/api/gems"

interface DeleteGemDialogProps {
  /** The gem to delete, or null while the dialog is closed. */
  gem: { _id: string; gemId: string } | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

/**
 * Deleting a gem takes its tests, approval, report and Drive folder with it, so the
 * GRC number has to be typed back before the button unlocks — a misclick in a table
 * row should not be able to do that.
 */
export function DeleteGemDialog({ gem, onOpenChange, onDeleted }: DeleteGemDialogProps) {
  const [typed, setTyped] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTyped("")
    setError(null)
  }, [gem?._id])

  const matches = !!gem && typed.trim() === gem.gemId

  const handleDelete = async () => {
    if (!gem || !matches) return
    setIsDeleting(true)
    setError(null)
    try {
      await gemsApi.deleteGem(gem._id)
      onOpenChange(false)
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete gem")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!gem} onOpenChange={(open) => !isDeleting && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete gem {gem?.gemId}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the gem with its intake images, test readings, approval
            and report. Its Drive folder goes to the trash. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-2'>
          <label className='text-xs font-medium text-slate-600'>
            Type the GRC number <span className='font-mono font-bold'>{gem?.gemId}</span> to
            confirm
          </label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            placeholder={gem?.gemId}
            className='font-mono'
            autoFocus
            disabled={isDeleting}
          />
          {error && <p className='text-xs text-red-500 font-medium'>{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleDelete}
            disabled={!matches || isDeleting}
            className='bg-red-600 hover:bg-red-700 text-white'
          >
            {isDeleting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Deleting...
              </>
            ) : (
              "Delete gem"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
