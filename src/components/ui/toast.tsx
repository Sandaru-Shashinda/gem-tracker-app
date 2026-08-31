import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"

import { ToastContext, type ToastOptions, type ToastVariant } from "@/hooks/useToast"

interface ToastItem {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current[id]
    if (timer) {
      clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const toast = useCallback(
    ({ title, description, variant = "success", duration = 4000 }: ToastOptions) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, title, description, variant }])
      if (duration > 0) {
        timers.current[id] = setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => {
      Object.values(pending).forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(<ToastViewport toasts={toasts} onDismiss={dismiss} />, document.body)}
    </ToastContext.Provider>
  )
}

/**
 * Sits above the dialog layer (z-50) so a toast raised from inside a modal — copying a
 * tester's findings, for one — is still the thing the eye lands on.
 */
function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: number) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div
      role='status'
      aria-live='polite'
      className='pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2'
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  )
}

const VARIANTS: Record<ToastVariant, { wrapper: string; icon: typeof CheckCircle2; tint: string }> =
  {
    success: {
      wrapper: "border-emerald-200 bg-white",
      icon: CheckCircle2,
      tint: "text-emerald-600",
    },
    error: { wrapper: "border-red-200 bg-white", icon: AlertCircle, tint: "text-red-600" },
    info: { wrapper: "border-slate-200 bg-white", icon: Info, tint: "text-slate-500" },
  }

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { wrapper, icon: Icon, tint } = VARIANTS[toast.variant]

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 ${wrapper}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tint}`} />
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-bold text-slate-900'>{toast.title}</p>
        {toast.description && (
          <p className='mt-0.5 text-xs leading-relaxed text-slate-600'>{toast.description}</p>
        )}
      </div>
      <button
        type='button'
        onClick={onDismiss}
        aria-label='Dismiss notification'
        className='shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600'
      >
        <X className='h-3.5 w-3.5' />
      </button>
    </div>
  )
}
