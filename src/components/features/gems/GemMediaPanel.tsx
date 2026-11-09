import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  ImageIcon,
  Loader2,
  Play,
  Trash2,
  Upload,
  Video,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/useToast"
import {
  DriveNotConfiguredError,
  mediaApi,
  type GemMediaFile,
  type GemMediaListing,
} from "@/lib/api/media"

interface GemMediaPanelProps {
  gemId: string
  /** Whether this user may remove files; anyone may add them. */
  canDelete: boolean
}

interface UploadProgress {
  key: string
  name: string
  fraction: number
}

const formatDuration = (ms: number) => {
  const seconds = Math.round(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

/**
 * The gem's photos and videos, kept in its folder in the lab's Shared Drive.
 *
 * Separate from the intake images, which are the cropped photo printed on the report:
 * this is everything else taken of the stone, at full quality and any size.
 */
export function GemMediaPanel({ gemId, canDelete }: GemMediaPanelProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [listing, setListing] = useState<GemMediaListing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [viewing, setViewing] = useState<GemMediaFile | null>(null)
  const [deleting, setDeleting] = useState<GemMediaFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      setListing(await mediaApi.list(gemId))
    } catch (error) {
      if (error instanceof DriveNotConfiguredError) setNotConfigured(true)
      else setLoadError("Could not load this gem's Drive files.")
    } finally {
      setIsLoading(false)
    }
  }, [gemId])

  useEffect(() => {
    load()
  }, [load])

  const handleFiles = async (fileList: FileList | null) => {
    const files = Array.from(fileList ?? [])
    if (inputRef.current) inputRef.current.value = ""
    if (files.length === 0) return

    const entries = files.map((file, i) => ({ key: `${Date.now()}-${i}`, name: file.name, fraction: 0 }))
    setUploads((current) => [...current, ...entries])

    // One at a time: phone videos are large, and parallel uploads only split the bandwidth.
    let failed = 0
    for (const [i, file] of files.entries()) {
      const { key } = entries[i]
      try {
        await mediaApi.upload(gemId, file, (fraction) =>
          setUploads((current) => current.map((u) => (u.key === key ? { ...u, fraction } : u))),
        )
      } catch (error) {
        failed++
        console.error("Upload failed:", error)
        toast({
          title: `Could not upload ${file.name}`,
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        })
      } finally {
        setUploads((current) => current.filter((u) => u.key !== key))
      }
    }

    if (failed < files.length) {
      toast({ title: `Uploaded ${files.length - failed} file${files.length - failed === 1 ? "" : "s"}`, variant: "success" })
    }
    await load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    setIsDeleting(true)
    try {
      await mediaApi.remove(gemId, deleting.id)
      setListing((current) =>
        current ? { ...current, files: current.files.filter((f) => f.id !== deleting.id) } : current,
      )
      if (viewing?.id === deleting.id) setViewing(null)
      setDeleting(null)
      toast({ title: "Moved to the Drive trash", variant: "success" })
    } catch (error) {
      console.error("Delete failed:", error)
      toast({ title: "Could not delete the file", variant: "error" })
    } finally {
      setIsDeleting(false)
    }
  }

  const files = listing?.files ?? []
  const viewingIndex = viewing ? files.findIndex((f) => f.id === viewing.id) : -1
  const hasPrevious = viewingIndex > 0
  const hasNext = viewingIndex >= 0 && viewingIndex < files.length - 1

  const showAt = (index: number) => {
    if (index >= 0 && index < files.length) setViewing(files[index])
  }

  const handleViewerKeyDown = (e: KeyboardEvent) => {
    // Leave arrow keys to a focused video, where they seek.
    if (e.target instanceof HTMLVideoElement) return
    if (e.key === "ArrowLeft" && hasPrevious) {
      e.preventDefault()
      showAt(viewingIndex - 1)
    } else if (e.key === "ArrowRight" && hasNext) {
      e.preventDefault()
      showAt(viewingIndex + 1)
    }
  }

  return (
    <Card className='p-6 bg-white shadow-sm border-slate-100'>
      <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
        <div className='flex items-center gap-2'>
          <FolderOpen className='h-5 w-5 text-slate-500' />
          <h3 className='text-lg font-bold text-slate-800'>Photos & Videos</h3>
          {files.length > 0 && <span className='text-sm text-slate-400'>({files.length})</span>}
        </div>
        {!notConfigured && (
          <div className='flex items-center gap-2'>
            {listing?.folderUrl && (
              <Button variant='ghost' size='sm' asChild>
                <a href={listing.folderUrl} target='_blank' rel='noreferrer'>
                  <ExternalLink className='h-4 w-4' />
                  Open in Drive
                </a>
              </Button>
            )}
            <Button size='sm' onClick={() => inputRef.current?.click()} disabled={isLoading}>
              <Upload className='h-4 w-4' />
              Upload
            </Button>
            <input
              ref={inputRef}
              type='file'
              accept='image/*,video/*'
              multiple
              className='hidden'
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {uploads.length > 0 && (
        <div className='space-y-2 mb-4'>
          {uploads.map((u) => (
            <div key={u.key} className='text-xs text-slate-600'>
              <div className='flex justify-between mb-1'>
                <span className='truncate pr-2'>{u.name}</span>
                <span>{Math.round(u.fraction * 100)}%</span>
              </div>
              <div className='h-1.5 rounded-full bg-slate-100 overflow-hidden'>
                <div className='h-full bg-emerald-500 transition-all' style={{ width: `${u.fraction * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {notConfigured ? (
        <p className='text-sm text-slate-500'>
          Google Drive is not connected on the server yet, so photos and videos cannot be stored.
        </p>
      ) : isLoading ? (
        <div className='flex justify-center py-10'>
          <Loader2 className='h-6 w-6 animate-spin text-slate-300' />
        </div>
      ) : loadError ? (
        <div className='flex items-center gap-3 text-sm text-red-500'>
          {loadError}
          <Button variant='outline' size='sm' onClick={load}>
            Retry
          </Button>
        </div>
      ) : files.length === 0 ? (
        <p className='text-sm text-slate-500 py-6 text-center'>
          No photos or videos yet. Upload some and they are saved to this gem's Drive folder.
        </p>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3'>
          {files.map((file) => (
            <div key={file.id} className='group relative aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50'>
              <button
                type='button'
                className='h-full w-full flex items-center justify-center'
                onClick={() => setViewing(file)}
                title={file.name}
              >
                {file.hasThumbnail ? (
                  <img
                    src={mediaApi.thumbnailUrl(gemId, file)}
                    alt={file.name}
                    loading='lazy'
                    className='h-full w-full object-cover'
                  />
                ) : file.kind === "video" ? (
                  <Video className='h-8 w-8 text-slate-300' />
                ) : (
                  <ImageIcon className='h-8 w-8 text-slate-300' />
                )}
                {file.kind === "video" && (
                  <span className='absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white'>
                    <Play className='h-3 w-3 fill-white' />
                    {file.durationMillis ? formatDuration(file.durationMillis) : "Video"}
                  </span>
                )}
              </button>
              {canDelete && (
                <button
                  type='button'
                  onClick={() => setDeleting(file)}
                  className='absolute top-1.5 right-1.5 rounded-md bg-white/90 p-1.5 text-red-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100'
                  aria-label={`Delete ${file.name}`}
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className='max-w-4xl' onKeyDown={handleViewerKeyDown}>
          <DialogTitle className='flex items-center gap-2 pr-8 text-sm'>
            <span className='truncate'>{viewing?.name}</span>
            {files.length > 1 && viewingIndex >= 0 && (
              <span className='shrink-0 font-normal text-slate-400'>
                {viewingIndex + 1} / {files.length}
              </span>
            )}
          </DialogTitle>
          <div className='relative'>
            {viewing?.kind === "video" ? (
              <video
                key={viewing.id}
                src={mediaApi.streamUrl(gemId, viewing)}
                controls
                autoPlay
                className='w-full max-h-[70vh] rounded-lg bg-black'
              />
            ) : viewing?.hasThumbnail ? (
              <img
                key={viewing.id}
                src={mediaApi.thumbnailUrl(gemId, viewing, 1600)}
                alt={viewing.name}
                className='w-full max-h-[70vh] object-contain rounded-lg bg-slate-50'
              />
            ) : (
              <p className='text-sm text-slate-500 py-10 px-12 text-center'>
                Drive is still preparing a preview of this file. Try again shortly, or open the folder in Drive.
              </p>
            )}
            {hasPrevious && (
              <button
                type='button'
                onClick={() => showAt(viewingIndex - 1)}
                className='absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400'
                aria-label='Previous file'
              >
                <ChevronLeft className='h-5 w-5' />
              </button>
            )}
            {hasNext && (
              <button
                type='button'
                onClick={() => showAt(viewingIndex + 1)}
                className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow-md transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400'
                aria-label='Next file'
              >
                <ChevronRight className='h-5 w-5' />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} will be moved to the Drive trash, where it can be restored for 30
              days. If it is the report's video, the report will stop showing it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className='bg-red-600 hover:bg-red-700'
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className='h-4 w-4 animate-spin' /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
