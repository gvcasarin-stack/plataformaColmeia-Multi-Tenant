"use client"

import { useEffect, useRef, useState } from "react"
import { FileStack, Sun, Bell, Calendar, Receipt, Network } from "lucide-react"

export default function BenefitsSection() {
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

  const benefits = [
    {
      icon: <FileStack className="h-10 w-10 text-white" />,
      title: "Chega de links bagunçados e pastas soltas",
      description: "Centralize documentos e histórico em um portal profissional, eliminando o caos de links e pastas no WhatsApp.",
      delay: 0,
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      borderColor: "border-blue-200 hover:border-blue-500",
      highlightWords: ["portal profissional", "caos de links e pastas"],
    },
    {
      icon: <Sun className="h-10 w-10 text-white" />,
      title: "Sistema específico para gestão de homologação fotovoltaica",
      description: "Plataforma desenhada para o fluxo solar: do gerenciamento de documentos técnicos ao controle financeiro.",
      delay: 100,
      iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
      borderColor: "border-cyan-200 hover:border-cyan-500",
      highlightWords: ["fluxo solar", "documentos técnicos", "controle financeiro"],
    },
    {
      icon: <Bell className="h-10 w-10 text-white" />,
      title: "Responda às perguntas do seu cliente. Antes mesmo que ele precise perguntar",
      description: "Mantenha o integrador informado automaticamente sobre cada avanço do protocolo, reduzindo mensagens de suporte.",
      delay: 200,
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      borderColor: "border-green-200 hover:border-green-500",
      highlightWords: ["integrador informado automaticamente", "reduzindo mensagens de suporte"],
    },
    {
      icon: <Calendar className="h-10 w-10 text-white" />,
      title: "Troque a incerteza das planilhas pela previsibilidade de um cronograma inteligente",
      description: "Tenha uma visão clara das etapas concluídas e dos próximos prazos, garantindo entregas rigorosas.",
      delay: 300,
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      borderColor: "border-purple-200 hover:border-purple-500",
      highlightWords: ["visão clara", "entregas rigorosas"],
    },
    {
      icon: <Receipt className="h-10 w-10 text-white" />,
      title: "Receba pagamentos mais rápido e sem complicação",
      description: "Gere cobranças profissionais com um clique e acompanhe a saúde do seu fluxo de caixa em tempo real.",
      delay: 400,
      iconBg: "bg-gradient-to-br from-orange-500 to-orange-600",
      borderColor: "border-orange-200 hover:border-orange-500",
      highlightWords: ["cobranças profissionais", "fluxo de caixa em tempo real"],
    },
    {
      icon: <Network className="h-10 w-10 text-white" />,
      title: "Alinhe sua equipe. Garanta a satisfação do cliente",
      description: "Centralize a comunicação interna e externa, conectando sua equipe e clientes de forma inteligente e rastreável.",
      delay: 500,
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      borderColor: "border-indigo-200 hover:border-indigo-500",
      highlightWords: ["comunicação interna e externa", "inteligente e rastreável"],
    },
  ]

  const highlightText = (text: string, highlights: string[]) => {
    let result = text
    highlights.forEach((highlight) => {
      const regex = new RegExp(`(${highlight})`, 'gi')
      result = result.replace(regex, '<strong>$1</strong>')
    })
    return result
  }

  return (
    <section id="beneficios" ref={sectionRef} className="w-full py-12 md:py-16 lg:py-20 bg-white relative">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-4">
            A <span className="text-blue-600 font-bold">infraestrutura digital</span> completa para sua Engenharia
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
            Substitua planilhas e processos manuais por um sistema <span className="text-blue-600 font-bold">desenvolvido para o fluxo da homologação</span>. Ganhe agilidade nas aprovações e transmita máxima credibilidade aos seus parceiros.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`group relative p-6 rounded-xl bg-white border-2 ${benefit.borderColor} shadow-sm hover:shadow-xl transition-all duration-300 transform ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{
                transitionDelay: isVisible ? `${benefit.delay}ms` : "0ms",
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-xl ${benefit.iconBg} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                  {benefit.icon}
                </div>
                <p
                  className="text-gray-700 text-base leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(benefit.description, benefit.highlightWords)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
