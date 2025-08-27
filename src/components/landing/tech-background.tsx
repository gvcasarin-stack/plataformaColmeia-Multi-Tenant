"use client"

import type React from "react"

import { useEffect, useRef } from "react"

interface TechBackgroundProps {
  variant: "light" | "blue" | "dark"
  intensity?: "low" | "medium" | "high"
  className?: string
  showGrid?: boolean
  showParticles?: boolean
  showGlow?: boolean
}

export function TechBackground({
  variant = "light",
  intensity = "medium",
  className = "",
  showGrid = true,
  showParticles = true,
  showGlow = true,
}: TechBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Define colors based on variant
  const getColors = () => {
    switch (variant) {
      case "light":
        return {
          bg: "bg-gradient-to-b from-white to-blue-50",
          particleColor: "#3B82F6",
          lineColor: "rgba(59, 130, 246, 0.1)",
          gridColor: "rgba(59, 130, 246, 0.05)",
          glowColor: "rgba(59, 130, 246, 0.15)",
        }
      case "blue":
        return {
          bg: "bg-gradient-to-b from-blue-600 to-blue-700",
          particleColor: "#FFFFFF",
          lineColor: "rgba(255, 255, 255, 0.1)",
          gridColor: "rgba(255, 255, 255, 0.05)",
          glowColor: "rgba(255, 255, 255, 0.15)",
        }
      case "dark":
        return {
          bg: "bg-gradient-to-b from-gray-900 to-gray-950",
          particleColor: "#60A5FA",
          lineColor: "rgba(96, 165, 250, 0.1)",
          gridColor: "rgba(96, 165, 250, 0.05)",
          glowColor: "rgba(96, 165, 250, 0.15)",
        }
      default:
        return {
          bg: "bg-gradient-to-b from-white to-blue-50",
          particleColor: "#3B82F6",
          lineColor: "rgba(59, 130, 246, 0.1)",
          gridColor: "rgba(59, 130, 246, 0.05)",
          glowColor: "rgba(59, 130, 246, 0.15)",
        }
    }
  }

  // Define intensity settings
  const getIntensitySettings = () => {
    switch (intensity) {
      case "low":
        return {
          particleCount: 30,
          particleSize: 1.5,
          lineDistance: 100,
          lineWidth: 0.5,
        }
      case "medium":
        return {
          particleCount: 50,
          particleSize: 2,
          lineDistance: 150,
          lineWidth: 1,
        }
      case "high":
        return {
          particleCount: 80,
          particleSize: 2.5,
          lineDistance: 200,
          lineWidth: 1.5,
        }
      default:
        return {
          particleCount: 50,
          particleSize: 2,
          lineDistance: 150,
          lineWidth: 1,
        }
    }
  }

  const colors = getColors()
  const settings = getIntensitySettings()

  useEffect(() => {
    if (!showParticles) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("resize", resize)

    // Configuration
    const particleCount = settings.particleCount
    const particleSize = settings.particleSize
    const particleMinSpeed = 0.05
    const particleMaxSpeed = 0.2
    const particleColor = colors.particleColor
    const lineColor = colors.lineColor
    const lineDistance = settings.lineDistance
    const lineWidth = settings.lineWidth

    // Create particles
    const particles: {
      x: number
      y: number
      vx: number
      vy: number
    }[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() * (particleMaxSpeed - particleMinSpeed) + particleMinSpeed) * (Math.random() > 0.5 ? 1 : -1),
        vy: (Math.random() * (particleMaxSpeed - particleMinSpeed) + particleMinSpeed) * (Math.random() > 0.5 ? 1 : -1),
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      // Update and draw particles
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i]

        // Move particles
        p.x += p.vx
        p.y += p.vy

        // Bounce off edges
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        // Draw particle
        ctx.beginPath()
        ctx.arc(p.x, p.y, particleSize, 0, Math.PI * 2)
        ctx.fillStyle = particleColor
        ctx.fill()

        // Connect particles with lines
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j]
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < lineDistance) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = lineColor
            ctx.lineWidth = lineWidth * (1 - distance / lineDistance)
            ctx.stroke()
          }
        }
      }

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
    }
  }, [
    showParticles,
    colors.particleColor,
    colors.lineColor,
    settings.particleCount,
    settings.particleSize,
    settings.lineDistance,
    settings.lineWidth,
  ])

  return (
    <div className={`absolute inset-0 ${colors.bg} ${className}`}>
      {showGrid && (
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:4rem_4rem]"
          style={{ "--grid-color": colors.gridColor } as React.CSSProperties}
        ></div>
      )}

      {showGlow && (
        <>
          <div className="absolute top-0 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob"></div>
          <div className="absolute top-0 -right-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-40 left-20 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-[100px] opacity-10 animate-blob animation-delay-4000"></div>
        </>
      )}

      {showParticles && <canvas ref={canvasRef} className="absolute inset-0 z-0" />}
    </div>
  )
}
