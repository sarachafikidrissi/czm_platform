import * as React from "react"
import { Toast, ToastProps } from "@/components/ui/toast"

export type ToastVariant = "default" | "success" | "warning" | "error" | "info"

export interface ToastData extends Omit<ToastProps, "onClose"> {
  id: string
}

interface ToastContextType {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, "id">) => void
  removeToast: (id: string) => void
  showToast: (
    title: string,
    message?: string,
    variant?: ToastVariant,
    options?: { duration?: number; dedupeKey?: string }
  ) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

function defaultDurationForVariant(variant: ToastVariant): number {
  if (variant === "success") return 3000
  if (variant === "warning" || variant === "error") return 5000
  return 5000
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([])
  const lastDedupeKeyRef = React.useRef<string | null>(null)
  const lastDedupeIdRef = React.useRef<string | null>(null)

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }, [])

  const showToast = React.useCallback(
    (
      title: string,
      message?: string,
      variant: ToastVariant = "info",
      options?: { duration?: number; dedupeKey?: string }
    ) => {
      const duration = options?.duration ?? defaultDurationForVariant(variant)
      const dedupeKey =
        options?.dedupeKey ?? `${variant}|${title}|${message ?? ""}`

      if (lastDedupeKeyRef.current === dedupeKey && lastDedupeIdRef.current) {
        removeToast(lastDedupeIdRef.current)
      }

      const id = Math.random().toString(36).substring(2, 9)
      lastDedupeKeyRef.current = dedupeKey
      lastDedupeIdRef.current = id

      setToasts((prev) => [...prev, { title, message, variant, duration, id }])
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: ToastData[]
  removeToast: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-md">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

