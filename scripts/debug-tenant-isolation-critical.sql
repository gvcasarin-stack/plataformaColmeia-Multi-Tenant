-- 🚨 DIAGNÓSTICO CRÍTICO: Vazamento de Dados Multi-Tenant
-- Execute este script no Supabase para investigar o vazamento

-- ========================================
-- 1. VERIFICAR ORGANIZAÇÃO SUPREMA SOLAR
-- ========================================

SELECT '🏢 ORGANIZAÇÃO SUPREMA SOLAR:' as info;

SELECT 
  id as organization_id,
  name,
  slug,
  plan,
  is_trial,
  trial_end_date,
  subscription_status,
  created_at
FROM organizations 
WHERE name ILIKE '%suprema%' OR slug ILIKE '%suprema%'
ORDER BY created_at DESC;

-- ========================================
-- 2. VERIFICAR USUÁRIO GABRIEL CASARIN
-- ========================================

SELECT '👤 USUÁRIO GABRIEL CASARIN:' as info;

SELECT 
  id as user_id,
  email,
  name,
  role,
  tenant_id,
  status,
  created_at
FROM users 
WHERE email = 'casarin166@yahoo.com.br'
ORDER BY created_at DESC;

-- ========================================
-- 3. VERIFICAR PROJETO FV-2025-001 (VAZAMENTO!)
-- ========================================

SELECT '📋 PROJETO FV-2025-001 (SUSPEITO):' as info;

SELECT 
  id as project_id,
  number,
  nome_cliente_final,
  empresa_integradora,
  tenant_id,
  created_by,
  status,
  created_at,
  -- Verificar se tenant_id corresponde à organização correta
  CASE 
    WHEN tenant_id = (SELECT id FROM organizations WHERE name ILIKE '%suprema%' LIMIT 1)
    THEN '✅ PERTENCE À SUPREMA SOLAR'
    ELSE '❌ PERTENCE A OUTRO TENANT'
  END as ownership_check
FROM projects 
WHERE number = 'FV-2025-001'
ORDER BY created_at DESC;

-- ========================================
-- 4. VERIFICAR TODOS OS PROJETOS POR TENANT
-- ========================================

SELECT '📊 PROJETOS POR TENANT:' as info;

SELECT 
  o.name as organization_name,
  o.slug,
  o.id as tenant_id,
  COUNT(p.id) as total_projects,
  ARRAY_AGG(p.number ORDER BY p.created_at DESC) as project_numbers
FROM organizations o
LEFT JOIN projects p ON p.tenant_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;

-- ========================================
-- 5. VERIFICAR USUÁRIOS POR TENANT
-- ========================================

SELECT '👥 USUÁRIOS POR TENANT:' as info;

SELECT 
  o.name as organization_name,
  o.slug,
  COUNT(u.id) as total_users,
  ARRAY_AGG(u.email ORDER BY u.created_at DESC) as user_emails
FROM organizations o
LEFT JOIN users u ON u.tenant_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;

-- ========================================
-- 6. IDENTIFICAR VAZAMENTOS CRÍTICOS
-- ========================================

SELECT '🚨 VAZAMENTOS IDENTIFICADOS:' as info;

-- Projetos órfãos (sem tenant_id)
SELECT 
  'PROJETOS SEM TENANT_ID' as problema,
  COUNT(*) as quantidade,
  ARRAY_AGG(number) as project_numbers
FROM projects 
WHERE tenant_id IS NULL;

-- Usuários órfãos (sem tenant_id)
SELECT 
  'USUÁRIOS SEM TENANT_ID' as problema,
  COUNT(*) as quantidade,
  ARRAY_AGG(email) as user_emails
FROM users 
WHERE tenant_id IS NULL;

-- Projetos com tenant_id inválido
SELECT 
  'PROJETOS COM TENANT_ID INVÁLIDO' as problema,
  COUNT(*) as quantidade,
  ARRAY_AGG(number) as project_numbers
FROM projects p
WHERE p.tenant_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM organizations o 
    WHERE o.id = p.tenant_id
  );

SELECT '🔍 DIAGNÓSTICO COMPLETO DE ISOLAMENTO MULTI-TENANT!' as status;
