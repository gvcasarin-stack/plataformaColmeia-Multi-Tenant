import { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'SGF - Sistema de Gerenciamento Fotovoltaico',
  description: 'Plataforma de gerenciamento de projetos fotovoltaicos',
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Este layout será usado para todos os subdomínios de tenant
  // A lógica específica de tenant será adicionada posteriormente via context
  
  return (
    <html lang="pt-BR">
      <body>
        {/* 
          TODO: Adicionar TenantProvider aqui quando implementar o context
          TODO: Adicionar dados da organização no header/layout
          TODO: Implementar verificações de trial/limites
        */}
        {children}
      </body>
    </html>
  )
}
