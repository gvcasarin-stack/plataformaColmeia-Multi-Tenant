import { devLog } from "@/lib/utils/productionLogger";

/**
 * Layout específico para a página de login do administrador
 * VERSÃO CORRIGIDA - Renderização limpa sem interferências
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Debug para confirmar que o layout correto está sendo usado
  devLog.log('🔑 [ADMIN-LOGIN-LAYOUT] Layout correto carregado - ACESSO LIVRE SEM AUTENTICAÇÃO');
  
  // Renderização completamente limpa
  return <>{children}</>;
}