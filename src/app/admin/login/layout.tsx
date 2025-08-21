/**
 * Layout específico para a página de login do administrador
 * 
 * Este layout é minimalista e permite que a página de login ocupe 100% da tela,
 * sem as restrições do layout principal do admin (sem sidebar).
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
