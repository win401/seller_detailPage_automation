"use client"

import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { CheckCircle2Icon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Global toast manager so `toast(...)` can be called from anywhere
 * (event handlers, non-component code), not just inside React components.
 */
export const toastManager = ToastPrimitive.createToastManager()

export function toast(title: string, options?: { description?: string; type?: string }) {
  return toastManager.add({ title, description: options?.description, type: options?.type })
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((t) => (
    <ToastPrimitive.Root
      key={t.id}
      toast={t}
      data-slot="toast"
      className={cn(
        "absolute right-0 bottom-0 left-0 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-sm items-center gap-2 rounded-xl border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg transition-all select-none",
        "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
        "data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0"
      )}
    >
      <CheckCircle2Icon className="size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <ToastPrimitive.Title className="font-medium" />
        <ToastPrimitive.Description className="text-xs text-muted-foreground" />
      </div>
      <ToastPrimitive.Close
        className="shrink-0 rounded-xs text-muted-foreground opacity-70 outline-none transition-opacity hover:opacity-100"
        aria-label="닫기"
      >
        <XIcon className="size-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}

function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-full max-w-sm flex-col items-center gap-2">
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

export { Toaster }
