import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { format } from "date-fns"
import { Archive, Edit2, Eye, EyeOff, Globe, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/shared/data-table/DataTable"
import { PUBLIC_SITE_URL } from "@/lib/api/config"
import {
  POST_CATEGORY_LABELS,
  POST_STATUSES,
  UserRole,
  type Post,
  type PostStatus,
  type User,
} from "@/lib/types"

interface PostTableProps {
  data: Post[]
  onEdit: (post: Post) => void
  onStatusChange: (post: Post, status: PostStatus) => void
  onDelete: (id: string) => void
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
  pendingIds: string[]
  currentUser?: User | null
}

const STATUS_BADGE: Record<PostStatus, { label: string; className: string }> = {
  [POST_STATUSES.DRAFT]: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  [POST_STATUSES.PUBLISHED]: {
    label: "Published",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  [POST_STATUSES.ARCHIVED]: {
    label: "Archived",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
}

const columnHelper = createColumnHelper<Post>()

export function PostTable({
  data,
  onEdit,
  onStatusChange,
  onDelete,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
  pendingIds,
  currentUser,
}: PostTableProps) {
  const isAdmin = currentUser?.role === UserRole.ADMIN

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Post",
        cell: (info) => {
          const post = info.row.original
          return (
            <div className='flex items-start gap-3 max-w-[420px]'>
              {post.coverImage && (
                <img
                  src={post.coverImage}
                  alt=''
                  className='w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0'
                />
              )}
              <div className='min-w-0'>
                <p className='font-bold text-slate-800 leading-tight line-clamp-1'>
                  {post.title}
                </p>
                <p className='text-xs text-slate-500 line-clamp-2'>{post.excerpt}</p>
                <p className='text-[10px] text-slate-400 font-mono mt-0.5'>/{post.slug}</p>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("category", {
        header: "Category",
        cell: (info) => (
          <span className='text-sm font-medium text-slate-600'>
            {POST_CATEGORY_LABELS[info.getValue()]}
          </span>
        ),
      }),
      columnHelper.accessor("author", {
        header: "Author",
        cell: (info) => {
          const post = info.row.original
          return (
            <div className='space-y-0.5'>
              <p className='text-sm font-medium text-slate-600'>
                {post.author?.name || "Unknown"}
              </p>
              <p className='text-[10px] text-slate-400 uppercase tracking-wider'>
                {format(new Date(post.updatedAt || post.createdAt), "d MMM yyyy")}
              </p>
            </div>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const post = info.row.original
          const badge = STATUS_BADGE[info.getValue()]
          return (
            <div className='space-y-1'>
              <Badge variant='outline' className={badge.className}>
                {badge.label}
              </Badge>
              {post.status === POST_STATUSES.PUBLISHED && post.publishedAt && (
                <p className='text-[10px] text-slate-400'>
                  {format(new Date(post.publishedAt), "d MMM yyyy")}
                </p>
              )}
            </div>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const post = info.row.original
          const isPending = pendingIds.includes(post._id)
          const isDraft = post.status === POST_STATUSES.DRAFT
          const isPublished = post.status === POST_STATUSES.PUBLISHED
          const isOwn = post.author?._id === currentUser?.id
          // The API allows an author their own draft, and an admin anything.
          const mayEdit = isAdmin || (isOwn && isDraft)

          return (
            <div className='flex items-center justify-end gap-1'>
              {isPublished && (
                <Button
                  variant='ghost'
                  size='icon'
                  asChild
                  title='View on grc.lk'
                  className='h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg'
                >
                  <a
                    href={`${PUBLIC_SITE_URL}/post/${post.slug}`}
                    target='_blank'
                    rel='noreferrer'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Globe size={14} />
                  </a>
                </Button>
              )}
              {mayEdit && (
                <Button
                  variant='ghost'
                  size='icon'
                  title='Edit'
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(post)
                  }}
                  className='h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg'
                >
                  <Edit2 size={14} />
                </Button>
              )}
              {isAdmin && (
                <>
                  <Button
                    variant='ghost'
                    size='icon'
                    title={isPublished ? "Unpublish" : "Publish to grc.lk"}
                    disabled={isPending}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(
                        post,
                        isPublished ? POST_STATUSES.DRAFT : POST_STATUSES.PUBLISHED,
                      )
                    }}
                    className='h-8 w-8 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg'
                  >
                    {isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    title='Archive'
                    disabled={isPending || post.status === POST_STATUSES.ARCHIVED}
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(post, POST_STATUSES.ARCHIVED)
                    }}
                    className='h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg'
                  >
                    <Archive size={14} />
                  </Button>
                </>
              )}
              {mayEdit && (
                <Button
                  variant='ghost'
                  size='icon'
                  title='Delete'
                  disabled={isPending}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(post._id)
                  }}
                  className='h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg'
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          )
        },
      }),
    ],
    [onEdit, onStatusChange, onDelete, pendingIds, isAdmin, currentUser?.id],
  )

  return (
    <DataTable
      data={data}
      columns={columns}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={totalRecords}
      isLoading={isLoading}
    />
  )
}
