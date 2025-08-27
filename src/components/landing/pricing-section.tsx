"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export default function PricingSection() {
  const plans = [
    {
      name: "Básico",
      price: "299",
      description: "Ideal para empresas pequenas",
      features: [
        "30 projetos",
        "3GB de armazenamento",
        "10 usuários",
        "100 clientes",
        "Suporte por email"
      ],
      popular: false
    },
    {
      name: "Profissional",
      price: "399",
      description: "Perfeito para empresas em crescimento",
      features: [
        "100 projetos",
        "10GB de armazenamento",
        "50 usuários",
        "1.000 clientes",
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
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-gray-900 mb-4">
            Planos que cabem no seu bolso
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-600 md:text-xl">
            Comece com 7 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`rounded-xl border p-6 bg-white shadow-lg ${plan.popular ? 'border-blue-500 ring-1 ring-blue-100' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                {plan.popular && <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700">Mais popular</span>}
              </div>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-extrabold text-blue-600">R$ {plan.price}</span>
                <span className="text-gray-500">/mês</span>
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

              <Button asChild className="w-full">
                <a href="https://registro.gerenciamentofotovoltaico.com.br">Começar agora</a>
              </Button>

              <p className="text-center text-sm text-gray-500 mt-3">
                Tem dúvidas? <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Fale conosco</a>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
