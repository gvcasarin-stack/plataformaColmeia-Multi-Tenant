"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface NavItemProps {
  href: string
  icon: LucideIcon
  title: string
  badge?: string | number
  disabled?: boolean
  external?: boolean
}

export function NavItem({
  href,
  icon: Icon,
  title,
  badge,
  disabled,
  external,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (disabled) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all",
          "opacity-60"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{title}</span>
      </div>
    )
  }

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-all hover:text-primary",
          "hover:bg-primary/10"
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{title}</span>
        {badge && (
          <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
            {badge}
          </span>
        )}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-foreground hover:bg-primary/10 hover:text-primary"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 transition-all",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
        )}
      />
      <span>{title}</span>
      {badge && (
        <span
          className={cn(
            "ml-auto flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-medium",
            isActive
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

interface NavSectionProps {
  title?: string
  children: React.ReactNode
}

export function NavSection({ title, children }: NavSectionProps) {
  return (
    <div className="px-3 py-2">
      {title && (
        <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

interface NavMenuProps {
  children: React.ReactNode
}

export function NavMenu({ children }: NavMenuProps) {
  return <nav className="space-y-2">{children}</nav>
}
