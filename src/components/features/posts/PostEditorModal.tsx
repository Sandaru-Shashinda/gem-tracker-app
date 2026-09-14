import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { postsApi, PostValidationError, type PostFieldErrors } from "@/lib/api/posts"
import {
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  POST_STATUSES,
  UserRole,
  type Post,
  type PostCategory,
} from "@/lib/types"

interface PostEditorModalProps {
  /** null opens the editor on a new post. */
  post: Post | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (post: Post) => void
  userRole?: UserRole
}

const EMPTY = {
  title: "",
  excerpt: "",
  body: "",
  category: POST_CATEGORIES.BLOG as PostCategory,
}

export function PostEditorModal({
  post,
  isOpen,
  onOpenChange,
  onSuccess,
  userRole,
}: PostEditorModalProps) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState<PostFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdmin = userRole === UserRole.ADMIN
  const isEditing = !!post
  // Only an admin may edit a post that is already live on grc.lk.
  const isLocked = isEditing && post.status !== POST_STATUSES.DRAFT && !isAdmin

  // Reload the form whenever the editor is pointed at a different post.
  useEffect(() => {
    if (!isOpen) return
    setValues(
      post
        ? {
            title: post.title,
            excerpt: post.excerpt,
            body: post.body,
            category: post.category,
          }
        : EMPTY,
    )
    setCoverFile(null)
    setCoverPreview(post?.coverImage ?? null)
    setErrors({})
    setFormError(null)
  }, [isOpen, post])

  // Object URLs for the local preview have to be handed back, or the blob stays
  // alive for the life of the tab.
  useEffect(() => {
    if (!coverFile) return
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  const update = (field: keyof typeof EMPTY, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSave = async () => {
    setFormError(null)

    const nextErrors: PostFieldErrors = {}
    if (!values.title.trim()) nextErrors.title = "A title is required."
    if (!values.body.trim()) nextErrors.body = "The post needs some content."
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const form = new FormData()
    form.append("title", values.title.trim())
    form.append("excerpt", values.excerpt.trim())
    form.append("body", values.body)
    form.append("category", values.category)
    if (coverFile) form.append("coverImage", coverFile)

    setIsSaving(true)
    try {
      const saved = post
        ? await postsApi.updatePost(post._id, form)
        : await postsApi.createPost(form)
      onSuccess(saved)
      onOpenChange(false)
    } catch (error) {
      if (error instanceof PostValidationError) {
        setErrors(error.errors)
      } else {
        setFormError(error instanceof Error ? error.message : "Failed to save post")
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[680px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit post" : "Write a post"}</DialogTitle>
          <DialogDescription>
            {isLocked
              ? "This post is live on grc.lk. Ask an administrator to make changes."
              : "Saved as a draft. An administrator publishes it to grc.lk."}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {formError && (
            <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700'>
              {formError}
            </div>
          )}

          <div className='space-y-2'>
            <Label htmlFor='post-title'>Title</Label>
            <Input
              id='post-title'
              value={values.title}
              maxLength={180}
              disabled={isLocked}
              onChange={(e) => update("title", e.target.value)}
              placeholder='e.g. Identifying heat treatment in Ceylon sapphire'
              aria-invalid={!!errors.title}
            />
            {errors.title && <p className='text-xs text-red-600'>{errors.title}</p>}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='post-category'>Category</Label>
              <Select
                value={values.category}
                disabled={isLocked || !isAdmin}
                onValueChange={(value) => update("category", value)}
              >
                <SelectTrigger id='post-category'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(POST_CATEGORIES).map((category) => (
                    <SelectItem key={category} value={category}>
                      {POST_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className='text-[10px] text-slate-400'>
                  GRC News is filed by administrators.
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label>Cover image</Label>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/png,image/jpeg'
                className='hidden'
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
              {coverPreview ? (
                <div className='relative'>
                  <img
                    src={coverPreview}
                    alt=''
                    className='w-full h-24 object-cover rounded-xl border border-slate-200'
                  />
                  {!isLocked && (
                    <button
                      type='button'
                      onClick={() => {
                        setCoverFile(null)
                        setCoverPreview(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                      className='absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 text-slate-500 hover:text-red-600 shadow-sm'
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  type='button'
                  variant='outline'
                  disabled={isLocked}
                  onClick={() => fileInputRef.current?.click()}
                  className='w-full h-24 border-dashed flex flex-col gap-1 text-slate-400'
                >
                  <ImagePlus size={18} />
                  <span className='text-xs'>JPG or PNG</span>
                </Button>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='post-excerpt'>Excerpt</Label>
            <Textarea
              id='post-excerpt'
              value={values.excerpt}
              rows={2}
              maxLength={400}
              disabled={isLocked}
              onChange={(e) => update("excerpt", e.target.value)}
              placeholder='Shown on the card. Left blank, the opening lines are used.'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='post-body'>Content</Label>
            <Textarea
              id='post-body'
              value={values.body}
              rows={12}
              disabled={isLocked}
              onChange={(e) => update("body", e.target.value)}
              placeholder={"Write the article here.\n\nLeave a blank line between paragraphs."}
              aria-invalid={!!errors.body}
            />
            {errors.body && <p className='text-xs text-red-600'>{errors.body}</p>}
            <p className='text-[10px] text-slate-400'>
              Plain text. Blank lines become paragraphs on grc.lk.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLocked}
            className='bg-blue-600 hover:bg-blue-700'
          >
            {isSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isEditing ? "Save changes" : "Save draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
