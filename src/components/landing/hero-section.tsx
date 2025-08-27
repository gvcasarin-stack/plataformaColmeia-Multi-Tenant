"use client"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { TechBackground } from "./tech-background"
import { CircuitPattern } from "./circuit-pattern"

export default function HeroSection() {
  const [mounted, setMounted] = useState(false)
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Remover qualquer instância anterior do script
    const existingScript = document.getElementById("vturb-script-hero")
    if (existingScript) {
      document.body.removeChild(existingScript)
    }

    // Carregar o script do player VTURB com um ID para referência
    const script = document.createElement("script")
    script.id = "vturb-script-hero"
    script.src =
      "https://scripts.converteai.net/068d8d22-b205-4211-8cde-5fd27a22efa0/players/681b49cd7d0049256a569f66/player.js"
    script.async = true
    script.defer = true
    script.onload = () => {
      if (process.env.NODE_ENV !== "production") console.log("Script VTURB carregado na hero section")
      setIsPlayerLoaded(true)
    }
    document.body.appendChild(script)

    return () => {
      // Limpar o script quando o componente for desmontado
      const scriptToRemove = document.getElementById("vturb-script-hero")
      if (scriptToRemove) {
        document.body.removeChild(scriptToRemove)
      }
    }
  }, [])

  return (
    <section className="w-full py-12 md:py-16 lg:py-20 xl:py-24 relative overflow-hidden">
      {mounted && <TechBackground variant="light" intensity="medium" />}

      <CircuitPattern className="top-20 right-10 opacity-30 rotate-12 scale-75" />
      <CircuitPattern className="bottom-20 left-10 opacity-30 -rotate-12 scale-75" color="text-green-200" />

      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-green-400 to-yellow-400"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_700px] items-center">
          <div className="flex flex-col justify-center space-y-4 order-1 lg:order-1">
            <div className="space-y-2">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100/80 text-blue-600 text-sm font-medium mb-2 backdrop-blur-sm border border-blue-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-600 mr-2 animate-pulse"></span>
                <span className="relative overflow-hidden">
                  {/* Versão mobile e desktop do texto */}
                  <span className="sm:hidden">Gestão de Projetos Fotovoltaicos</span>
                  <span className="hidden sm:inline animate-marquee whitespace-nowrap">
                    Gestão de Projetos Fotovoltaicos • Eficiência • Organização • Controle
                  </span>
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-blue-700">
                Sistema de Gerenciamento Fotovoltaico
              </h1>
              <p className="max-w-[600px] text-gray-700 md:text-xl mt-4">
                Tenha sua própria plataforma digital para organizar arquivos, automatizar notificações, gerar ordens de
                serviço profissionais e encantar seus clientes — tudo isso com mais agilidade, controle e credibilidade.
              </p>
            </div>

            {/* Botões apenas para desktop (lg e acima) */}
            <div className="hidden lg:flex flex-col gap-2 min-[400px]:flex-row mt-6">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 relative overflow-hidden group shadow-lg shadow-blue-500/20"
                asChild
              >
                <a href="#precos">
                  <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4 animate-pulse" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="relative overflow-hidden border-2 border-blue-500/20 hover:border-blue-500/40 shadow-lg text-gray-700 hover:text-blue-700"
                asChild
              >
                <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer">
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative">Agendar demonstração</span>
                </a>
              </Button>
            </div>
          </div>

          {/* Player de vídeo VTURB - tamanho aumentado para desktop */}
          <div className="flex items-center justify-center order-2 lg:order-2 mt-2 lg:mt-0">
            {/* Container com tamanho maior para desktop */}
            <div className="w-full max-w-[500px] lg:max-w-[600px] xl:max-w-[700px] aspect-video rounded-lg overflow-hidden shadow-lg">
              {/* Div para o player VTURB */}
              <div id="vid_681b49cd7d0049256a569f66" className="vturb-player"></div>

              {/* Loader enquanto o player não carrega */}
              {!isPlayerLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Botões apenas para mobile (abaixo de lg) */}
          <div className="flex lg:hidden flex-col sm:flex-row gap-2 order-3 mt-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 relative overflow-hidden group shadow-lg shadow-blue-500/20 w-full sm:w-auto"
              asChild
            >
              <a href="#precos">
                <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
                Começar agora
                <ArrowRight className="ml-2 h-4 w-4 animate-pulse" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="relative overflow-hidden border-2 border-blue-500/20 hover:border-blue-500/40 shadow-lg text-gray-700 hover:text-blue-700 w-full sm:w-auto"
              asChild
            >
              <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer">
                <span className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Agendar demonstração</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Transição sutil para a próxima seção */}
      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-b from-transparent to-white"></div>
    </section>
  )
}
