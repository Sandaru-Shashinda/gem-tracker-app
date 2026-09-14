import { useCallback, useEffect, useState } from "react"
import { Inbox, Search } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContactMessageTable } from "@/components/features/contact/ContactMessageTable"
import { ContactMessageDialog } from "@/components/features/contact/ContactMessageDialog"
import { DeleteMessageDialog } from "@/components/features/contact/DeleteMessageDialog"
import { contactApi } from "@/lib/api/contact"
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from "@/lib/types"

const FILTERS: { label: string; value: ContactStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "New", value: CONTACT_STATUSES.NEW },
  { label: "Read", value: CONTACT_STATUSES.READ },
  { label: "Archived", value: CONTACT_STATUSES.ARCHIVED },
]

export function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  const [newCount, setNewCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "">("")

  const [openMessage, setOpenMessage] = useState<ContactMessage | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await contactApi.getMessages(
        pagination.pageIndex + 1,
        pagination.pageSize,
        search,
        statusFilter,
      )
      setMessages(result.messages)
      setTotalRecords(result.total)
      setNewCount(result.newCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setIsLoading(false)
    }
  }, [pagination.pageIndex, pagination.pageSize, search, statusFilter])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const changeStatus = async (message: ContactMessage, status: ContactStatus) => {
    setPendingIds((current) => [...current, message._id])
    try {
      const updated = await contactApi.updateStatus(message._id, status)

      // Patch the row in place so the table does not jump while the operator
      // works through the list; the counts still come from the server.
      setMessages((current) =>
        current.map((row) => (row._id === updated._id ? updated : row)),
      )
      setOpenMessage((current) => (current?._id === updated._id ? updated : current))
      setNewCount((current) => {
        const wasNew = message.status === CONTACT_STATUSES.NEW
        const isNew = status === CONTACT_STATUSES.NEW
        if (wasNew === isNew) return current
        return Math.max(0, current + (isNew ? 1 : -1))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message")
    } finally {
      setPendingIds((current) => current.filter((id) => id !== message._id))
    }
  }

  /** Opening an unread enquiry marks it read, the way an inbox would. */
  const openAndMarkRead = (message: ContactMessage) => {
    setOpenMessage(message)
    if (message.status === CONTACT_STATUSES.NEW) {
      changeStatus(message, CONTACT_STATUSES.READ)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      await contactApi.deleteMessage(deletingId)
      setDeletingId(null)
      setOpenMessage((current) => (current?._id === deletingId ? null : current))
      loadMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete message")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-teal-600 rounded-lg shadow-lg shadow-teal-200'>
              <Inbox className='text-white' size={24} />
            </div>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>Website Messages</h2>
              <p className='text-xs text-slate-500 font-medium'>
                Enquiries from the contact form on grc.lk
                {newCount > 0 && (
                  <span className='ml-2 text-teal-600 font-bold'>
                    {newCount} unread
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className='relative w-full md:w-64'>
            <Search
              className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
              size={16}
            />
            <Input
              placeholder='Search messages...'
              className='pl-9 bg-white border-slate-200 focus:border-teal-500 focus:ring-teal-500'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination((current) => ({ ...current, pageIndex: 0 }))
              }}
            />
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
                  ? "bg-teal-600 hover:bg-teal-700 rounded-full px-4"
                  : "rounded-full px-4 text-slate-500"
              }
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {error && (
          <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700'>
            {error}
          </div>
        )}

        <ContactMessageTable
          data={messages}
          onOpen={openAndMarkRead}
          onStatusChange={changeStatus}
          onDelete={setDeletingId}
          pagination={pagination}
          onPaginationChange={setPagination}
          totalRecords={totalRecords}
          isLoading={isLoading}
          pendingIds={pendingIds}
        />

        <ContactMessageDialog
          message={openMessage}
          isOpen={!!openMessage}
          onOpenChange={(open) => !open && setOpenMessage(null)}
          onStatusChange={changeStatus}
          isPending={!!openMessage && pendingIds.includes(openMessage._id)}
        />

        <DeleteMessageDialog
          isOpen={!!deletingId}
          onOpenChange={(open) => !open && setDeletingId(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      </div>
    </MainLayout>
  )
}
