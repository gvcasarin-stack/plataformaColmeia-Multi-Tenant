import Link from 'next/link'
import { Button } from '@/components/ui/button'


export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Organização não encontrada
        </h1>
        
        <p className="text-gray-600 mb-6">
          A organização que você está tentando acessar não existe ou foi desativada.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="https://registro.gerenciamentofotovoltaico.com.br">
              Criar Nova Organização
            </Link>
          </Button>
          
          <Button variant="outline" asChild className="w-full">
            <Link href="https://gerenciamentofotovoltaico.com.br">
              Voltar ao Site Principal
            </Link>
          </Button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Precisa de ajuda? Entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  )
}