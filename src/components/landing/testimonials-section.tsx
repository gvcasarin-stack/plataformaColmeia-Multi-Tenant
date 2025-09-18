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
        "A gente vivia pulando entre Trello, planilhas e Google Drive. Era uma bagunça que, honestamente, gerava atrasos. Com o SGF, a clareza foi imediata. Hoje, eu sei exatamente o status de cada projeto e o tempo que eu perdia tentando organizar tudo, agora uso para entregar mais qualidade ao cliente.",
      author: "Carlos Henrique",
      role: "Engenheiro Eletricista",
      avatar: "C.H.",
    },
    {
      quote:
        "O impacto no cliente foi imediato. A organização e as notificações trouxeram uma agilidade que eles valorizam muito. A comunicação deixou de ser um problema e passou a ser um ponto forte. Hoje, sinto que eles têm mais confiança no meu trabalho, e isso não tem preço.",
      author: "Fernanda Lopes",
      role: "Autônoma em Projetos Fotovoltaicos",
      avatar: "F.L.",
    },
    {
      quote:
        "Ter tudo em um só lugar mudou o jogo para mim. Hoje, em uma única tela, eu vejo o status de todos os projetos, quem pagou, quem está devendo. Acabou a ansiedade de não saber o que está acontecendo. Essa clareza me deu uma tranquilidade enorme e simplificou todo o resto: da cobrança à entrega final.",
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
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-slate-800">
              A Opinião de Quem Lidera o Mercado Fotovoltaico
            </h2>
            <div className="w-20 h-0.5 bg-blue-600 mx-auto my-6 rounded-full"></div>
            <p className="max-w-[800px] text-slate-600 md:text-xl/relaxed leading-relaxed">
              Líderes de projetos, engenheiros e diretores compartilham como o SGF se tornou uma peça-chave para otimizar suas operações e impulsionar o crescimento.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 mt-16">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`transform transition-all duration-700 hover:scale-105 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="h-full">
                <div className="h-full flex flex-col justify-between p-6 bg-white rounded-lg border border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 shadow-sm" style={{ minHeight: "380px" }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <QuoteIcon className="h-8 w-8 text-blue-500" />
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        ))}
                      </div>
                    </div>
                    <blockquote className="text-slate-700 text-base leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                  </div>
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{testimonial.author}</h4>
                      <p className="text-slate-500 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
