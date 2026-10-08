import { useState } from "react"
import { Check, Loader2, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { reportsApi } from "@/lib/api/reports"
import { isHttpUrl, videoEmbedUrl } from "@/lib/video-link"

interface ReportVideoLinkFieldProps {
  reportId?: string
  /** The link already saved against the report, if any. */
  initialUrl?: string | null
  /** Whether intake recorded that the customer wants a video. */
  requested?: boolean
}

/**
 * Where the lab pastes the link to a gem's video.
 *
 * Saves on its own rather than with the page around it: both pages it sits on have a
 * Save that does something else — one moves the gem to DONE, the other stores a
 * certificate's wording — and a link pasted in afterwards should do neither.
 */
export function ReportVideoLinkField({ reportId, initialUrl, requested }: ReportVideoLinkFieldProps) {
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? "")
  const [value, setValue] = useState(initialUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = value.trim()
  const isDirty = trimmed !== savedUrl
  const isInvalid = trimmed !== "" && !isHttpUrl(trimmed)

  const handleSave = async () => {
    if (!reportId || isInvalid) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await reportsApi.saveVideoUrl(reportId, trimmed)
      setSavedUrl(updated?.videoUrl ?? "")
      setValue(updated?.videoUrl ?? "")
    } catch (err) {
      console.error("Failed to save video link:", err)
      setError("Could not save the video link. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Label htmlFor='report-video-url' className='flex items-center gap-1.5'>
          <Video className='h-4 w-4 text-slate-500' />
          Video Link
        </Label>
        {requested && (
          <Badge className='bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 hover:bg-amber-100'>
            Requested at intake
          </Badge>
        )}
      </div>
      <div className='flex gap-2'>
        <Input
          id='report-video-url'
          type='url'
          className='h-11'
          placeholder='https://drive.google.com/file/d/…/view'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={isInvalid}
        />
        <Button
          type='button'
          variant='outline'
          className='h-11'
          onClick={handleSave}
          disabled={!reportId || !isDirty || isInvalid || isSaving}
        >
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : !isDirty && savedUrl ? (
            <Check className='h-4 w-4 text-emerald-600' />
          ) : null}
          {!isDirty && savedUrl ? "Saved" : "Save"}
        </Button>
      </div>
      {isInvalid ? (
        <p className='text-xs text-red-500 font-medium'>Enter a full link starting with https://</p>
      ) : error ? (
        <p className='text-xs text-red-500 font-medium'>{error}</p>
      ) : trimmed && !videoEmbedUrl(trimmed) ? (
        <p className='text-xs text-amber-600'>
          Not a Google Drive file link — it will open in a new tab instead of playing on the
          page.
        </p>
      ) : (
        <p className='text-xs text-slate-500'>
          Paste the Google Drive share link. Set its sharing to "Anyone with the link" so the
          person scanning the QR code can watch it. Leave empty and save to remove the video.
        </p>
      )}
    </div>
  )
}
