import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentos Legais - Gerenciamento Fotovoltaico',
  description: 'Termos de uso, política de privacidade e documentos legais do sistema de gerenciamento fotovoltaico.',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gerenciamento Fotovoltaico
              </h1>
              <p className="text-gray-600 mt-1">Documentos Legais</p>
            </div>
            <a 
              href="https://gerenciamentofotovoltaico.com.br" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Voltar ao site
            </a>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          {children}
        </div>
      </main>
      
      <footer className="bg-gray-100 border-t mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} Gerenciamento Fotovoltaico. Todos os direitos reservados.</p>
          <p className="mt-2">
            Para dúvidas sobre estes documentos, entre em contato: 
            <a href="mailto:contato@gerenciamentofotovoltaico.com.br" className="text-blue-600 hover:underline ml-1">
              contato@gerenciamentofotovoltaico.com.br
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
