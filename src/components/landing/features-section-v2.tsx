"use client"

import { useEffect, useRef, useState } from "react"
import { LayoutDashboard, BellRing, FileOutput } from "lucide-react"
import Image from "next/image"

const features = [
  {
    icon: <LayoutDashboard className="h-5 w-5 text-blue-600" />,
    title: "Dashboard em Tempo Real",
    description:
      "Identifique prioridades e visualize o status de cada protocolo instantaneamente.",
  },
  {
    icon: <BellRing className="h-5 w-5 text-blue-600" />,
    title: "Notificações Proativas",
    description:
      "Seu cliente informado automaticamente sobre o avanço do projeto, antes mesmo de perguntar.",
  },
  {
    icon: <FileOutput className="h-5 w-5 text-blue-600" />,
    title: "Geração de O.S. Automática",
    description:
      "Emita Ordens de Serviço padronizadas em um clique, eliminando erros e retrabalho manual.",
  },
]

export default function FeaturesSectionV2() {
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
      { threshold: 0.15 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section
      id="funcionalidades"
      ref={sectionRef}
      className="w-full py-16 md:py-20 lg:py-24 bg-slate-50 relative overflow-hidden"
    >
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div
          className={`flex flex-col lg:flex-row items-center gap-12 lg:gap-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Mockup */}
          <div className="w-full lg:w-1/2">
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
              <Image
                src="/images/mockup-dashboard.png"
                alt="Dashboard do SGF - Sistema de Gerenciamento Fotovoltaico"
                width={800}
                height={500}
                className="w-full h-auto"
                priority={false}
              />
            </div>
          </div>

          {/* Texto e bullet points */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-[2.6rem] text-gray-900 mb-10 leading-tight">
              Engenharia não é apenas técnica,{" "}
              <span className="text-blue-600">é organização.</span>
            </h2>

            <div className="space-y-8">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`flex gap-4 transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
                  }`}
                  style={{
                    transitionDelay: isVisible ? `${300 + index * 200}ms` : "0ms",
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
