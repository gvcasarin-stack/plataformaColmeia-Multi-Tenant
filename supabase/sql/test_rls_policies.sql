-- TESTE DE POLÍTICAS RLS - PROJETOS
-- Execute este script para verificar as políticas

-- 1. VERIFICAR POLÍTICAS RLS ATUAIS
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- 2. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects' AND schemaname = 'public';

-- 3. TESTAR CONSULTA COMO SUPERADMIN (sem RLS)
SET row_security = off;
SELECT 
    'SEM RLS' as teste,
    COUNT(*) as total_projetos 
FROM public.projects;

-- 4. TESTAR CONSULTA COM RLS HABILITADO
SET row_security = on;
SELECT 
    'COM RLS' as teste,
    COUNT(*) as total_projetos 
FROM public.projects;

-- 5. VERIFICAR CONTEXTO ATUAL DO USUÁRIO
SELECT 
    current_user,
    current_setting('request.jwt.claims', true) as jwt_claims;

-- 6. TESTAR CONSULTA ESPECÍFICA PARA O CLIENTE
SELECT 
    'PROJETOS DO CLIENTE' as teste,
    id,
    name,
    created_by
FROM public.projects 
WHERE created_by = '0f5fa1f4-16af-4e8c-b178-5b099c256e0c';

-- 7. VERIFICAR SE HÁ FUNÇÃO auth.uid()
SELECT auth.uid() as current_auth_uid;
