import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Empresa não encontrada - SGF',
  description: 'A empresa solicitada não foi encontrada',
}

export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Ícone de erro */}
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Empresa não encontrada
          </h1>

          {/* Descrição */}
          <p className="text-gray-600 mb-6">
            A empresa que você está tentando acessar não foi encontrada ou não está mais ativa.
          </p>

          {/* Possíveis causas */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Possíveis causas:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• URL digitada incorretamente</li>
              <li>• Empresa ainda não foi criada</li>
              <li>• Conta foi suspensa ou cancelada</li>
              <li>• Link antigo ou expirado</li>
            </ul>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <a
              href="https://gerenciamentofotovoltaico.com.br"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Ir para o site principal
            </a>
            
            <a
              href="https://registro.gerenciamentofotovoltaico.com.br"
              className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors inline-block"
            >
              Criar nova conta
            </a>
          </div>

          {/* Suporte */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-2">
              Precisa de ajuda?
            </p>
            <a 
              href="mailto:suporte@gerenciamentofotovoltaico.com.br"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              suporte@gerenciamentofotovoltaico.com.br
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
