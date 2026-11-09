import { useState } from "react"
import { Check, FolderOpen, Loader2, Play, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DriveNotConfiguredError, driveFileLink, mediaApi, type GemMediaFile } from "@/lib/api/media"
import { reportsApi } from "@/lib/api/reports"
import { isDriveFileLink, isHttpUrl } from "@/lib/video-link"

interface ReportVideoLinkFieldProps {
  reportId?: string
  /** The report's gem, whose Drive folder the video can be picked from. */
  gemId?: string
  /** The link already saved against the report, if any. */
  initialUrl?: string | null
  /** Whether intake recorded that the customer wants a video. */
  requested?: boolean
}

/**
 * Where the lab sets the video a gem's QR page plays: pasted as a link, or picked from
 * the gem's own Drive folder. Either way the report stores a link — a picked video is
 * a Drive link to a file the API's service account can read, so it needs no public
 * sharing.
 *
 * Saves on its own rather than with the page around it: both pages it sits on have a
 * Save that does something else — one moves the gem to DONE, the other stores a
 * certificate's wording — and a link set afterwards should do neither.
 */
export function ReportVideoLinkField({ reportId, gemId, initialUrl, requested }: ReportVideoLinkFieldProps) {
  const [savedUrl, setSavedUrl] = useState(initialUrl ?? "")
  const [value, setValue] = useState(initialUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [folderVideos, setFolderVideos] = useState<GemMediaFile[] | null>(null)
  const [pickerError, setPickerError] = useState<string | null>(null)

  const trimmed = value.trim()
  const isDirty = trimmed !== savedUrl
  const isInvalid = trimmed !== "" && !isHttpUrl(trimmed)

  const save = async (url: string) => {
    if (!reportId) return
    setIsSaving(true)
    setError(null)
    try {
      const updated = await reportsApi.saveVideoUrl(reportId, url)
      setSavedUrl(updated?.videoUrl ?? "")
      setValue(updated?.videoUrl ?? "")
    } catch (err) {
      console.error("Failed to save video link:", err)
      setError("Could not save the video link. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const openPicker = async () => {
    if (!gemId) return
    setPickerOpen(true)
    setFolderVideos(null)
    setPickerError(null)
    try {
      const listing = await mediaApi.list(gemId)
      setFolderVideos(listing.files.filter((f) => f.kind === "video"))
    } catch (err) {
      setPickerError(
        err instanceof DriveNotConfiguredError
          ? "Google Drive is not connected on the server yet."
          : "Could not load the gem's Drive folder.",
      )
    }
  }

  const pick = async (file: GemMediaFile) => {
    setPickerOpen(false)
    await save(driveFileLink(file.id))
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
      <div className='flex flex-wrap gap-2'>
        <Input
          id='report-video-url'
          type='url'
          className='h-11 flex-1 min-w-[16rem]'
          placeholder='https://drive.google.com/file/d/…/view'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={isInvalid}
        />
        <Button
          type='button'
          variant='outline'
          className='h-11'
          onClick={() => save(trimmed)}
          disabled={!reportId || !isDirty || isInvalid || isSaving}
        >
          {isSaving ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : !isDirty && savedUrl ? (
            <Check className='h-4 w-4 text-emerald-600' />
          ) : null}
          {!isDirty && savedUrl ? "Saved" : "Save"}
        </Button>
        {gemId && (
          <Button
            type='button'
            variant='outline'
            className='h-11'
            onClick={openPicker}
            disabled={!reportId || isSaving}
          >
            <FolderOpen className='h-4 w-4' />
            Choose from gem folder
          </Button>
        )}
      </div>
      {isInvalid ? (
        <p className='text-xs text-red-500 font-medium'>Enter a full link starting with https://</p>
      ) : error ? (
        <p className='text-xs text-red-500 font-medium'>{error}</p>
      ) : trimmed && !isDriveFileLink(trimmed) ? (
        <p className='text-xs text-amber-600'>
          Not a Google Drive file link — it will only play if it points straight at a video
          file (e.g. an .mp4).
        </p>
      ) : (
        <p className='text-xs text-slate-500'>
          Choose a video from the gem's Drive folder, or paste a Google Drive share link. A
          pasted link from another Drive must be shared as "Anyone with the link", with
          downloading allowed, so the person scanning the QR code can watch it. Leave empty
          and save to remove the video.
        </p>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Choose the report video</DialogTitle>
            <DialogDescription>Videos in this gem's Drive folder.</DialogDescription>
          </DialogHeader>
          {pickerError ? (
            <p className='text-sm text-red-500'>{pickerError}</p>
          ) : !folderVideos ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin text-slate-300' />
            </div>
          ) : folderVideos.length === 0 ? (
            <p className='text-sm text-slate-500'>
              No videos in the folder yet. Upload one from the gem's page first.
            </p>
          ) : (
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto'>
              {folderVideos.map((file) => {
                const isCurrent = savedUrl === driveFileLink(file.id)
                return (
                  <button
                    key={file.id}
                    type='button'
                    onClick={() => pick(file)}
                    className={`text-left rounded-xl border overflow-hidden hover:border-emerald-400 transition-colors ${
                      isCurrent ? "border-emerald-500 ring-2 ring-emerald-100" : "border-slate-200"
                    }`}
                  >
                    <div className='relative aspect-video bg-slate-100 flex items-center justify-center'>
                      {file.hasThumbnail && gemId ? (
                        <img src={mediaApi.thumbnailUrl(gemId, file)} alt='' className='h-full w-full object-cover' />
                      ) : (
                        <Play className='h-6 w-6 text-slate-300' />
                      )}
                      {isCurrent && (
                        <span className='absolute top-1.5 right-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white'>
                          Current
                        </span>
                      )}
                    </div>
                    <p className='truncate px-2 py-1.5 text-xs text-slate-600'>{file.name}</p>
                  </button>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
