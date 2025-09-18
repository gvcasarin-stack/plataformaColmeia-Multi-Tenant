"use client"

import { useEffect, useRef, useState } from "react"
import { FolderOpen, LayoutGrid, Bell, Calendar, CreditCard, Users } from "lucide-react"

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
      icon: <FolderOpen className="h-10 w-10 text-blue-500" />,
      title: "Chega de links bagunçados e pastas soltas",
      description: "Organize seus projetos com profissionalismo e encante seus clientes.",
      delay: 0,
      bgColor: "bg-blue-50",
    },
    {
      icon: <LayoutGrid className="h-10 w-10 text-blue-400" />,
      title: "Trello não impressiona, assusta",
      description: "Simplifique sua rotina, ganhe agilidade e entregue mais valor ao seu cliente.",
      delay: 100,
      bgColor: "bg-blue-50",
    },
    {
      icon: <Bell className="h-10 w-10 text-green-500" />,
      title: "Cansado de responder as mesmas perguntas?",
      description: "Automatize notificações e mantenha seus clientes sempre informados.",
      delay: 200,
      bgColor: "bg-green-50",
    },
    {
      icon: <Calendar className="h-10 w-10 text-purple-500" />,
      title: "Pare de perder tempo com planilhas",
      description: "Gerencie cronogramas e acompanhe o progresso em tempo real.",
      delay: 300,
      bgColor: "bg-purple-50",
    },
    {
      icon: <CreditCard className="h-10 w-10 text-orange-500" />,
      title: "Cobranças organizadas e profissionais",
      description: "Controle financeiro completo com relatórios detalhados.",
      delay: 400,
      bgColor: "bg-orange-50",
    },
    {
      icon: <Users className="h-10 w-10 text-indigo-500" />,
      title: "Equipe alinhada, cliente satisfeito",
      description: "Colaboração eficiente entre equipe e transparência total com o cliente.",
      delay: 500,
      bgColor: "bg-indigo-50",
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-12 md:py-16 lg:py-20 bg-white relative">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-4">
            Por que escolher o SGF?
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
            Com o SGF, você substitui planilhas e processos manuais por uma plataforma inteligente que garante controle total, agilidade nas aprovações e uma imagem profissional inquestionável.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`group relative p-6 rounded-lg ${benefit.bgColor} border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 transform ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{
                transitionDelay: isVisible ? `${benefit.delay}ms` : "0ms",
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 rounded-full bg-white shadow-md group-hover:scale-110 transition-transform duration-300">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
