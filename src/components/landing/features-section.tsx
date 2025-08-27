"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Check } from "lucide-react"
import { ParallaxLayer } from "./parallax-layer"
import { TechBackground } from "./tech-background"
import { CircuitPattern } from "./circuit-pattern"

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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

  const features = [
    {
      title: "Gestão de Projetos Completa do início ao fim",
      description:
        "Acompanhe cada etapa — da concepção à homologação — com recursos que trazem clareza, controle e produtividade:",
      image: "/images/projetos-gestao.png",
      points: [
        "Dashboard intuitivo com visão geral de todos os projetos",
        "Acompanhamento de prazos e marcos importantes",
        "Histórico completo de alterações e atualizações",
        "Indicadores e métricas para controle total do desempenho dos projetos",
      ],
    },
    {
      title: "Comunicação Integrada e Centralizada",
      description:
        "Mantenha clientes, integradores e equipe sempre informados com um sistema de comunicação claro, ágil e organizado:",
      image: "/images/comunicacao-integrada.png",
      points: [
        "Notificações automáticas no app e por e-mail para atualizações em tempo real",
        "Área exclusiva para comentários e compartilhamento de documentos do projeto",
        "Histórico completo de interações e movimentações",
        "Registro de todas as mudanças de status dos projetos, etapa por etapa",
      ],
    },
    {
      title: "Gestão Financeira Integrada e Sem Complicação",
      description:
        "Emita ordens de serviço, acompanhe pagamentos e mantenha suas finanças sob controle com total profissionalismo:",
      image: "/images/gestao-financeira.png",
      points: [
        "Geração automática de ordens de serviço",
        "Acompanhamento de pagamentos e pendências em tempo real",
        "Relatórios financeiros completos e prontos para análise",
        "Transparência total sobre valores, prazos e status de pagamento",
      ],
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-16 lg:py-24 relative overflow-hidden" id="funcionalidades">
      <TechBackground variant="light" intensity="low" className="bg-gradient-to-b from-blue-50 to-white" />

      <CircuitPattern className="top-20 right-10 opacity-20 rotate-12 scale-75" />
      <CircuitPattern className="bottom-20 left-10 opacity-20 -rotate-12 scale-75" color="text-green-200" />

      <ParallaxLayer speed={0.1} className="absolute top-0 right-0 w-96 h-96 opacity-10">
        <svg
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-blue-500 fill-current"
        >
          <path
            d="M44.5,-76.3C59.1,-69.3,73.2,-59.9,81.6,-46.4C90,-32.8,92.7,-15.1,89.8,1.7C86.9,18.4,78.4,34.8,67.5,47.9C56.5,61,43.2,70.8,28.5,76.3C13.8,81.8,-2.2,83,-17.6,79.5C-33,76,-47.8,67.8,-58.8,56.2C-69.7,44.7,-76.9,29.8,-79.4,13.9C-81.9,-2,-79.8,-18.9,-73.2,-33.9C-66.6,-48.9,-55.5,-62,-42.1,-69.5C-28.7,-77,-14.3,-78.8,0.5,-79.7C15.4,-80.5,30.8,-83.3,44.5,-76.3Z"
            transform="translate(100 100)"
          />
        </svg>
      </ParallaxLayer>

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-blue-100 to-green-100 px-4 py-1 text-sm text-blue-700 shadow-sm border border-blue-200/50 mb-4">
            <span className="w-1 h-1 rounded-full bg-blue-700"></span>
            <span>Funcionalidades</span>
            <span className="w-1 h-1 rounded-full bg-blue-700"></span>
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl relative inline-block text-gray-800 drop-shadow-sm">
              Tudo o que você precisa em um só lugar
            </h2>
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto my-4 rounded-full"></div>
            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Conheça as principais funcionalidades que tornam o SGF a solução ideal para o gerenciamento de projetos
              fotovoltaicos.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16">
          <div className="space-y-16 mt-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`transform transition-all duration-500 ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <div className="grid gap-8 lg:grid-cols-2 items-center">
                  <div className={`${index % 2 === 0 ? "order-1" : "order-1 lg:order-2"}`}>
                    <div className="space-y-4">
                      <div className="inline-flex items-center space-x-2">
                        <span className="w-8 h-0.5 bg-blue-500"></span>
                        <span className="text-blue-600 font-medium">0{index + 1}</span>
                      </div>
                      <h3 className="text-2xl font-bold tracking-tighter sm:text-3xl text-gray-800">{feature.title}</h3>
                      <p className="text-gray-600 md:text-lg/relaxed">{feature.description}</p>
                      <ul className="grid gap-3 mt-6">
                        {feature.points.map((point, pointIndex) => (
                          <li key={pointIndex} className="flex items-start gap-2">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 mt-0.5">
                              <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-gray-700">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={`${index % 2 === 0 ? "order-2" : "order-2 lg:order-1"}`}>
                    <div className="relative bg-gray-800 rounded-xl p-2 pt-1 shadow-2xl overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex space-x-1.5 ml-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="w-20 h-1 rounded-full bg-gray-700"></div>
                        <div className="w-4 h-4 mr-1"></div>
                      </div>

                      <div className="relative rounded-md overflow-hidden bg-white">
                        <div className="relative w-full" style={{ paddingTop: "60%" }}>
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <div className="text-center p-4">
                              <div className="w-16 h-16 bg-blue-500 rounded-lg mx-auto mb-3 flex items-center justify-center">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <h4 className="font-semibold text-gray-800 mb-1">SGF Dashboard</h4>
                              <p className="text-sm text-gray-600">Interface de Gestão</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {index < features.length - 1 && (
                  <div className="w-full flex justify-center mt-12">
                    <div className="w-16 h-0.5 bg-gradient-to-r from-blue-300 to-green-300 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
