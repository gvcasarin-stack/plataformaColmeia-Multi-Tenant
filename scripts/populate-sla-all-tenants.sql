-- ============================================================================
-- Script: Popular/corrigir campos de SLA em projetos existentes — TODOS OS
--         TENANTS (substitui os scripts antigos, que eram hardcoded por
--         tenant: populate-sla-existing-projects-solar-tech.sql e
--         populate-sla-existing-projects-homolux.sql).
--
-- ⚠️ PRÉ-REQUISITO: rodar a migração
--    supabase/migrations/20260805_sla_auto_calculation_trigger.sql ANTES
--    deste script — ele reaproveita as funções calculate_sla_expiration()/
--    add_business_hours() criadas por ela, para que o valor recalculado
--    aqui seja idêntico ao que o trigger passa a manter dali para frente.
--
-- O que este script faz, por tenant, para TODOS os projetos cujo status
-- atual tem sla_days configurado (> 0):
--   - Se status_changed_at já existe: recalcula sla_expires_at a partir
--     dele (a data-âncora não é alterada — só o prazo derivado dela).
--   - Se status_changed_at está NULL (projeto nunca teve o campo
--     preenchido): usa updated_at como âncora aproximada (mesmo critério já
--     usado nos dois scripts antigos) e preenche status_changed_at também.
--
-- Não é destrutivo: nunca apaga histórico, nunca altera `status`. Roda
-- dentro de uma transação (BEGIN/COMMIT) — revise o SELECT de verificação
-- antes de confirmar; se algo parecer errado, troque o COMMIT final por
-- ROLLBACK.
--
-- Também corrige, como efeito colateral desejado, os dois tenants que já
-- haviam rodado os scripts antigos em 2025-01-14: aquele cálculo usava uma
-- aproximação por DIAS inteiros que diverge do cálculo real da aplicação
-- (addHours, hora a hora) sempre que a mudança de status caiu num fim de
-- semana — este script recalcula com a fórmula correta para todos.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_fn_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'calculate_sla_expiration'
  ) INTO v_fn_exists;

  IF NOT v_fn_exists THEN
    RAISE EXCEPTION '❌ Função calculate_sla_expiration() não existe. Rode a migração 20260805_sla_auto_calculation_trigger.sql antes deste script.';
  END IF;
END $$;

-- Contagem antes, para conferência
DO $$
DECLARE
  v_total INTEGER;
  v_sem_status_changed_at INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM projects;
  SELECT COUNT(*) INTO v_sem_status_changed_at FROM projects WHERE status_changed_at IS NULL;
  RAISE NOTICE '📊 Total de projetos (todos os tenants): %', v_total;
  RAISE NOTICE '📊 Projetos sem status_changed_at: %', v_sem_status_changed_at;
END $$;

WITH project_status_config AS (
  SELECT tenant_id, slug, sla_days, sla_exclude_weekends
  FROM project_statuses
),
projects_to_update AS (
  SELECT
    p.id,
    COALESCE(p.status_changed_at, p.updated_at) AS anchor,
    psc.sla_days,
    psc.sla_exclude_weekends
  FROM projects p
  INNER JOIN project_status_config psc
    ON p.status = psc.slug AND p.tenant_id = psc.tenant_id
  WHERE psc.sla_days IS NOT NULL
    AND psc.sla_days > 0
)
UPDATE projects p
SET
  status_changed_at = COALESCE(p.status_changed_at, ptu.anchor),
  sla_expires_at = calculate_sla_expiration(ptu.anchor, ptu.sla_days, COALESCE(ptu.sla_exclude_weekends, true)),
  sla_expired = calculate_sla_expiration(ptu.anchor, ptu.sla_days, COALESCE(ptu.sla_exclude_weekends, true)) < NOW()
FROM projects_to_update ptu
WHERE p.id = ptu.id;

-- Projetos cujo status atual NÃO tem SLA configurado: garantir que fiquem
-- consistentes (sem prazo pendurado de uma configuração antiga removida).
WITH project_status_config AS (
  SELECT tenant_id, slug, sla_days
  FROM project_statuses
)
UPDATE projects p
SET sla_expires_at = NULL,
    sla_expired = false
FROM project_status_config psc
WHERE p.status = psc.slug
  AND p.tenant_id = psc.tenant_id
  AND (psc.sla_days IS NULL OR psc.sla_days <= 0)
  AND p.sla_expires_at IS NOT NULL;

-- ============================================================================
-- VERIFICAÇÃO — revise antes de confirmar o COMMIT
-- ============================================================================

SELECT
  t.name AS "Tenant",
  ps.name AS "Status",
  ps.sla_days AS "Prazo (dias)",
  COUNT(p.id) AS "Total",
  COUNT(*) FILTER (WHERE p.sla_expired) AS "Atrasados",
  COUNT(*) FILTER (WHERE p.sla_expires_at IS NOT NULL AND NOT p.sla_expired) AS "No Prazo",
  COUNT(*) FILTER (WHERE p.sla_expires_at IS NULL) AS "Sem SLA"
FROM project_statuses ps
JOIN tenants t ON t.id = ps.tenant_id
LEFT JOIN projects p ON p.status = ps.slug AND p.tenant_id = ps.tenant_id
GROUP BY t.name, ps.name, ps.sla_days, ps.order_index, ps.tenant_id
ORDER BY t.name, ps.order_index;

-- ⚠️ Revise o resultado acima. Se estiver correto: COMMIT;
-- Se algo parecer errado: ROLLBACK;
COMMIT;
