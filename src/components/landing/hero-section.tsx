"use client"
import { Button } from "@/components/ui/button"
import { ChevronRight, Zap } from "lucide-react"
import { useEffect, useState } from "react"

// Declaração de tipo para o Web Component VTURB
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'vturb-smartplayer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        id?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export default function HeroSection() {
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false)

  useEffect(() => {
    // Remover qualquer instância anterior do script
    const existingScript = document.getElementById("vturb-script-hero")
    if (existingScript) {
      document.body.removeChild(existingScript)
    }

    // Carregar o script do player VTURB com um ID para referência
    const script = document.createElement("script")
    script.id = "vturb-script-hero"
    script.src =
      "https://scripts.converteai.net/068d8d22-b205-4211-8cde-5fd27a22efa0/players/68f627a74b986c64f63e492b/v4/player.js"
    script.async = true
    script.onload = () => {
      if (process.env.NODE_ENV !== "production") console.log("Script VTURB carregado na hero section")
      setIsPlayerLoaded(true)
    }
    document.head.appendChild(script)

    return () => {
      // Limpar o script quando o componente for desmontado
      const scriptToRemove = document.getElementById("vturb-script-hero")
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove)
      }
    }
  }, [])

  return (
    <section className="w-full py-8 md:py-10 lg:py-12 xl:py-16 relative overflow-hidden bg-white">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl overflow-x-hidden">
        <div className="flex flex-col items-center text-center">
          {/* Título e Subtítulo Centralizados */}
          <div className="w-full max-w-4xl mb-12 space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100/80 text-blue-600 text-sm font-medium mb-3 backdrop-blur-sm border border-blue-200 shadow-sm">
              <Zap className="w-4 h-4 mr-2" />
              <span className="relative overflow-hidden">
                Sistema de Gestão para Escritórios de Homologação
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900 drop-shadow-sm">
              Profissionalize sua <span className="text-blue-600">Gestão de Homologações</span> e Projetos Fotovoltaicos
            </h1>
            <p className="mx-auto max-w-3xl text-gray-700 md:text-xl mt-10 leading-relaxed">
              Centralize projetos, documentos e financeiro em um só lugar. <span className="text-blue-600 font-bold">Elimine a perda de prazos e o extravio de arquivos.</span> Tenha controle total da sua operação em tempo real e entregue um portal do cliente profissional aos integradores.
            </p>
          </div>

          {/* Player de vídeo VTURB - Centralizado e em tamanho grande */}
          <div className="w-full max-w-4xl mb-12">
            {/* Container com borda gradiente */}
            <div className="p-1 rounded-2xl bg-gradient-to-r from-blue-400 via-green-400 to-blue-600 shadow-2xl">
              <div className="w-full rounded-xl bg-white relative overflow-hidden">
                {/* Player VTURB usando Web Component */}
                <vturb-smartplayer
                  id="vid-68f627a74b986c64f63e492b"
                  style={{ display: 'block', margin: '0 auto', width: '100%', aspectRatio: '16/9' }}
                ></vturb-smartplayer>

                {/* Loader enquanto o player não carrega */}
                {!isPlayerLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Botões CTA - Centralizados abaixo do vídeo */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center overflow-hidden w-full max-w-2xl mx-auto">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg px-8 py-6 text-lg transition-all duration-300"
              asChild
            >
              <a href="#precos">
                Começar agora
                <ChevronRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-slate-300 hover:border-blue-300 text-slate-700 hover:text-blue-700 hover:scale-105 bg-white px-8 py-6 text-lg transition-all duration-300"
              asChild
            >
              <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer">
                <span className="relative">Agendar demonstração</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
