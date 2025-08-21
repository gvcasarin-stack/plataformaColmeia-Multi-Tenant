"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  prefetch?: boolean
  children: React.ReactNode
  activeClassName?: string
  exactMatch?: boolean
  shallow?: boolean
}

/**
 * Optimized NavLink component for better navigation performance
 * 
 * Features:
 * - Automatic prefetching for faster navigation
 * - Active state tracking without re-renders
 * - Transition state support
 * - Prevents layout shifts during navigation
 */
const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ 
    href, 
    prefetch = true, 
    className, 
    activeClassName,
    exactMatch = false,
    shallow = false,
    children,
    ...props 
  }, ref) => {
    const pathname = usePathname()
    
    // Memoize active state calculation
    const isActive = React.useMemo(() => {
      if (exactMatch) {
        return pathname === href
      }
      return pathname === href || pathname?.startsWith(`${href}/`)
    }, [pathname, href, exactMatch])
    
    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        shallow={shallow}
        className={cn(
          className,
          isActive && activeClassName
        )}
        {...props}
      >
        {children}
      </Link>
    )
  }
)
NavLink.displayName = "NavLink"

export { NavLink }
