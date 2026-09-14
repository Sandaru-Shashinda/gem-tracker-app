import { useCallback, useEffect, useState } from "react"
import { Newspaper, Plus, Search } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PostTable } from "@/components/features/posts/PostTable"
import { PostEditorModal } from "@/components/features/posts/PostEditorModal"
import { DeletePostDialog } from "@/components/features/posts/DeletePostDialog"
import { postsApi } from "@/lib/api/posts"
import { useGem } from "@/hooks/useGemStore"
import {
  POST_STATUSES,
  UserRole,
  type Post,
  type PostStatus,
} from "@/lib/types"

const FILTERS: { label: string; value: PostStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Drafts", value: POST_STATUSES.DRAFT },
  { label: "Published", value: POST_STATUSES.PUBLISHED },
  { label: "Archived", value: POST_STATUSES.ARCHIVED },
]

export function PostsPage() {
  const { user } = useGem()
  const isAdmin = user?.role === UserRole.ADMIN

  const [posts, setPosts] = useState<Post[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [draftCount, setDraftCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PostStatus | "">("")
  const [mineOnly, setMineOnly] = useState(false)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [deletingPost, setDeletingPost] = useState<Post | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const loadPosts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await postsApi.getPosts({
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        search,
        status: statusFilter,
        mine: mineOnly,
      })
      setPosts(result.posts)
      setTotalRecords(result.total)
      setDraftCount(result.draftCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, search, statusFilter, mineOnly])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const changeStatus = async (post: Post, status: PostStatus) => {
    setPendingIds((current) => [...current, post._id])
    try {
      const updated = await postsApi.updateStatus(post._id, status)
      // Patch in place so the list does not jump while working through it.
      setPosts((current) => current.map((row) => (row._id === updated._id ? updated : row)))
      setDraftCount((current) => {
        const wasDraft = post.status === POST_STATUSES.DRAFT
        const isDraft = status === POST_STATUSES.DRAFT
        if (wasDraft === isDraft) return current
        return Math.max(0, current + (isDraft ? 1 : -1))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update post")
    } finally {
      setPendingIds((current) => current.filter((id) => id !== post._id))
    }
  }

  const handleDelete = async () => {
    if (!deletingPost) return
    setIsDeleting(true)
    try {
      await postsApi.deletePost(deletingPost._id)
      setDeletingPost(null)
      loadPosts()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post")
    } finally {
      setIsDeleting(false)
    }
  }

  const openEditor = (post: Post | null) => {
    setEditingPost(post)
    setEditorOpen(true)
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200'>
              <Newspaper className='text-white' size={24} />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>Posts</h2>
              <p className='text-xs text-slate-500 font-medium'>
                Blogs and news published to grc.lk
                {draftCount > 0 && (
                  <span className='ml-2 text-indigo-600 font-bold'>
                    {draftCount} draft{draftCount === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3 w-full md:w-auto'>
            <div className='relative flex-1 md:w-64'>
              <Search
                className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
                size={16}
              />
              <Input
                placeholder='Search posts...'
                className='pl-9 bg-white border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination((current) => ({ ...current, pageIndex: 0 }))
                }}
              />
            </div>
            <Button
              onClick={() => openEditor(null)}
              className='bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 h-10 px-4 rounded-xl transition-all active:scale-95 whitespace-nowrap'
            >
              <Plus size={18} />
              <span className='font-bold hidden sm:inline'>Write Post</span>
            </Button>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {FILTERS.map((filter) => (
            <Button
              key={filter.value || "all"}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size='sm'
              onClick={() => {
                setStatusFilter(filter.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
              className={
                statusFilter === filter.value
                  ? "bg-indigo-600 hover:bg-indigo-700 rounded-full px-4"
                  : "rounded-full px-4 text-slate-500"
              }
            >
              {filter.label}
            </Button>
          ))}

          <span className='mx-1 h-5 w-px bg-slate-200' />

          <Button
            variant={mineOnly ? "default" : "outline"}
            size='sm'
            onClick={() => {
              setMineOnly((current) => !current)
              setPagination((current) => ({ ...current, pageIndex: 0 }))
            }}
            className={
              mineOnly
                ? "bg-indigo-600 hover:bg-indigo-700 rounded-full px-4"
                : "rounded-full px-4 text-slate-500"
            }
          >
            My posts
          </Button>
        </div>

        {error && (
          <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700'>
            {error}
          </div>
        )}

        {!isAdmin && (
          <div className='p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700'>
            Your posts are saved as drafts. An administrator reviews and publishes them
            to grc.lk.
          </div>
        )}

        <PostTable
          data={posts}
          onEdit={openEditor}
          onStatusChange={changeStatus}
          onDelete={(id) => setDeletingPost(posts.find((p) => p._id === id) ?? null)}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
          pendingIds={pendingIds}
          currentUser={user}
        />

        <PostEditorModal
          post={editingPost}
          isOpen={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open)
            if (!open) setEditingPost(null)
          }}
          onSuccess={loadPosts}
          userRole={user?.role}
        />

        <DeletePostDialog
          isOpen={!!deletingPost}
          onOpenChange={(open) => !open && setDeletingPost(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          isPublished={deletingPost?.status === POST_STATUSES.PUBLISHED}
        />
      </div>
    </MainLayout>
  )
}
