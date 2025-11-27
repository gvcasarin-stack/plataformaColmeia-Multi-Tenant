-- ============================================================================
-- DIAGNÓSTICO RÁPIDO: Verificar problema de numeração
-- ============================================================================

-- 1. Verificar se o trigger existe e está HABILITADO
SELECT
  tgname as trigger_name,
  tgenabled as habilitado,
  CASE tgenabled
    WHEN 'O' THEN '✅ HABILITADO'
    WHEN 'D' THEN '❌ DESABILITADO'
    WHEN 'R' THEN '⚠️  REPLICA ONLY'
    WHEN 'A' THEN '⚠️  ALWAYS'
    ELSE 'DESCONHECIDO'
  END as status
FROM pg_trigger
WHERE tgname = 'set_project_number_by_tenant'
  AND tgrelid = 'projects'::regclass;

-- 2. Análise dos últimos 10 projetos criados
SELECT
  tenant_id,
  number,
  nome_cliente_final,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- 3. Contagem de projetos por tenant com min/max number
SELECT
  tenant_id,
  COUNT(*) as total_projetos,
  MIN(number) as primeiro_numero,
  MAX(number) as ultimo_numero
FROM projects
GROUP BY tenant_id
ORDER BY tenant_id;

-- 4. Verificar se há números duplicados entre tenants diferentes
SELECT
  number,
  COUNT(DISTINCT tenant_id) as qtd_tenants,
  array_agg(DISTINCT tenant_id) as tenants
FROM projects
WHERE number IS NOT NULL
GROUP BY number
HAVING COUNT(DISTINCT tenant_id) > 1;
