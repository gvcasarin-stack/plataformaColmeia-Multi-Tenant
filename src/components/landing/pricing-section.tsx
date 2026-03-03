"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingSection() {
  const plans = [
    {
      name: "Básico",
      price: "199",
      subtitle: "Para iniciar",
      description: "Ideal para empresas pequenas",
      features: [
        "Gerencie até 60 projetos ativos",
        "Armazene milhares de documentos (10GB)",
        "Até 10 usuários na equipe",
        "Cadastre até 100 clientes",
        "Suporte por email"
      ],
      popular: false
    },
    {
      name: "Profissional",
      price: "349",
      subtitle: "Para crescer",
      description: "Perfeito para empresas em crescimento",
      features: [
        "Gerencie até 500 projetos ativos",
        "Armazenamento ampliado (100GB)",
        "Até 50 usuários na equipe",
        "Cadastre até 1.000 clientes",
        "Suporte prioritário",
        "Relatórios avançados"
      ],
      popular: true
    }
  ]

  return (
    <section id="precos" className="w-full py-12 md:py-16 lg:py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-slate-800 mb-4">
            Um Plano para Cada Fase do <span className="text-blue-600 font-bold">Seu Negócio</span>
          </h2>
          <p className="mx-auto max-w-[700px] text-slate-600 md:text-xl">
            Comece hoje com <span className="text-blue-600 font-bold">7 dias de teste gratuito</span>. Sem compromisso e sem a necessidade de cartão de crédito.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`rounded-xl border p-6 bg-white shadow-lg transition-all duration-300 ${plan.popular ? 'border-blue-500 ring-2 ring-blue-100 md:scale-105 shadow-2xl' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-blue-600 font-semibold mb-1">{plan.subtitle}</p>
                  <h3 className="text-2xl font-bold">{plan.name}</h3>
                </div>
                {plan.popular && <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 font-semibold">Mais popular</span>}
              </div>

              <div className="mb-4">
                <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 font-semibold">
                  7 dias grátis
                </span>
              </div>

              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-extrabold text-blue-600">R$ {plan.price}</span>
                <span className="text-gray-500 text-sm">/mês</span>
              </div>
              <p className="text-gray-600 mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                      <Check className="w-3 h-3 text-green-600" />
                    </span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button asChild className="w-full hover:scale-105 transition-all duration-300">
                <a href="https://registro.gerenciamentofotovoltaico.com.br">Começar teste grátis</a>
              </Button>

              <p className="text-center text-xs text-gray-500 mt-4">
                Cancele quando quiser • Sem fidelidade
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
