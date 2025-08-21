// Configuração básica do Supabase
// Este arquivo centraliza a configuração para consistência

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
};

// Função helper para verificar se as variáveis estão configuradas
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Função para exibir instruções de configuração
export function getConfigurationInstructions(): string {
  return `
Para configurar o Supabase:

1. Acesse https://supabase.com/dashboard
2. Crie um novo projeto ou acesse um existente
3. Vá para Settings > API
4. Copie as seguintes informações para seu arquivo .env.local:

NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

Depois reinicie o servidor de desenvolvimento.
`;
}
