import type React from "react"
import type { ReactNode } from "react"

interface GlassCardProps {
  children: ReactNode
  className?: string
  darkMode?: boolean
}

export function GlassCard({
  children,
  className = "",
  darkMode = false,
  ...props
}: GlassCardProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`relative group ${className}`} {...props}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
      <div
        className={`relative ${darkMode ? "bg-gray-900/90 text-white" : "bg-white/90 text-gray-800"} backdrop-blur-sm rounded-lg p-6 border ${darkMode ? "border-gray-700/20" : "border-white/20"} shadow-xl h-full`}
      >
        {children}
      </div>
    </div>
  )
}
