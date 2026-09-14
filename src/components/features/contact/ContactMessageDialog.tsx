import { format } from "date-fns"
import { Archive, Mail, Phone, Reply, Undo2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CONTACT_STATUSES, type ContactMessage, type ContactStatus } from "@/lib/types"

interface ContactMessageDialogProps {
  message: ContactMessage | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (message: ContactMessage, status: ContactStatus) => void
  isPending: boolean
}

/** Opens the operator's mail client with the enquiry quoted underneath. */
function replyHref(message: ContactMessage) {
  const subject = `Re: your enquiry to GRC — ${format(
    new Date(message.createdAt),
    "d MMM yyyy",
  )}`
  const quoted = message.message
    ? `\n\n---\nYour message:\n${message.message}`
    : ""
  const body = `Dear ${message.name},\n\nThank you for contacting the Gemological Report of Ceylon.\n${quoted}`

  return `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`
}

export function ContactMessageDialog({
  message,
  isOpen,
  onOpenChange,
  onStatusChange,
  isPending,
}: ContactMessageDialogProps) {
  if (!message) return null

  const isArchived = message.status === CONTACT_STATUSES.ARCHIVED

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[560px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            {message.name}
            {message.status === CONTACT_STATUSES.NEW && (
              <Badge variant='outline' className='bg-blue-100 text-blue-700 border-blue-200'>
                New
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Received {format(new Date(message.createdAt), "d MMMM yyyy 'at' HH:mm")}
            {message.source ? ` · via ${message.source}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <a
              href={`mailto:${message.email}`}
              className='flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-all'
            >
              <Mail size={14} className='text-slate-400 shrink-0' />
              <span className='font-medium truncate'>{message.email}</span>
            </a>
            <a
              href={`tel:${message.phone.replace(/\s/g, "")}`}
              className='flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-all'
            >
              <Phone size={14} className='text-slate-400 shrink-0' />
              <span className='font-medium'>{message.phone}</span>
            </a>
          </div>

          <div className='p-4 rounded-xl bg-white border border-slate-200'>
            <h4 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
              Message
            </h4>
            {message.message ? (
              <p className='text-sm text-slate-700 whitespace-pre-wrap leading-relaxed'>
                {message.message}
              </p>
            ) : (
              <p className='text-sm text-slate-400 italic'>
                The sender left the message field empty.
              </p>
            )}
          </div>

          {message.handledBy?.name && message.handledAt && (
            <p className='text-xs text-slate-400'>
              Marked {message.status.toLowerCase()} by {message.handledBy.name} on{" "}
              {format(new Date(message.handledAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          )}
        </div>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            disabled={isPending}
            onClick={() =>
              onStatusChange(
                message,
                isArchived ? CONTACT_STATUSES.READ : CONTACT_STATUSES.ARCHIVED,
              )
            }
            className='flex items-center gap-2'
          >
            {isArchived ? <Undo2 size={14} /> : <Archive size={14} />}
            {isArchived ? "Return to inbox" : "Archive"}
          </Button>
          <Button asChild className='bg-blue-600 hover:bg-blue-700 flex items-center gap-2'>
            <a href={replyHref(message)}>
              <Reply size={14} />
              Reply by email
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
