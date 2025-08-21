import { Metadata } from 'next'
import { RegistrationForm } from '@/components/multi-tenant/RegistrationForm'

export const metadata: Metadata = {
  title: 'Criar Conta - SGF',
  description: 'Crie sua organização e comece seu trial gratuito de 7 dias',
}

export default function RegistroPage() {
  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <p className="text-gray-600 text-lg">
          Comece seu trial gratuito de <strong>7 dias</strong>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Sem cartão de crédito • Acesso completo • Cancele a qualquer momento
        </p>
      </div>

      <RegistrationForm />
    </div>
  )
}
