"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
}

const Switch = React.forwardRef<HTMLDivElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          checked ? "bg-teal-500" : "bg-gray-200 dark:bg-gray-700",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        onClick={handleClick}
        data-state={checked ? "checked" : "unchecked"}
        role="switch"
        aria-checked={checked}
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
          data-state={checked ? "checked" : "unchecked"}
        />
      </div>
    )
  }
)

Switch.displayName = "Switch"

export { Switch } 