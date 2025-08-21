-- ============================================================================
-- CORREÇÃO EMERGENCIAL: Políticas RLS com Recursão Infinita
-- ============================================================================
-- Remove políticas problemáticas e cria versões corretas

-- ============================================================================
-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES (LIMPEZA COMPLETA)
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin read access to all users" ON public.users;
DROP POLICY IF EXISTS "Allow admin update access to all users" ON public.users;
DROP POLICY IF EXISTS "Allow individual user read access" ON public.users;
DROP POLICY IF EXISTS "Allow individual user update access" ON public.users;
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
DROP POLICY IF EXISTS "Users can view own data" ON public.users;

-- ============================================================================
-- 2. CRIAR POLÍTICAS CORRETAS SEM RECURSÃO
-- ============================================================================

-- 🔥 POLÍTICA CORRETA: Usuário pode ver próprios dados (SEM RECURSÃO)
CREATE POLICY "enable_read_own_user_data" ON public.users
    FOR SELECT 
    USING (auth.uid() = id);

-- 🔥 POLÍTICA CORRETA: Usuário pode atualizar próprios dados (SEM RECURSÃO) 
CREATE POLICY "enable_update_own_user_data" ON public.users
    FOR UPDATE 
    USING (auth.uid() = id);

-- 🔥 POLÍTICA CORRETA: Permitir inserção de novos usuários
CREATE POLICY "enable_insert_users" ON public.users
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 3. POLÍTICA ESPECIAL PARA ADMINS (SEM RECURSÃO)
-- ============================================================================
-- Permite que admins vejam todos os usuários baseado no ID do auth, não na tabela users
CREATE POLICY "enable_admin_read_all_users" ON public.users
    FOR SELECT 
    USING (
        auth.uid() IN (
            '3a94ea97-85ce-49f1-b390-023a22c7975d'  -- Gabriel Casarin (superadmin)
            -- Adicione outros IDs de admin aqui se necessário
        )
    );

-- ============================================================================
-- 4. VERIFICAR SE RLS ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL
-- ============================================================================
-- Mostrar todas as políticas ativas
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
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY policyname;
