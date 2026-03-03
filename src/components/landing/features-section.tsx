"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

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

  // Auto-play do carrossel
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % features.length)
      }, 6000) // 6 segundos por slide

      return () => clearInterval(interval)
    }
  }, [isPaused])

  const features = [
    {
      title: (
        <>
          Controle Total do <span className="text-blue-600 font-bold">Ciclo de Homologação</span>
        </>
      ),
      description: "Tenha uma visão 360° da sua operação e elimine o risco de perder prazos críticos.",
      image: "/images/gestao-projetos-dashboard.png",
      points: [
        {
          title: "Identifique prioridades e visualize o status de cada protocolo instantaneamente.",
          subtitle: "Dashboard em Tempo Real"
        },
        {
          title: "Cronograma visual com alertas automáticos para garantir entregas rigorosas.",
          subtitle: "Gestão de Prazos Críticos"
        },
        {
          title: "Histórico completo de alterações para uma operação baseada em dados, não em achismos.",
          subtitle: "Rastreabilidade Técnica"
        },
      ],
    },
    {
      title: (
        <>
          Portal do Cliente: <span className="text-blue-600 font-bold">Profissionalismo</span> e Liberdade
        </>
      ),
      description: "Eleve o padrão do seu atendimento com um canal exclusivo que transmite total transparência aos seus parceiros.",
      image: "/images/portal-cliente-dashboard.png",
      points: [
        {
          title: "Seu cliente informado automaticamente sobre o avanço do projeto, antes mesmo de perguntar.",
          subtitle: "Notificações Proativas"
        },
        {
          title: "Ambiente profissional para troca de mensagens e acesso centralizado a documentos técnicos.",
          subtitle: "Portal de Colaboração"
        },
        {
          title: "Histórico inviolável de todas as interações e mudanças de status, evitando conflitos de comunicação.",
          subtitle: "Segurança e Registro"
        },
      ],
    },
    {
      title: (
        <>
          Gestão Financeira com <span className="text-blue-600 font-bold">Foco no Lucro</span>
        </>
      ),
      description: "Simplifique sua cobrança e tenha a visão estratégica necessária para o crescimento do seu escritório.",
      image: "/images/gestao-financeira.png",
      points: [
        {
          title: "Emita Ordens de Serviço padronizadas em um clique, eliminando erros e retrabalho manual.",
          subtitle: "Geração de O.S. Automática"
        },
        {
          title: "Saiba exatamente quanto e quando irá receber, com controle total de pagamentos e pendências.",
          subtitle: "Fluxo de Caixa em Tempo Real"
        },
        {
          title: "Relatórios visuais que transformam dados complexos em insights sobre a lucratividade real de cada projeto.",
          subtitle: "Inteligência e Rentabilidade"
        },
      ],
    },
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % features.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + features.length) % features.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <section ref={sectionRef} className="w-full py-8 md:py-16 lg:py-24 relative bg-slate-50/30" id="funcionalidades">
      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        {/* Cabeçalho da seção */}
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-slate-800">
              Gestão Especializada para <span className="text-blue-600 font-bold">Empresas de Homologação</span> Fotovoltaica
            </h2>
            <div className="w-20 h-0.5 bg-blue-600 mx-auto my-6 rounded-full"></div>
            <p className="mx-auto max-w-[900px] text-slate-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Domine cada etapa técnica e burocrática da sua operação com uma <span className="text-blue-600 font-bold">plataforma</span> desenhada exclusivamente para o fluxo de trabalho da engenharia fotovoltaica.
            </p>
          </div>
        </div>

        {/* Carrossel */}
        <div
          className="relative max-w-6xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Conteúdo do slide atual */}
          <div className="overflow-hidden">
            <div
              className={`transform transition-all duration-700 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
              }`}
            >
              {/* Título do slide */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center space-x-2 mb-4">
                  <span className="w-8 h-0.5 bg-blue-500"></span>
                  <span className="text-blue-600 font-medium">0{currentSlide + 1}</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tighter text-gray-800 mb-4">
                  {features[currentSlide].title}
                </h3>
                <p className="text-gray-600 md:text-lg max-w-3xl mx-auto">
                  {features[currentSlide].description}
                </p>
              </div>

              {/* Imagem centralizada */}
              <div className="mb-10">
                <div className="relative bg-gray-800 rounded-xl p-2 pt-1 shadow-2xl overflow-hidden max-w-4xl mx-auto">
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
                    <Image
                      src={features[currentSlide].image}
                      alt={`Funcionalidade ${currentSlide + 1} - ${features[currentSlide].title}`}
                      width={800}
                      height={480}
                      className="w-full h-auto object-contain"
                      priority={currentSlide === 0}
                    />
                  </div>
                </div>
              </div>

              {/* Benefícios abaixo da imagem */}
              <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                {features[currentSlide].points.map((point, pointIndex) => (
                  <div
                    key={pointIndex}
                    className="p-5 rounded-lg bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300"
                  >
                    <h4 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
                      <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                      {point.subtitle}
                    </h4>
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 mt-1 flex-shrink-0">
                        <Check className="h-3 w-3 text-blue-600" />
                      </div>
                      <p className="text-slate-700 leading-relaxed text-sm">{point.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Setas de navegação */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-blue-50 transition-all duration-300 group z-20"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 bg-white rounded-full p-3 shadow-lg hover:bg-blue-50 transition-all duration-300 group z-20"
            aria-label="Próximo slide"
          >
            <ChevronRight className="h-6 w-6 text-blue-600 group-hover:text-blue-700" />
          </button>

          {/* Indicadores (dots) */}
          <div className="flex justify-center gap-2 mt-10">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  currentSlide === index
                    ? "w-8 h-3 bg-blue-600"
                    : "w-3 h-3 bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
