export default function Footer() {
  return (
    <footer className="w-full py-12 bg-gray-900 text-white">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
          {/* Logo e descrição */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl font-bold">SGF</span>
            </div>
            <p className="text-gray-400 mb-4 max-w-md">
              Sistema de Gerenciamento Fotovoltaico - A plataforma completa para empresas de energia solar.
            </p>
            <div className="flex space-x-4">
              <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer" 
                 className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">WhatsApp</span>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links rápidos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li><a href="#funcionalidades" className="text-gray-400 hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#depoimentos" className="text-gray-400 hover:text-white transition-colors">Depoimentos</a></li>
              <li><a href="#precos" className="text-gray-400 hover:text-white transition-colors">Preços</a></li>
              <li><a href="#faq" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://wa.me/554899000387" target="_blank" rel="noopener noreferrer" 
                   className="text-gray-400 hover:text-white transition-colors">
                  WhatsApp: (48) 99000-387
                </a>
              </li>
              <li>
                <a href="https://registro.gerenciamentofotovoltaico.com.br" 
                   className="text-gray-400 hover:text-white transition-colors">
                  Criar conta gratuita
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            © 2024 Sistema de Gerenciamento Fotovoltaico. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-xs">
            Desenvolvido para empresas de energia solar
          </p>
        </div>
      </div>
    </footer>
  )
}
