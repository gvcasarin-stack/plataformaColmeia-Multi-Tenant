-- CORREÇÃO URGENTE: Resolver recursão infinita nas políticas RLS
-- Problema: Políticas de admin tentam consultar a tabela users para verificar role
-- Solução: Usar auth.jwt() para acessar claims do JWT sem consultar a tabela

-- ==============================================
-- PASSO 1: REMOVER POLÍTICAS PROBLEMÁTICAS
-- ==============================================

-- Remover políticas de admin que causam recursão
DROP POLICY IF EXISTS "Allow admin/superadmin read access to all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin/superadmin update access to all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin/superadmin full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow admin/superadmin full access to projects" ON public.projects;

-- ==============================================
-- PASSO 2: CRIAR POLÍTICAS CORRIGIDAS PARA USERS
-- ==============================================

-- Política segura para admins lerem todos os usuários
-- Usa auth.jwt() para verificar role sem consultar a tabela users
CREATE POLICY "Allow admin read access to all users"
ON public.users FOR SELECT
USING (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  OR auth.uid() = id
);

-- Política segura para admins atualizarem usuários
CREATE POLICY "Allow admin update access to all users"
ON public.users FOR UPDATE
USING (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  OR auth.uid() = id
)
WITH CHECK (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  OR auth.uid() = id
);

-- Política para inserção de novos usuários (necessária para registro)
CREATE POLICY "Allow user creation"
ON public.users FOR INSERT
WITH CHECK (
  auth.uid() = id
  OR auth.jwt() ->> 'role' IN ('admin', 'superadmin')
);

-- ==============================================
-- PASSO 3: CRIAR POLÍTICAS CORRIGIDAS PARA CLIENTS
-- ==============================================

-- Política segura para admins acessarem todos os clientes
CREATE POLICY "Allow admin full access to clients"
ON public.clients FOR ALL
USING (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  OR auth.uid() = created_by
);

-- ==============================================
-- PASSO 4: CRIAR POLÍTICAS CORRIGIDAS PARA PROJECTS
-- ==============================================

-- Política segura para admins acessarem todos os projetos
CREATE POLICY "Allow admin full access to projects"
ON public.projects FOR ALL
USING (
  auth.jwt() ->> 'role' IN ('admin', 'superadmin')
  OR auth.uid() = created_by
);

-- ==============================================
-- PASSO 5: VERIFICAÇÃO E COMENTÁRIOS
-- ==============================================

-- Comentários explicativos
COMMENT ON POLICY "Allow admin read access to all users" ON public.users IS 
'Permite que admins leiam todos os usuários usando auth.jwt() para evitar recursão';

COMMENT ON POLICY "Allow admin update access to all users" ON public.users IS 
'Permite que admins atualizem usuários usando auth.jwt() para evitar recursão';

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('users', 'clients', 'projects')
ORDER BY tablename, policyname;
