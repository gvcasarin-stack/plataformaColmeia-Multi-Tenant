-- ======================================================
-- DIAGNÓSTICO COMPLETO - CHECKLIST TIMELINE FALHOU
-- Execute no Supabase SQL Editor
-- ======================================================

-- 1. VERIFICAR CONFIGS NA TABELA
SELECT 'CONFIGS EXISTENTES:' as info;
SELECT 
    tenant_id,
    category,
    key,
    LEFT(value::text, 100) || '...' as value_preview,
    description,
    created_at
FROM configs 
WHERE key = 'checklist_message'
ORDER BY created_at;

-- 2. VERIFICAR TODAS AS ORGANIZAÇÕES
SELECT 'ORGANIZAÇÕES EXISTENTES:' as info;
SELECT 
    id,
    name,
    slug,
    created_at
FROM organizations
ORDER BY created_at;

-- 3. VERIFICAR USUÁRIOS E SEUS TENANTS
SELECT 'USUÁRIOS E TENANTS:' as info;
SELECT 
    u.id,
    u.email,
    u.name,
    u.tenant_id,
    o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.tenant_id = o.id
ORDER BY u.created_at;

-- 4. VERIFICAR SE PROJETO FOI CRIADO RECENTEMENTE
SELECT 'PROJETOS RECENTES:' as info;
SELECT 
    id,
    number,
    nome_cliente_final,
    tenant_id,
    timeline_events,
    created_at
FROM projects 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;

-- 5. VERIFICAR TIMELINE EVENTS DO PROJETO RECENTE
SELECT 'TIMELINE DO PROJETO MAIS RECENTE:' as info;
WITH recent_project AS (
    SELECT id, number, timeline_events
    FROM projects 
    WHERE created_at > NOW() - INTERVAL '1 hour'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT 
    p.number as project_number,
    jsonb_array_length(COALESCE(p.timeline_events, '[]'::jsonb)) as timeline_events_count,
    p.timeline_events
FROM recent_project p;

-- 6. VERIFICAR LOGS (SE EXISTIR TABELA DE LOGS)
SELECT 'VERIFICANDO SE HÁ TABELA DE LOGS:' as info;
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'logs' 
    AND table_schema = 'public'
) as logs_table_exists;

-- 7. QUERY ESPECÍFICA PARA TENANT GOIÁS SOLAR
SELECT 'CONFIGS ESPECÍFICAS DO TENANT GOIÁS SOLAR:' as info;
SELECT 
    c.key,
    LEFT(c.value::text, 100) || '...' as value_preview,
    c.description,
    o.name as organization_name
FROM configs c
JOIN organizations o ON c.tenant_id = o.id
WHERE o.name ILIKE '%Goiás%' OR o.name ILIKE '%goias%'
ORDER BY c.key;