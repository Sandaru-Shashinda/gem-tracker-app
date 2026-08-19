import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { gemsApi } from "@/lib/api/gems"
import { useGem } from "@/hooks/useGemStore"

interface GemWeightEditorProps {
  gemId: string
  weight?: number | null
  onSaved: (weight: number) => void
}

const toDraft = (weight?: number | null) => (weight != null ? String(weight) : "")

/**
 * Weight belongs to the gem itself, not to a test stage, so it is saved on its own
 * rather than with the surrounding analysis form.
 */
export function GemWeightEditor({ gemId, weight, onSaved }: GemWeightEditorProps) {
  const { refreshGems } = useGem()
  const [draft, setDraft] = useState(toDraft(weight))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  useEffect(() => {
    setDraft(toDraft(weight))
  }, [weight])

  const isDirty = draft !== toDraft(weight)

  const save = async () => {
    const parsed = Number(draft)
    // Mirrors the intake schema: weight is required and must be positive.
    if (!draft.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setError("Weight must be a positive number")
      return
    }
    if (parsed === weight) {
      setDraft(toDraft(weight))
      setError(null)
      return
    }
    setIsSaving(true)
    try {
      await gemsApi.updateGem(gemId, { weight: parsed })
      onSaved(parsed)
      await refreshGems()
      setError(null)
      setJustSaved(true)
    } catch (err) {
      console.error("Failed to update weight:", err)
      setError("Failed to save weight")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='bg-amber-50/20 p-4 rounded-xl border border-amber-100/50 shadow-sm space-y-3'>
      <div className='flex items-center justify-between border-b border-amber-100 pb-2'>
        <h4 className='text-[11px] font-black uppercase text-amber-600 tracking-widest'>Weight</h4>
        <span className='text-[9px] font-bold uppercase text-slate-400 tracking-wider'>
          Saved separately
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <div className='relative flex-1'>
          <Input
            type='number'
            step='0.001'
            min='0'
            placeholder='14.36'
            value={draft}
            disabled={isSaving}
            onChange={(e) => {
              setDraft(e.target.value)
              setError(null)
              setJustSaved(false)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                save()
              }
            }}
            className='pr-9'
          />
          <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400'>
            ct
          </span>
        </div>
     
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={save}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? <Loader2 size={14} className='animate-spin' /> : "Save"}
          </Button>
     
      </div>
      {error && <p className='text-[10px] font-bold text-red-500'>{error}</p>}
      {!error && justSaved && <p className='text-[10px] font-bold text-green-600'>Weight saved</p>}
    </div>
  )
}
