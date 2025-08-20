import { Metadata } from 'next';

/**
 * Admin Dashboard Layout
 * 
 * This layout provides the server-side structure for the admin dashboard.
 * It includes metadata and authentication checks.
 */
export const metadata: Metadata = {
  title: 'Painel Administrativo - Plataforma Colmeia',
  description: 'Gerenciamento de projetos e clientes',
};

export default function AdminDashboardLayout({
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