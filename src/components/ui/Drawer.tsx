"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useCallback,
} from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

export const Drawer = forwardRef<HTMLDivElement, DrawerProps>(
  (
    {
      className,
      open,
      onClose,
      title,
      description,
      children,
      footer,
      size = "md",
      closeOnOverlayClick = true,
      closeOnEscape = true,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = useCallback(
      (event: KeyboardEvent) => {
        if (event.key === "Escape" && closeOnEscape) {
          onClose()
        }
      },
      [closeOnEscape, onClose]
    )

    useEffect(() => {
      if (open) {
        document.addEventListener("keydown", handleKeyDown)
        document.body.style.overflow = "hidden"
      }

      return () => {
        document.removeEventListener("keydown", handleKeyDown)
        document.body.style.overflow = ""
      }
    }, [open, handleKeyDown])

    return (
      <>
        {/* Overlay */}
        <div
          className={cn(
            "fixed top-0 bottom-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-500 ease-out",
            open ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Drawer */}
        <div
          ref={ref}
          className={cn(
            "fixed top-0 bottom-0 right-0 z-50 flex flex-col bg-white shadow-2xl w-full",
            "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            sizeStyles[size],
            open ? "translate-x-0" : "translate-x-full",
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "drawer-title" : undefined}
          {...props}
        >
          {/* Header */}
          {(title || description) && (
            <div className="flex items-start justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div>
                {title && (
                  <h2
                    id="drawer-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 -m-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Close button when no header */}
          {!title && !description && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 z-10"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 flex-shrink-0 bg-gray-50">
              {footer}
            </div>
          )}
        </div>
      </>
    )
  }
)

Drawer.displayName = "Drawer"

export default Drawer
