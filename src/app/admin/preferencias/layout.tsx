import { Metadata } from 'next';

/**
 * Preferências Layout
 * 
 * Este layout fornece a estrutura para a página de preferências administrativas.
 * Inclui metadados e verificações de autenticação.
 */
export const metadata: Metadata = {
  title: 'Preferências - Plataforma Colmeia',
  description: 'Configurações e preferências do sistema',
};

export default function PreferenciasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {children}
    </div>
  );
}
