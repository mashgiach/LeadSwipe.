"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Toast {
  id: string
  title: string
  description?: string
  type: "success" | "error" | "info" | "warning"
  action?: {
    label: string
    onClick: () => void
  }
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => string
  removeToast: (id: string) => void
  updateToast: (id: string, toast: Partial<Toast>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev, newToast])

    // Auto-dismiss toast after duration (default: 5000ms)
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }

    return id
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  const updateToast = (id: string, toast: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return { ...t, ...toast }
        }
        return t
      }),
    )
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, updateToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn("flex items-center justify-between rounded-lg border p-4 shadow-md min-w-[300px] max-w-md", {
            "bg-green-50 border-green-200 text-green-800": toast.type === "success",
            "bg-red-50 border-red-200 text-red-800": toast.type === "error",
            "bg-blue-50 border-blue-200 text-blue-800": toast.type === "info",
            "bg-yellow-50 border-yellow-200 text-yellow-800": toast.type === "warning",
          })}
        >
          <div className="flex-1">
            <h4 className="font-medium">{toast.title}</h4>
            {toast.description && <p className="text-sm mt-1">{toast.description}</p>}
            {toast.action && (
              <Button
                variant="link"
                className={cn("p-0 h-auto text-sm mt-1", {
                  "text-green-700": toast.type === "success",
                  "text-red-700": toast.type === "error",
                  "text-blue-700": toast.type === "info",
                  "text-yellow-700": toast.type === "warning",
                })}
                onClick={() => {
                  toast.action?.onClick()
                  removeToast(toast.id)
                }}
              >
                {toast.action.label}
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => removeToast(toast.id)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
