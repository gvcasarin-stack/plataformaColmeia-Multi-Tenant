"use client"

import { useEffect, useRef, useState } from "react"
import { QuoteIcon } from "lucide-react"
import { GlassCard } from "./glass-card"
import { TechBackground } from "./tech-background"
import { CircuitPattern } from "./circuit-pattern"

export default function TestimonialsSection() {
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

  const testimonials = [
    {
      quote:
        "Eu tentava controlar tudo no Trello, planilhas, Google Drive... era uma bagunça. Depois que comecei a usar a plataforma, tudo ficou mais claro. Agora sei exatamente em que etapa cada projeto está, e ganho um tempão no dia a dia.",
      author: "Carlos Henrique",
      role: "Engenheiro Eletricista",
      avatar: "C.H.",
    },
    {
      quote:
        "Meus clientes logo perceberam a diferença. Com os documentos organizados e as notificações automáticas, tudo ficou mais claro e fácil de acompanhar. A comunicação melhorou muito e minha entrega ficou bem mais profissional.",
      author: "Fernanda Lopes",
      role: "Autônoma em Projetos Fotovoltaicos",
      avatar: "F.L.",
    },
    {
      quote:
        "Hoje eu sei exatamente o que está rolando em cada projeto, o que já foi pago, o que tá pendente... tudo em um só lugar. Isso me dá uma tranquilidade enorme. Sem falar que ficou muito mais fácil cobrar, acompanhar e entregar com qualidade.",
      author: "Rodrigo Mendes",
      role: "Gerente de Homologação",
      avatar: "R.M.",
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-16 lg:py-24 relative" id="depoimentos">
      <TechBackground variant="light" intensity="low" showParticles={false} />

      <CircuitPattern className="top-20 left-10 opacity-20 -rotate-12 scale-75" />
      <CircuitPattern className="bottom-20 right-10 opacity-20 rotate-12 scale-75" color="text-green-200" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-blue-100 to-green-100 px-4 py-1 text-sm text-blue-700 shadow-sm border border-blue-200/50">
              <span className="w-1 h-1 rounded-full bg-blue-700"></span>
              <span>Depoimentos</span>
              <span className="w-1 h-1 rounded-full bg-blue-700"></span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-800 drop-shadow-sm">
              O que nossos clientes dizem
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-green-600 mx-auto my-4 rounded-full"></div>
            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Veja como o SGF tem transformado a gestão de projetos fotovoltaicos para empresas de todos os tamanhos.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`transform transition-all duration-500 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <GlassCard className="h-full flex flex-col justify-between" style={{ minHeight: "380px" }}>
                <div>
                  <div className="mb-4">
                    <QuoteIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-gray-700 mb-6">{testimonial.quote}</p>
                </div>
                <div className="flex items-center gap-4 mt-auto">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{testimonial.author}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
