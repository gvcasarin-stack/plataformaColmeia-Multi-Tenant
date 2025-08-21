# 🚀 Configuração do Sistema de Confirmação de Email com Supabase

Este documento contém todas as instruções necessárias para configurar o sistema de confirmação de email da plataforma.

## ✅ Status Atual

O sistema de confirmação de email está **IMPLEMENTADO** e **PRONTO PARA TESTES**. Apenas a configuração do Supabase é necessária.

## 🔧 Configuração Necessária

### 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em "New Project"
3. Escolha sua organização
4. Preencha os dados:
   - **Name**: `plataforma-colmeia`
   - **Database Password**: (escolha uma senha forte)
   - **Region**: `South America (São Paulo)` ou mais próxima
5. Clique em "Create new project"

### 2. Obter Chaves de API

1. No dashboard do projeto, vá para **Settings** → **API**
2. Copie as seguintes informações:
   - **URL**: Encontrada em "Project URL"
   - **anon/public key**: Encontrada em "Project API keys"
   - **service_role key**: Encontrada em "Project API keys" (🚨 **Manter em segredo!**)

### 3. Configurar Variáveis de Ambiente

1. Crie um arquivo `.env.local` na raiz do projeto:

\`\`\`bash
# Configuração do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
\`\`\`

2. **⚠️ IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git!

### 4. Configurar Schema do Banco

Execute o seguinte SQL no editor SQL do Supabase (**Database** → **SQL Editor**):

\`\`\`sql
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'cliente' CHECK (role IN ('cliente', 'admin', 'superadmin')),
  is_company BOOLEAN DEFAULT false,
  company_name TEXT,
  cnpj TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para criar usuário automaticamente
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (
    id, 
    email, 
    full_name, 
    phone, 
    role,
    is_company,
    company_name,
    cnpj,
    cpf,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'cliente'),
    COALESCE((NEW.raw_user_meta_data->>'isCompany')::boolean, false),
    NEW.raw_user_meta_data->>'companyName',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'cpf',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios dados
CREATE POLICY "Usuários podem ver apenas seus dados" ON users
  FOR SELECT USING (auth.uid() = id);

-- Política para usuários atualizarem apenas seus dados
CREATE POLICY "Usuários podem atualizar apenas seus dados" ON users
  FOR UPDATE USING (auth.uid() = id);
\`\`\`

### 5. Configurar Autenticação

1. Vá para **Authentication** → **Settings**
2. Configure as seguintes opções:
   - **Site URL**: `http://localhost:3000` (desenvolvimento) ou sua URL de produção
   - **Redirect URLs**: 
     - `http://localhost:3000/confirmar-email`
     - `http://localhost:3000/cliente/login`
     - `http://localhost:3000/admin/login`
   - **Email Auth**: ✅ Habilitado
   - **Confirm email**: ✅ Habilitado

3. Em **Email Templates**, configure o template de confirmação:
   - **Subject**: `Confirme seu email - Colmeia Solar`
   - **Body**: Use o template padrão ou personalize conforme necessário

## 🧪 Testes

### 1. Verificar Configuração

\`\`\`bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm run dev

# Em outro terminal, executar teste
node scripts/test-email-confirmation.js
\`\`\`

**Resultado esperado:**
\`\`\`
✅ Health check resultado: {
  "service": "email-confirmation",
  "status": "healthy",
  "configured": true,
  ...
}
\`\`\`

### 2. Teste Completo

1. Acesse `http://localhost:3000/cliente/cadastro`
2. Preencha o formulário com um email válido
3. Submeta o formulário
4. Verifique o email de confirmação na caixa de entrada
5. Clique no link de confirmação
6. Deve redirecionar para página de sucesso e depois para login

## 📁 Arquivos Implementados

### APIs
- `src/app/api/confirm-email/route.ts` - Endpoint de confirmação de email
- `src/types/api.ts` - Tipos para APIs

### Services
- `src/lib/services/emailConfirmationService.ts` - Service para confirmação
- `src/lib/supabase/config.ts` - Configuração do Supabase
- `src/lib/supabase/client.ts` - Cliente do Supabase (já existia)

### Componentes
- `src/app/confirmar-email/page.tsx` - Página de confirmação

### Testes
- `scripts/test-email-confirmation.js` - Script de teste

## 🔄 Fluxo do Sistema

1. **Registro**: Usuário preenche formulário → `signUp()` → Email enviado
2. **Confirmação**: Usuário clica no link → API `/confirm-email` → Verificação + Logout
3. **Sucesso**: Redirecionamento para login com mensagem de sucesso

## 🛡️ Segurança

- ✅ Logout imediato após confirmação (não persiste sessão)
- ✅ Validação de tokens
- ✅ Tratamento de erros robusto
- ✅ Rate limiting automático do Supabase
- ✅ RLS (Row Level Security) habilitado

## 🚨 Troubleshooting

### "Cannot find module '@supabase/auth-helpers-nextjs'"
- ✅ **Resolvido**: Migrado para `@supabase/ssr`

### "Supabase não configurado"
- Verifique se as variáveis estão no `.env.local`
- Reinicie o servidor após adicionar variáveis

### "Token expired"
- Links de confirmação expiram em 24h
- Solicite novo link de confirmação

### "Invalid token"
- Verifique se o link está completo
- Não edite o link manualmente

## 📞 Suporte

Se encontrar problemas:

1. Execute o teste: `node scripts/test-email-confirmation.js`
2. Verifique os logs do console do navegador
3. Verifique os logs do servidor Next.js
4. Verifique os logs do Supabase Dashboard
