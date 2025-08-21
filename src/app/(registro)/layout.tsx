import { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Registro - Sistema de Gerenciamento Fotovoltaico',
  description: 'Crie sua conta e comece seu trial gratuito de 7 dias',
}

export default function RegistroLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="min-h-screen flex flex-col">
          {/* Header simples para página de registro */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold text-gray-900">SGF</span>
                </div>
                <a 
                  href="https://gerenciamentofotovoltaico.com.br" 
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Voltar ao site principal
                </a>
              </div>
            </div>
          </header>

          {/* Conteúdo principal */}
          <main className="flex-1 flex items-center justify-center px-4 py-8">
            {children}
          </main>

          {/* Footer simples */}
          <footer className="bg-white border-t">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="text-center text-sm text-gray-600">
                <p>&copy; 2024 Sistema de Gerenciamento Fotovoltaico. Todos os direitos reservados.</p>
                <div className="mt-2 space-x-4">
                  <a href="#" className="hover:text-gray-900">Termos de Uso</a>
                  <a href="#" className="hover:text-gray-900">Política de Privacidade</a>
                  <a href="#" className="hover:text-gray-900">Suporte</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
