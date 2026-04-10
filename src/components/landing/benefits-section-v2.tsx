"use client"

import { useEffect, useRef, useState } from "react"
import { FileStack, MousePointerClick, Bell } from "lucide-react"

const benefits = [
  {
    icon: <FileStack className="h-10 w-10 text-white" />,
    title: "Gestão de Documentos",
    description:
      "Centralize diagramas e documentos em um só lugar, elimine o extravio de links e grupos no WhatsApp.",
    delay: 0,
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    borderColor: "border-blue-200 hover:border-blue-500",
  },
  {
    icon: <MousePointerClick className="h-10 w-10 text-white" />,
    title: "Workflow Automatizado",
    description:
      "Gere o projeto completo para o seu cliente com apenas 1 clic. Antes você levava horas, agora, segundos para gerar um projeto completo.",
    delay: 150,
    iconBg: "bg-gradient-to-br from-cyan-500 to-blue-600",
    borderColor: "border-cyan-200 hover:border-cyan-500",
  },
  {
    icon: <Bell className="h-10 w-10 text-white" />,
    title: "Alertas Inteligentes",
    description:
      "Notificações automáticas via plataforma e e-mail para integradores, informando automaticamente os status e reduzindo tempo de suporte.",
    delay: 300,
    iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
    borderColor: "border-green-200 hover:border-green-500",
  },
]

export default function BenefitsSectionV2() {
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
    <section id="beneficios" ref={sectionRef} className="w-full py-12 md:py-16 lg:py-20 bg-white relative">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-4">
            A <span className="text-blue-600 font-bold">infraestrutura digital</span> completa para sua Engenharia
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
            Substitua planilhas e processos manuais por um sistema{" "}
            <span className="text-blue-600 font-bold">desenvolvido para o fluxo da homologação</span>. Ganhe
            agilidade nas aprovações e transmita máxima credibilidade aos seus parceiros.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`group relative p-8 rounded-xl bg-white border-2 ${benefit.borderColor} shadow-sm hover:shadow-xl transition-all duration-300 transform ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
              style={{
                transitionDelay: isVisible ? `${benefit.delay}ms` : "0ms",
              }}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div
                  className={`p-4 rounded-xl ${benefit.iconBg} shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}
                >
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{benefit.title}</h3>
                <p className="text-gray-600 text-base leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
