import { useEffect, useRef, type ElementRef } from "react"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts, dismiss } = useToast()
  const viewportRef = useRef<ElementRef<typeof ToastViewport> | null>(null)

  useEffect(() => {
    if (!toasts.length) {
      return
    }

    const handleOutsidePress = (event: Event) => {
      const viewport = viewportRef.current
      if (!viewport || viewport.contains(event.target as Node)) {
        return
      }
      dismiss()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss()
      }
    }

    const options: AddEventListenerOptions = { capture: true }
    document.addEventListener("pointerdown", handleOutsidePress, options)
    document.addEventListener("mousedown", handleOutsidePress, options)
    document.addEventListener("touchstart", handleOutsidePress, options)
    document.addEventListener("keydown", handleKeyDown, options)

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePress, options)
      document.removeEventListener("mousedown", handleOutsidePress, options)
      document.removeEventListener("touchstart", handleOutsidePress, options)
      document.removeEventListener("keydown", handleKeyDown, options)
    }
  }, [dismiss, toasts.length])

  return (
    <ToastProvider duration={3000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport ref={viewportRef} />
    </ToastProvider>
  )
}
