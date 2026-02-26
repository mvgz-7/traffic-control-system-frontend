"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

type ConfirmDialogProps = {
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  confirmClassName?: string
  cancelClassName?: string
}

export function ConfirmDialog({
  open,
  title = "Confirm",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  confirmClassName,
  cancelClassName,
}: ConfirmDialogProps) {
  

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
      if (e.key === "Enter") onConfirm()
    }
    document.addEventListener("keydown", handleKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKey)
      document.body.style.overflow = ""
    }
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-lg shadow-xl ring-1 ring-black/10">
        <div className="p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>

          <h3 className="mt-4 text-xl font-semibold">{title}</h3>
          {description ? <p className="mt-3 text-sm text-foreground dark:text-slate-300">{description}</p> : null}

          <div className="mt-6 flex justify-center gap-3">
            {/* Confirm (left) - customizable class */}
            <button
              className={confirmClassName ?? "px-4 py-2 rounded-md border-2 border-red-600 text-red-700 bg-white hover:bg-red-50 font-semibold text-sm"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>

            {/* Cancel (right) - customizable class */}
            <button
              className={cancelClassName ?? "px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 font-semibold text-sm"}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
