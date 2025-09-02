-- ======================================================
-- DIAGNÓSTICO - ERROS DE UPLOAD E COMENTÁRIOS
-- Execute no Supabase SQL Editor
-- ======================================================

-- 1. VERIFICAR PROJETO MAIS RECENTE (THULLYO VINICIUS)
SELECT 'PROJETO MAIS RECENTE:' as info;
SELECT 
    id,
    number,
    nome_cliente_final,
    tenant_id,
    created_by,
    created_at
FROM projects 
WHERE nome_cliente_final ILIKE '%THULLYO%' OR nome_cliente_final ILIKE '%VINICIUS%'
ORDER BY created_at DESC
LIMIT 2;

-- 2. VERIFICAR TENANT DO USUÁRIO QUE CRIOU O PROJETO
SELECT 'TENANT DO USUÁRIO QUE CRIOU:' as info;
WITH recent_project AS (
    SELECT created_by, tenant_id as project_tenant_id
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' OR nome_cliente_final ILIKE '%VINICIUS%'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.tenant_id as user_tenant_id,
    rp.project_tenant_id,
    CASE 
        WHEN u.tenant_id = rp.project_tenant_id THEN 'MATCH ✅'
        ELSE 'MISMATCH ❌'
    END as tenant_match,
    o.name as organization_name
FROM recent_project rp
JOIN users u ON u.id = rp.created_by
LEFT JOIN organizations o ON o.id = u.tenant_id;

-- 3. VERIFICAR TODOS OS USUÁRIOS DO TENANT GOIÁS SOLAR
SELECT 'USUÁRIOS DO TENANT GOIÁS SOLAR:' as info;
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.tenant_id,
    o.name as organization_name
FROM users u
JOIN organizations o ON u.tenant_id = o.id
WHERE o.name ILIKE '%Goiás%' OR o.name ILIKE '%goias%'
ORDER BY u.created_at;

-- 4. VERIFICAR SE PROJETO PERTENCE AO TENANT CORRETO
SELECT 'VERIFICAÇÃO DE PROPRIEDADE DO PROJETO:' as info;
WITH recent_project AS (
    SELECT id, tenant_id, nome_cliente_final
    FROM projects 
    WHERE nome_cliente_final ILIKE '%THULLYO%' OR nome_cliente_final ILIKE '%VINICIUS%'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    rp.id as project_id,
    rp.nome_cliente_final,
    rp.tenant_id as project_tenant_id,
    o.name as project_organization,
    (
        SELECT COUNT(*)
        FROM users u2
        WHERE u2.tenant_id = rp.tenant_id
    ) as users_in_same_tenant
FROM recent_project rp
LEFT JOIN organizations o ON o.id = rp.tenant_id;

-- 5. VERIFICAR LOGS DE ERRO (SE EXISTIR TABELA)
SELECT 'VERIFICANDO LOGS DE ERRO:' as info;
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'error_logs' 
    AND table_schema = 'public'
) as error_logs_table_exists;

-- 6. BUSCAR INFORMAÇÕES DE DEBUG SOBRE O TENANT
SELECT 'INFORMAÇÕES DO TENANT GOIÁS SOLAR:' as info;
SELECT 
    o.id as tenant_id,
    o.name,
    o.slug,
    o.is_trial,
    o.subscription_status,
    o.created_at,
    COUNT(u.id) as total_users,
    COUNT(p.id) as total_projects
FROM organizations o
LEFT JOIN users u ON u.tenant_id = o.id
LEFT JOIN projects p ON p.tenant_id = o.id
WHERE o.name ILIKE '%Goiás%' OR o.name ILIKE '%goias%'
GROUP BY o.id, o.name, o.slug, o.is_trial, o.subscription_status, o.created_at;