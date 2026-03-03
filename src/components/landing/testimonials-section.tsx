"use client"

import { useEffect, useRef, useState } from "react"
import { QuoteIcon } from "lucide-react"

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
      borderColor: "border-t-blue-500",
      accentColor: "text-blue-500",
      bgColor: "bg-blue-600",
      dotColor: "bg-blue-400",
    },
    {
      quote:
        "O impacto no cliente foi imediato. A organização e as notificações trouxeram uma agilidade que eles valorizam muito. A comunicação deixou de ser um problema e passou a ser um ponto forte. Hoje, sinto que eles têm mais confiança no meu trabalho, e isso não tem preço.",
      author: "Fernanda Lopes",
      role: "Autônoma em Projetos Fotovoltaicos",
      avatar: "F.L.",
      borderColor: "border-t-green-500",
      accentColor: "text-green-500",
      bgColor: "bg-green-600",
      dotColor: "bg-green-400",
    },
    {
      quote:
        "Ter tudo em um só lugar mudou o jogo para mim. Hoje, em uma única tela, eu vejo o status de todos os projetos, quem pagou, quem está devendo. Acabou a ansiedade de não saber o que está acontecendo. Essa clareza me deu uma tranquilidade enorme e simplificou todo o resto: da cobrança à entrega final.",
      author: "Rodrigo Mendes",
      role: "Gerente de Homologação",
      avatar: "R.M.",
      borderColor: "border-t-purple-500",
      accentColor: "text-purple-500",
      bgColor: "bg-purple-600",
      dotColor: "bg-purple-400",
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-16 lg:py-24 relative bg-white" id="depoimentos">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-slate-800">
              A Opinião de Quem <span className="text-blue-600 font-bold">Move o Mercado Fotovoltaico</span>
            </h2>
            <div className="w-20 h-0.5 bg-blue-600 mx-auto my-6 rounded-full"></div>
            <p className="max-w-[800px] text-slate-600 md:text-xl/relaxed leading-relaxed mx-auto">
              Veja como engenheiros e diretores utilizam o SGF para <span className="text-blue-600 font-bold">profissionalizar suas entregas</span>, garantir aprovações mais rápidas e escalar suas operações.
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
                <div className={`h-full flex flex-col justify-between p-6 bg-white rounded-lg border-t-4 border-x border-b border-slate-200 hover:shadow-lg transition-all duration-300 shadow-sm ${testimonial.borderColor}`} style={{ minHeight: "380px" }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <QuoteIcon className={`h-8 w-8 ${testimonial.accentColor}`} />
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${testimonial.dotColor}`}></div>
                        ))}
                      </div>
                    </div>
                    <blockquote className="text-slate-700 text-base leading-relaxed">
                      "{testimonial.quote}"
                    </blockquote>
                  </div>
                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
                    <div className={`w-12 h-12 rounded-full ${testimonial.bgColor} flex items-center justify-center text-white font-semibold text-sm`}>
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
