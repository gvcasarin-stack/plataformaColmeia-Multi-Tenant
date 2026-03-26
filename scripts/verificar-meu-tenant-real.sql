-- ========================================
-- VERIFICAR TENANT REAL - SOLAR TECH
-- ========================================

-- 1. Buscar por nome da empresa "SolarTech" ou similar
SELECT 
  'ORGANIZATIONS' as tipo,
  id as tenant_id,
  name as empresa_nome,
  slug
FROM organizations
WHERE name ILIKE '%solar%tech%'
   OR name ILIKE '%solartech%'
   OR slug ILIKE '%solar%tech%';

-- 2. Buscar administradores dessas empresas
SELECT 
  'ADMINS' as tipo,
  u.id as user_id,
  u.name as admin_nome,
  u.email,
  u.role,
  u.tenant_id,
  o.name as empresa_nome
FROM users u
LEFT JOIN organizations o ON o.id = u.tenant_id
WHERE u.role IN ('admin', 'superadmin')
  AND (o.name ILIKE '%solar%tech%' OR o.name ILIKE '%solartech%')
ORDER BY u.name;

-- 3. Verificar PLANOS de assinatura da SolarTech
SELECT 
  'PLANOS_SOLARTECH' as tipo,
  pa.id,
  pa.nome as plano_nome,
  pa.quantidade_mensal,
  pa.valor_mensal,
  pa.ativo,
  pa.tenant_id,
  o.name as empresa_nome
FROM planos_assinatura pa
LEFT JOIN organizations o ON o.id = pa.tenant_id
WHERE o.name ILIKE '%solar%tech%' OR o.name ILIKE '%solartech%';

-- 4. Verificar ASSINATURAS da SolarTech
SELECT 
  'ASSINATURAS_SOLARTECH' as tipo,
  ca.id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.projetos_mensais,
  ca.tenant_id,
  u.name as cliente_nome,
  pa.nome as plano_nome,
  pa.quantidade_mensal,
  o.name as empresa_nome
FROM cliente_assinaturas ca
LEFT JOIN users u ON u.id = ca.user_id
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
LEFT JOIN organizations o ON o.id = ca.tenant_id
WHERE o.name ILIKE '%solar%tech%' OR o.name ILIKE '%solartech%'
  AND ca.status = 'ativa';

