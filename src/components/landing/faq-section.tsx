"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { TechBackground } from "./tech-background"
import { CircuitPattern } from "./circuit-pattern"

interface FaqItemProps {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
  delay: number
  isVisible: boolean
}

function FaqItem({ question, answer, isOpen, onClick, delay, isVisible }: FaqItemProps) {
  return (
    <div
      className={`border-b border-gray-200 last:border-0 transform transition-all duration-500 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <button
        onClick={onClick}
        className="flex justify-between items-center w-full py-4 text-left font-medium text-gray-800 hover:text-blue-600 transition-colors"
      >
        <span className="text-lg">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-blue-500 transition-transform duration-300 ${isOpen ? "transform rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-96 opacity-100 pb-6" : "max-h-0 opacity-0"
        }`}
      >
        <p className="text-gray-600">{answer}</p>
      </div>
    </div>
  )
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(-1)
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

  const faqs = [
    {
      question: "O que é o Sistema de Gerenciamento Fotovoltaico?",
      answer:
        "O Sistema de Gerenciamento Fotovoltaico (SGF) é uma plataforma digital completa desenvolvida especificamente para empresas e profissionais do setor de energia solar. Ele centraliza e organiza todos os aspectos dos seus projetos fotovoltaicos, desde a concepção até a homologação, incluindo gestão de documentos, comunicação com clientes, cronogramas, ordens de serviço e muito mais.",
    },
    {
      question: "Quais são os principais benefícios do SGF?",
      answer:
        "O SGF oferece diversos benefícios, como organização centralizada de arquivos e documentos, automação de notificações para manter todos informados, geração de ordens de serviço profissionais, acompanhamento em tempo real do progresso dos projetos, gestão financeira integrada e personalização completa com a identidade visual da sua empresa. Tudo isso resulta em mais agilidade, controle e credibilidade para o seu negócio.",
    },
    {
      question: "Quem pode utilizar o Sistema de Gerenciamento Fotovoltaico?",
      answer:
        "O SGF foi desenvolvido para atender diversos perfis do setor fotovoltaico, como engenheiros eletricistas autônomos, empresas de homologação de projetos, integradores solares, empresas de terceirização de projetos e qualquer profissional ou empresa que trabalhe com projetos fotovoltaicos, subestações, padrões de entrada e serviços relacionados.",
    },
    {
      question: "É necessário instalar algum software para utilizar o SGF?",
      answer:
        "Não. O SGF é uma plataforma baseada em nuvem (cloud), o que significa que você pode acessá-la de qualquer dispositivo com conexão à internet, seja computador, tablet ou smartphone, sem necessidade de instalação. Basta fazer login no sistema através do seu navegador para ter acesso a todas as funcionalidades.",
    },
    {
      question: "Como funciona a personalização com a identidade da minha empresa?",
      answer:
        "O SGF permite que você utilize seu próprio domínio (www.suaempresa.com.br) e personalize toda a plataforma com as cores, logotipo e identidade visual da sua empresa. Isso proporciona uma experiência mais profissional para seus clientes, que terão a impressão de estar utilizando um sistema desenvolvido exclusivamente para a sua empresa.",
    },
    {
      question: "Existe um limite de projetos ou usuários no sistema?",
      answer:
        "Oferecemos diferentes planos para atender às necessidades específicas de cada cliente. O plano Básico permite até 10 projetos ativos e 1 usuário, o plano Profissional suporta até 50 projetos e 5 usuários, enquanto o plano Empresarial oferece projetos e usuários ilimitados. Você pode escolher o plano que melhor se adapta ao tamanho e às necessidades do seu negócio.",
    },
  ]

  return (
    <section ref={sectionRef} className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden" id="faq">
      <TechBackground variant="light" intensity="low" showParticles={false} />

      <CircuitPattern className="top-20 left-10 opacity-20 -rotate-12 scale-75" />
      <CircuitPattern className="bottom-20 right-10 opacity-20 rotate-12 scale-75" color="text-green-200" />

      <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-7xl">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-blue-100 to-green-100 px-4 py-1 text-sm text-blue-700 shadow-sm border border-blue-200/50">
              <span className="w-1 h-1 rounded-full bg-blue-700"></span>
              <span>FAQ</span>
              <span className="w-1 h-1 rounded-full bg-blue-700"></span>
            </div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-800 drop-shadow-sm">
              Perguntas Frequentes
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-green-600 mx-auto my-4 rounded-full"></div>
            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Tire suas dúvidas sobre o Sistema de Gerenciamento Fotovoltaico
            </p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-6 md:p-8">
          {faqs.map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              delay={index * 100}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
