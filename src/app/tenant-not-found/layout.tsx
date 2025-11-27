import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Organização Não Encontrada - SGF',
  description: 'Este subdomínio não está cadastrado em nossa plataforma',
};

export default function TenantNotFoundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
