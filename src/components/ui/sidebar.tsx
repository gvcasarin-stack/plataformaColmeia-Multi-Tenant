"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SidebarContextValue {
  state: "expanded" | "collapsed"
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  state: "expanded",
  toggleSidebar: () => {},
})

interface SidebarProviderProps {
  children: React.ReactNode
  defaultCollapsed?: boolean
}

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const [state, setState] = React.useState<"expanded" | "collapsed">(
    defaultCollapsed ? "collapsed" : "expanded"
  )

  const toggleSidebar = React.useCallback(() => {
    setState((prev) => (prev === "expanded" ? "collapsed" : "expanded"))
  }, [])

  return (
    <SidebarContext.Provider value={{ state, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => React.useContext(SidebarContext)

export function Sidebar({
  children,
  className,
  collapsible = false,
}: {
  children: React.ReactNode
  className?: string
  collapsible?: boolean | "icon"
}) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed" && collapsible

  return (
    <aside
      className={cn(
        "flex flex-col h-screen",
        isCollapsed ? "w-[80px]" : "w-[280px]",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("", className)}>{children}</div>
}

export function SidebarContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex-1 overflow-auto", className)}>{children}</div>
}

export function SidebarFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("", className)}>{children}</div>
}

export function SidebarMenu({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <nav className={cn("", className)}>{children}</nav>
}

export function SidebarMenuItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("mb-1", className)}>{children}</div>
}

export function SidebarMenuButton({
  children,
  className,
  asChild = false,
}: {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}) {
  const Comp = asChild ? React.Fragment : "button"
  return <Comp className={cn("w-full", className)}>{children}</Comp>
}

export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("", className)}>{children}</div>
}
