import { createContext, useContext } from "react"

export type ToastVariant = "success" | "error" | "info"

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  /** Milliseconds before it dismisses itself. 0 keeps it up until it is closed. */
  duration?: number
}

/**
 * Defaults to a no-op rather than throwing: a missing provider should cost the user a
 * confirmation message, not the screen they were working on.
 */
export const ToastContext = createContext<(options: ToastOptions) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}
