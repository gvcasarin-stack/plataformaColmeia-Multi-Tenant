"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from "@/components/ui/glass-card"

interface DataPoint {
  label: string
  value: number
}

interface DataChartProps {
  title: string
  description?: string
  data: DataPoint[]
  className?: string
  height?: number
  showValues?: boolean
  showLabels?: boolean
  variant?: "bar" | "line" | "area"
}

export function DataChart({
  title,
  description,
  data,
  className,
  height = 200,
  showValues = true,
  showLabels = true,
  variant = "bar",
}: DataChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))
  const chartHeight = height - (showLabels ? 24 : 0)

  return (
    <GlassCard className={cn("overflow-hidden", className)}>
      <GlassCardHeader>
        <GlassCardTitle>{title}</GlassCardTitle>
        {description && <GlassCardDescription>{description}</GlassCardDescription>}
      </GlassCardHeader>
      <GlassCardContent>
        <div
          className="w-full"
          style={{ height: `${height}px` }}
        >
          <div className="flex h-full items-end gap-2">
            {data.map((point, i) => {
              const percentage = (point.value / maxValue) * 100
              return (
                <div
                  key={i}
                  className="group relative flex flex-1 flex-col items-center"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:block group-hover:opacity-100">
                    {point.label}: {point.value}
                  </div>
                  
                  {/* Chart element */}
                  <div className="relative w-full">
                    {variant === "bar" && (
                      <div
                        className="w-full rounded-t-sm bg-primary transition-all hover:opacity-80"
                        style={{
                          height: `${Math.max(percentage, 1)}%`,
                          maxHeight: `${chartHeight}px`,
                        }}
                      />
                    )}
                    
                    {variant === "line" && (
                      <div
                        className="absolute bottom-0 h-2 w-2 rounded-full bg-primary"
                        style={{
                          bottom: `${percentage}%`,
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      />
                    )}
                    
                    {variant === "area" && (
                      <div
                        className="w-full rounded-t-sm bg-primary/20 transition-all hover:bg-primary/30"
                        style={{
                          height: `${Math.max(percentage, 1)}%`,
                          maxHeight: `${chartHeight}px`,
                        }}
                      >
                        <div
                          className="w-full rounded-t-sm bg-primary/50 transition-all"
                          style={{
                            height: "3px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Value */}
                  {showValues && (
                    <span className="mt-1 text-xs font-medium">{point.value}</span>
                  )}
                  
                  {/* Label */}
                  {showLabels && (
                    <span className="mt-1 text-xs text-muted-foreground truncate w-full text-center">
                      {point.label}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  )
}
