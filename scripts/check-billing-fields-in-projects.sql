-- 🔍 DIAGNÓSTICO: Verificar campos billing_mode e billing_snapshot nos projetos
-- Este script verifica se os campos de billing estão sendo salvos corretamente

-- ========================================
-- 1. Verificar se as colunas existem na tabela projects
-- ========================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('billing_mode', 'billing_snapshot')
ORDER BY column_name;

-- ========================================
-- 2. Buscar os 10 projetos mais recentes (todos os tenants)
-- ========================================
SELECT
  id,
  number,
  tenant_id,
  owner_id,
  billing_mode,
  billing_snapshot,
  created_at,
  status
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- ========================================
-- 3. Verificar APENAS projetos criados HOJE
-- ========================================
SELECT
  p.id,
  p.number,
  p.tenant_id,
  p.owner_id,
  u.billing_mode as user_billing_mode,
  p.billing_mode as project_billing_mode,
  p.billing_snapshot,
  p.created_at
FROM projects p
LEFT JOIN users u ON u.id = p.owner_id
WHERE DATE(p.created_at) = CURRENT_DATE
ORDER BY p.created_at DESC;

-- ========================================
-- 4. Verificar projetos de usuários com pacote/assinatura
-- ========================================
SELECT
  p.id,
  p.number,
  p.tenant_id,
  u.id as owner_id,
  u.email,
  u.billing_mode as user_billing_mode,
  p.billing_mode as project_billing_mode,
  p.billing_snapshot,
  p.created_at
FROM projects p
INNER JOIN users u ON u.id = p.owner_id
WHERE u.billing_mode IN ('pacote', 'assinatura')
ORDER BY p.created_at DESC
LIMIT 20;

-- ========================================
-- 5. Estatísticas: Quantos projetos por billing_mode
-- ========================================
SELECT
  billing_mode,
  COUNT(*) as total_projetos,
  COUNT(CASE WHEN billing_snapshot IS NOT NULL THEN 1 END) as com_snapshot,
  COUNT(CASE WHEN billing_snapshot IS NULL THEN 1 END) as sem_snapshot
FROM projects
GROUP BY billing_mode
ORDER BY billing_mode;

-- ========================================
-- 6. Verificar projetos SEM billing_mode mas de usuários COM pacote/assinatura (PROBLEMA!)
-- ========================================
SELECT
  p.id,
  p.number,
  p.tenant_id,
  u.email,
  u.billing_mode as user_billing_mode,
  p.billing_mode as project_billing_mode,
  p.created_at
FROM projects p
INNER JOIN users u ON u.id = p.owner_id
WHERE u.billing_mode IN ('pacote', 'assinatura')
  AND (p.billing_mode IS NULL OR p.billing_mode = 'avulso')
ORDER BY p.created_at DESC
LIMIT 10;

-- ========================================
-- 7. Exemplo de billing_snapshot (ver estrutura JSON)
-- ========================================
SELECT
  id,
  number,
  billing_mode,
  billing_snapshot,
  created_at
FROM projects
WHERE billing_snapshot IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 8. VERIFICAR PROJETO ESPECÍFICO (substitua pelo ID do projeto que você criou)
-- ========================================
-- Descomente e substitua 'SEU_PROJETO_ID' pelo ID do projeto que você acabou de criar:
-- SELECT
--   p.id,
--   p.number,
--   p.tenant_id,
--   u.email,
--   u.billing_mode as user_billing_mode,
--   p.billing_mode as project_billing_mode,
--   p.billing_snapshot,
--   p.created_at
-- FROM projects p
-- INNER JOIN users u ON u.id = p.owner_id
-- WHERE p.id = 'SEU_PROJETO_ID';
