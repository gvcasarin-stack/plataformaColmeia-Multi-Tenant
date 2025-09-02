-- ======================================================
-- DEBUG ESPECÍFICO - ERRO DE UPLOAD "PROJETO NÃO ENCONTRADO"
-- Execute este script e me envie TODOS os resultados
-- ======================================================

-- 1. IDENTIFICAR O PROJETO EXATO (THULLYO)
SELECT '=== PROJETO THULLYO ===' as section;
SELECT 
    id as project_id,
    number,
    nome_cliente_final,
    tenant_id,
    created_by,
    created_at,
    LENGTH(id::text) as id_length
FROM projects 
WHERE nome_cliente_final ILIKE '%THULLYO%' 
ORDER BY created_at DESC
LIMIT 1;

-- 2. BUSCAR USUÁRIO QUE CRIOU ESSE PROJETO
SELECT '=== USUÁRIO QUE CRIOU O PROJETO ===' as section;
WITH project_info AS (
    SELECT id, created_by, tenant_id, nome_cliente_final
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' 
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    u.tenant_id as user_tenant_id,
    pi.tenant_id as project_tenant_id,
    pi.id as project_id,
    pi.nome_cliente_final,
    CASE 
        WHEN u.tenant_id = pi.tenant_id THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as tenant_consistency
FROM project_info pi
JOIN users u ON u.id = pi.created_by;

-- 3. VERIFICAR TODOS OS USUÁRIOS DO MESMO TENANT
SELECT '=== TODOS OS USUÁRIOS DO TENANT GOIÁS SOLAR ===' as section;
WITH tenant_info AS (
    SELECT o.id as tenant_id, o.name
    FROM organizations o
    WHERE o.name ILIKE '%Goiás%' OR o.name ILIKE '%goias%'
    LIMIT 1
)
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.role,
    u.status,
    u.created_at,
    ti.name as organization_name
FROM users u
JOIN tenant_info ti ON u.tenant_id = ti.tenant_id
ORDER BY u.created_at;

-- 4. VERIFICAR SE O PROJETO ESTÁ VISÍVEL PARA TODOS OS USUÁRIOS DO TENANT
SELECT '=== TESTE DE ACESSO AO PROJETO ===' as section;
WITH project_info AS (
    SELECT id, tenant_id, nome_cliente_final
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' 
    ORDER BY created_at DESC
    LIMIT 1
),
tenant_users AS (
    SELECT u.id as user_id, u.email, u.name, u.role
    FROM users u
    JOIN organizations o ON u.tenant_id = o.id
    WHERE o.name ILIKE '%Goiás%' OR o.name ILIKE '%goias%'
)
SELECT 
    tu.user_id,
    tu.email,
    tu.name,
    tu.role,
    pi.id as project_id,
    pi.nome_cliente_final,
    CASE 
        WHEN pi.id IS NOT NULL THEN '✅ PODE VER PROJETO'
        ELSE '❌ NÃO PODE VER PROJETO'
    END as access_status
FROM tenant_users tu
CROSS JOIN project_info pi;

-- 5. VERIFICAR ESTRUTURA DA TABELA PROJECTS
SELECT '=== ESTRUTURA DA TABELA PROJECTS ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects' 
    AND column_name IN ('id', 'tenant_id', 'created_by', 'nome_cliente_final')
ORDER BY ordinal_position;

-- 6. VERIFICAR CONSTRAINTS DA TABELA PROJECTS
SELECT '=== CONSTRAINTS DA TABELA PROJECTS ===' as section;
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'projects'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 7. SIMULAR A QUERY DA FUNÇÃO verifyResourceOwnership
SELECT '=== SIMULAÇÃO verifyResourceOwnership ===' as section;
WITH project_info AS (
    SELECT id, tenant_id
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' 
    ORDER BY created_at DESC
    LIMIT 1
),
tenant_info AS (
    SELECT id as tenant_id
    FROM organizations 
    WHERE name ILIKE '%Goiás%' OR name ILIKE '%goias%'
    LIMIT 1
)
SELECT 
    pi.id as project_id,
    pi.tenant_id as project_tenant_id,
    ti.tenant_id as expected_tenant_id,
    CASE 
        WHEN pi.tenant_id = ti.tenant_id THEN '✅ OWNERSHIP OK'
        ELSE '❌ OWNERSHIP FAILED'
    END as ownership_check
FROM project_info pi
CROSS JOIN tenant_info ti;

-- 8. VERIFICAR SE HÁ DUPLICATAS DE ID
SELECT '=== VERIFICAÇÃO DE DUPLICATAS ===' as section;
WITH project_info AS (
    SELECT id
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' 
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    COUNT(*) as total_projects_with_same_id,
    STRING_AGG(DISTINCT tenant_id::text, ', ') as tenant_ids_found
FROM projects p
JOIN project_info pi ON p.id = pi.id;