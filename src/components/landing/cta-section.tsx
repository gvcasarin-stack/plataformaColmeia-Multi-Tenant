"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import { GlassCard } from "./glass-card"

export default function CtaSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section ref={sectionRef} className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div
          className={`transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <GlassCard className="max-w-4xl mx-auto bg-white/10 border-white/20" darkMode={true}>
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-white sm:text-4xl md:text-5xl drop-shadow-md">
                  Transforme sua Gestão de Projetos. A partir de hoje.
                </h2>
                <div className="flex items-center justify-center space-x-2 pt-2 pb-4">
                  <span className="w-12 h-0.5 bg-white/60 rounded-full"></span>
                  <span className="w-3 h-3 rounded-full bg-white/60"></span>
                  <span className="w-12 h-0.5 bg-white/60 rounded-full"></span>
                </div>
                <div className="mx-auto max-w-[700px] text-white/90 md:text-xl drop-shadow-sm space-y-4 mb-10">
                  <p>
                    Deixe o caos das planilhas para trás. Com o SGF, você centraliza sua operação, acelera aprovações e eleva sua credibilidade no mercado.
                  </p>
                  <p>
                    A eficiência que você busca está a um clique de distância.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row mt-10">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 hover:scale-105 relative overflow-hidden group shadow-xl transition-all duration-300"
                  asChild
                >
                  <a href="#precos">
                    <span className="absolute top-0 left-0 w-full h-full bg-blue-50/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                    Começar agora
                    <ChevronRight className="ml-2 h-4 w-4 animate-pulse" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-blue-700 hover:scale-105 transition-all duration-300 shadow-xl"
                  asChild
                >
                  <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer">
                    Agendar demonstração
                  </a>
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  )
}
