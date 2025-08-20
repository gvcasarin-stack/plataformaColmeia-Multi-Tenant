"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, defaultValue, value, onValueChange, ...props }, ref) => {
    const [selectedTab, setSelectedTab] = React.useState(value || defaultValue)

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedTab(value)
      }
    }, [value])

    const handleTabChange = React.useCallback(
      (newValue: string) => {
        if (value === undefined) {
          setSelectedTab(newValue)
        }
        onValueChange?.(newValue)
      },
      [onValueChange, value]
    )

    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
        data-selected-tab={selectedTab}
      />
    )
  }
)
Tabs.displayName = "Tabs"

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
          className
        )}
        {...props}
      />
    )
  }
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.selectedTab === value

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-white text-gray-950 shadow-sm dark:bg-gray-950 dark:text-gray-50"
            : "hover:bg-white/50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100",
          className
        )}
        onClick={() => context?.onTabChange(value)}
        data-state={isActive ? "active" : "inactive"}
        {...props}
      />
    )
  }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext)
    const isActive = context?.selectedTab === value

    if (!isActive) return null

    return (
      <div
        ref={ref}
        className={cn(
          "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 dark:ring-offset-gray-950 dark:focus-visible:ring-gray-300",
          className
        )}
        data-state={isActive ? "active" : "inactive"}
        {...props}
      />
    )
  }
)
TabsContent.displayName = "TabsContent"

// Create a context to share the selected tab state
interface TabsContextValue {
  selectedTab: string | undefined
  onTabChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

// Provider component to wrap around Tabs
export const TabsProvider: React.FC<TabsProps & { children: React.ReactNode }> = ({
  defaultValue,
  value,
  onValueChange,
  children,
}) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue)

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value)
    }
  }, [value])

  const handleTabChange = React.useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setSelectedTab(newValue)
      }
      onValueChange?.(newValue)
    },
    [onValueChange, value]
  )

  return (
    <TabsContext.Provider
      value={{
        selectedTab,
        onTabChange: handleTabChange,
      }}
    >
      {children}
    </TabsContext.Provider>
  )
}

// Wrap the Tabs component to provide context
const TabsWithProvider = React.forwardRef<HTMLDivElement, TabsProps & { children: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    return (
      <TabsProvider {...props}>
        <Tabs ref={ref} {...props}>
          {children}
        </Tabs>
      </TabsProvider>
    )
  }
)
TabsWithProvider.displayName = "Tabs"

export { TabsWithProvider as Tabs, TabsList, TabsTrigger, TabsContent } 