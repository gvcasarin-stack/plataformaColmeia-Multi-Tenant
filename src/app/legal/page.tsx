import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentos Legais - Gerenciamento Fotovoltaico',
  description: 'Acesse nossos termos de uso, política de privacidade e outros documentos legais.',
}

export default function LegalPage() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Documentos Legais</h1>
      
      <p className="text-gray-700 leading-relaxed mb-8">
        Aqui você encontra todos os documentos legais relacionados ao uso do sistema de Gerenciamento Fotovoltaico. 
        É importante que você leia e compreenda estes documentos antes de usar nosso serviço.
      </p>

      <div className="grid md:grid-cols-2 gap-6 not-prose">
        <Link 
          href="/legal/termos-de-uso"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Termos de Uso</h3>
              <p className="text-gray-600 text-sm">
                Condições e regras para uso da plataforma, incluindo direitos, deveres e limitações.
              </p>
              <span className="inline-block mt-3 text-blue-600 text-sm font-medium">
                Ler documento →
              </span>
            </div>
          </div>
        </Link>

        <Link 
          href="/legal/politica-de-privacidade"
          className="block bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Política de Privacidade</h3>
              <p className="text-gray-600 text-sm">
                Como coletamos, usamos e protegemos seus dados pessoais, em conformidade com a LGPD.
              </p>
              <span className="inline-block mt-3 text-green-600 text-sm font-medium">
                Ler documento →
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Importante</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Estes documentos são atualizados periodicamente. Recomendamos que você os revise 
                regularmente para se manter informado sobre mudanças em nossas políticas.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Precisa de Ajuda?</h2>
        <p className="text-gray-700 mb-4">
          Se você tem dúvidas sobre qualquer um destes documentos, entre em contato conosco:
        </p>
        <div className="bg-gray-50 rounded-lg p-4">
          <ul className="text-gray-700 space-y-1">
            <li><strong>Email geral:</strong> contato@gerenciamentofotovoltaico.com.br</li>
            <li><strong>Questões de privacidade:</strong> privacidade@gerenciamentofotovoltaico.com.br</li>
            <li><strong>Telefone:</strong> (11) 9999-9999</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
