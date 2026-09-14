import { useMemo } from "react"
import { createColumnHelper, type PaginationState } from "@tanstack/react-table"
import { format } from "date-fns"
import { Archive, Mail, MailOpen, Phone, Trash2, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DataTable from "@/components/shared/data-table/DataTable"
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from "@/lib/types"

interface ContactMessageTableProps {
  data: ContactMessage[]
  onOpen: (message: ContactMessage) => void
  onStatusChange: (message: ContactMessage, status: ContactStatus) => void
  onDelete: (id: string) => void
  pagination: PaginationState
  onPaginationChange: (
    updater: PaginationState | ((state: PaginationState) => PaginationState),
  ) => void
  totalRecords: number
  isLoading?: boolean
  /** Ids currently being written, so their row controls disable while in flight. */
  pendingIds: string[]
}

const STATUS_BADGE: Record<ContactStatus, { label: string; className: string }> = {
  [CONTACT_STATUSES.NEW]: {
    label: "New",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  [CONTACT_STATUSES.READ]: {
    label: "Read",
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
  [CONTACT_STATUSES.ARCHIVED]: {
    label: "Archived",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
}

const columnHelper = createColumnHelper<ContactMessage>()

export function ContactMessageTable({
  data,
  onOpen,
  onStatusChange,
  onDelete,
  pagination,
  onPaginationChange,
  totalRecords,
  isLoading,
  pendingIds,
}: ContactMessageTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "From",
        cell: (info) => {
          const message = info.row.original
          const isNew = message.status === CONTACT_STATUSES.NEW
          return (
            <div className='space-y-1'>
              <p
                className={`leading-tight ${
                  isNew ? "font-bold text-slate-900" : "font-medium text-slate-700"
                }`}
              >
                {message.name}
              </p>
              <div className='flex items-center gap-2 text-xs text-slate-500'>
                <Mail size={11} className='text-slate-300 shrink-0' />
                <span className='font-medium truncate'>{message.email}</span>
              </div>
              <div className='flex items-center gap-2 text-xs text-slate-500'>
                <Phone size={11} className='text-slate-300 shrink-0' />
                <span className='font-medium'>{message.phone}</span>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor("message", {
        header: "Message",
        cell: (info) => {
          const body = info.getValue()
          return (
            <p className='max-w-[420px] text-sm text-slate-600 line-clamp-2'>
              {body || <span className='text-slate-400 italic'>No message body</span>}
            </p>
          )
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Received",
        cell: (info) => {
          const message = info.row.original
          return (
            <div className='space-y-1'>
              <p className='text-sm font-medium text-slate-600 whitespace-nowrap'>
                {format(new Date(info.getValue()), "d MMM yyyy")}
              </p>
              <p className='text-[10px] text-slate-400 font-mono uppercase tracking-wider'>
                {format(new Date(info.getValue()), "HH:mm")}
              </p>
              {message.handledBy?.name && (
                <p className='text-[10px] text-slate-400'>by {message.handledBy.name}</p>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const badge = STATUS_BADGE[info.getValue()]
          return (
            <Badge variant='outline' className={badge.className}>
              {badge.label}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const message = info.row.original
          const isPending = pendingIds.includes(message._id)
          const isArchived = message.status === CONTACT_STATUSES.ARCHIVED
          const isNew = message.status === CONTACT_STATUSES.NEW

          return (
            <div className='flex items-center justify-end gap-1'>
              <Button
                variant='ghost'
                size='icon'
                title={isNew ? "Mark as read" : "Mark as unread"}
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(
                    message,
                    isNew ? CONTACT_STATUSES.READ : CONTACT_STATUSES.NEW,
                  )
                }}
                className='h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all rounded-lg'
              >
                {isNew ? <MailOpen size={14} /> : <Mail size={14} />}
              </Button>
              <Button
                variant='ghost'
                size='icon'
                title={isArchived ? "Return to inbox" : "Archive"}
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  onStatusChange(
                    message,
                    isArchived ? CONTACT_STATUSES.READ : CONTACT_STATUSES.ARCHIVED,
                  )
                }}
                className='h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all rounded-lg'
              >
                {isArchived ? <Undo2 size={14} /> : <Archive size={14} />}
              </Button>
              <Button
                variant='ghost'
                size='icon'
                title='Delete'
                disabled={isPending}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(message._id)
                }}
                className='h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg'
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )
        },
      }),
    ],
    [onStatusChange, onDelete, pendingIds],
  )

  return (
    <DataTable
      data={data}
      columns={columns}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
      totalRecords={totalRecords}
      isLoading={isLoading}
      onRowClick={onOpen}
    />
  )
}
