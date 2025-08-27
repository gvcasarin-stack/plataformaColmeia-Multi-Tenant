"use client"

import { useEffect, useRef } from "react"
import type { ReactNode } from "react"

interface ParallaxLayerProps {
  children: ReactNode
  speed: number
  className?: string
}

export function ParallaxLayer({ children, speed, className = "" }: ParallaxLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const layer = layerRef.current
      if (!layer) return

      const scrollY = window.scrollY
      const yPos = scrollY * speed
      layer.style.transform = `translateY(${yPos}px)`
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [speed])

  return (
    <div ref={layerRef} className={`will-change-transform ${className}`}>
      {children}
    </div>
  )
}
