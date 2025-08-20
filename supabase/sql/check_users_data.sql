-- ============================================================================
-- VERIFICAÇÃO DE DADOS: Tabela Users
-- ============================================================================
-- Este script verifica se existem usuários na base de dados e suas características

-- ============================================================================
-- 1. CONTAGEM TOTAL DE USUÁRIOS
-- ============================================================================
SELECT 
    'TOTAL DE USUÁRIOS' as categoria,
    COUNT(*) as quantidade
FROM users;

-- ============================================================================
-- 2. CONTAGEM POR ROLE
-- ============================================================================
SELECT 
    'POR ROLE' as categoria,
    role,
    COUNT(*) as quantidade
FROM users
GROUP BY role
ORDER BY quantidade DESC;

-- ============================================================================
-- 3. VERIFICAR USUÁRIOS COM ROLE CLIENTE
-- ============================================================================
SELECT 
    'CLIENTES ESPECÍFICOS' as categoria,
    id,
    full_name,
    email,
    role,
    pending_approval,
    is_company,
    company_name,
    created_at
FROM users 
WHERE role = 'cliente'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 4. VERIFICAR TODAS AS COLUNAS DISPONÍVEIS
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- 5. VERIFICAR USUÁRIOS APROVADOS VS PENDENTES
-- ============================================================================
SELECT 
    'STATUS APROVAÇÃO' as categoria,
    pending_approval,
    COUNT(*) as quantidade
FROM users
GROUP BY pending_approval
ORDER BY pending_approval;

-- ============================================================================
-- 6. AMOSTRA DE TODOS OS USUÁRIOS (primeiros 5)
-- ============================================================================
SELECT 
    'AMOSTRA GERAL' as categoria,
    id,
    email,
    role,
    pending_approval,
    created_at
FROM users
ORDER BY created_at DESC
LIMIT 5; 