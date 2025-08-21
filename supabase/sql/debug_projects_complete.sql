-- ========================================
-- SCRIPT COMPLETO DE DIAGNÓSTICO - PROJETOS
-- Execute este script no Supabase Dashboard > SQL Editor
-- ========================================

-- 1. VERIFICAR ESTRUTURA DA TABELA PROJECTS
SELECT 
    '=== ESTRUTURA DA TABELA PROJECTS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SE A TABELA EXISTE E TEM DADOS
SELECT 
    '=== CONTAGEM TOTAL DE PROJETOS ===' as info;

SELECT COUNT(*) as total_projects FROM public.projects;

-- 3. VERIFICAR ALGUNS PROJETOS DE EXEMPLO
SELECT 
    '=== PROJETOS DE EXEMPLO ===' as info;

SELECT 
    id,
    name,
    number,
    created_by,
    status,
    empresa_integradora,
    nome_cliente_final,
    created_at,
    updated_at
FROM public.projects 
ORDER BY created_at DESC
LIMIT 5;

-- 4. VERIFICAR USUÁRIOS NA TABELA AUTH.USERS
SELECT 
    '=== USUÁRIOS AUTH.USERS ===' as info;

SELECT 
    id,
    email,
    created_at,
    email_confirmed_at,
    last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

-- 5. VERIFICAR USUÁRIOS NA TABELA PUBLIC.USERS
SELECT 
    '=== USUÁRIOS PUBLIC.USERS ===' as info;

SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
ORDER BY created_at DESC
LIMIT 5;

-- 6. VERIFICAR PROJETOS POR USUÁRIO (AUTH.USERS)
SELECT 
    '=== PROJETOS POR USUÁRIO (AUTH) ===' as info;

SELECT 
    u.email,
    COUNT(p.id) as total_projetos
FROM auth.users u
LEFT JOIN public.projects p ON u.id = p.created_by
GROUP BY u.id, u.email
ORDER BY total_projetos DESC;

-- 7. VERIFICAR PROJETOS POR USUÁRIO (PUBLIC.USERS)
SELECT 
    '=== PROJETOS POR USUÁRIO (PUBLIC) ===' as info;

SELECT 
    u.email,
    u.full_name,
    u.role,
    COUNT(p.id) as total_projetos
FROM public.users u
LEFT JOIN public.projects p ON u.id = p.created_by
GROUP BY u.id, u.email, u.full_name, u.role
ORDER BY total_projetos DESC;

-- 8. VERIFICAR POLÍTICAS RLS DA TABELA PROJECTS
SELECT 
    '=== POLÍTICAS RLS - PROJECTS ===' as info;

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
WHERE tablename = 'projects';

-- 9. VERIFICAR SE RLS ESTÁ HABILITADO
SELECT 
    '=== STATUS RLS ===' as info;

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects';

-- 10. VERIFICAR ÍNDICES DA TABELA
SELECT 
    '=== ÍNDICES DA TABELA PROJECTS ===' as info;

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'projects' 
AND schemaname = 'public';

-- 11. TESTAR CONSULTA SIMPLES (como o código faz)
SELECT 
    '=== TESTE DE CONSULTA SIMPLES ===' as info;

SELECT 
    id,
    name,
    number,
    created_by,
    status
FROM public.projects 
ORDER BY updated_at DESC
LIMIT 3;

-- 12. VERIFICAR PERMISSÕES DO USUÁRIO ATUAL
SELECT 
    '=== PERMISSÕES DO USUÁRIO ATUAL ===' as info;

SELECT 
    current_user as usuario_atual,
    session_user as sessao_usuario;

-- 13. VERIFICAR SE HÁ ERROS DE FOREIGN KEY
SELECT 
    '=== VERIFICAR CONSTRAINTS ===' as info;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE conrelid = 'public.projects'::regclass;

-- 14. VERIFICAR ESTRUTURA DA TABELA PUBLIC.USERS
SELECT 
    '=== ESTRUTURA DA TABELA PUBLIC.USERS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 15. VERIFICAR ESTRUTURA DA TABELA AUTH.USERS
SELECT 
    '=== ESTRUTURA DA TABELA AUTH.USERS ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'auth'
ORDER BY ordinal_position;

-- 16. CRIAR UM PROJETO DE TESTE (SE NECESSÁRIO)
-- DESCOMENTE AS LINHAS ABAIXO APENAS SE QUISER CRIAR UM PROJETO DE TESTE

/*
SELECT 
    '=== CRIANDO PROJETO DE TESTE ===' as info;

INSERT INTO public.projects (
    name,
    number,
    created_by,
    empresa_integradora,
    nome_cliente_final,
    distribuidora,
    potencia,
    status,
    prioridade,
    created_at,
    updated_at
) VALUES (
    'Projeto de Teste',
    'FV-2024-TEST',
    (SELECT id FROM auth.users LIMIT 1), -- Pega o primeiro usuário
    'Empresa Teste',
    'Cliente Teste',
    'Distribuidora Teste',
    100.0,
    'Não Iniciado',
    'Baixa',
    NOW(),
    NOW()
) RETURNING id, name, number, created_by;
*/

-- 17. VERIFICAR LOGS DE ERRO (se disponível)
SELECT 
    '=== VERIFICAÇÃO FINAL ===' as info;

SELECT 
    'Diagnóstico completo executado com sucesso!' as resultado,
    NOW() as timestamp_execucao;

-- ========================================
-- INSTRUÇÕES PARA EXECUÇÃO:
-- 1. Copie todo este script
-- 2. Cole no Supabase Dashboard > SQL Editor
-- 3. Clique em "Run" para executar
-- 4. Analise os resultados de cada seção
-- 5. Se não houver projetos, descomente a seção 16 para criar um projeto de teste
-- ========================================
