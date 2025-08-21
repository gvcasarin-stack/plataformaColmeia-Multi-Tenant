"use client"

import Image from "next/image"

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={className}>
      <Image
        src="/logo.svg"
        alt="Colmeia Projetos"
        width={120}
        height={48}
        priority
      />
    </div>
  )
}
