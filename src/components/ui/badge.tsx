import * as React from "react"
import { cn } from "@/lib/utils"

// Define the variants without using class-variance-authority
const variants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground",
}

type VariantType = keyof typeof variants;

// Base styles that apply to all badges
const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: VariantType;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        baseStyles,
        variants[variant],
        className
      )} 
      {...props} 
    />
  )
}

// Export a function that returns the combined class names for use in other components
const badgeVariants = (options: { variant?: VariantType }) => {
  return cn(baseStyles, options.variant ? variants[options.variant] : variants.default)
}

export { Badge, badgeVariants }
