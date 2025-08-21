import { Metadata } from 'next'
import { RegistrationForm } from '@/components/multi-tenant/RegistrationForm'

export const metadata: Metadata = {
  title: 'Criar Conta - SGF',
  description: 'Crie sua organização e comece seu trial gratuito de 7 dias',
}

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Criar Organização
          </h1>
          <p className="text-gray-600 text-lg">
            Comece seu trial gratuito de <strong>7 dias</strong>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Sem cartão de crédito • Acesso completo • Cancele a qualquer momento
          </p>
        </div>

        <RegistrationForm />
      </div>
    </div>
  )
}
