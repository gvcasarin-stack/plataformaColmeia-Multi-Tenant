-- ============================================
-- Script: Migrar SLA de horas para dias - HOMOLUX SOLAR
-- Descrição: Converte configurações de SLA de horas para dias
-- Tenant: Homolux Solar (923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b)
-- Data: 2025-01-14
-- ============================================

-- ⚠️ ATENÇÃO: Este script afeta APENAS a organização Homolux Solar

BEGIN;

-- Verificar se a organização existe
DO $$
DECLARE
    v_org_name TEXT;
BEGIN
    SELECT name INTO v_org_name
    FROM organizations
    WHERE id = '923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b';

    IF v_org_name IS NULL THEN
        RAISE EXCEPTION '❌ Organização Homolux Solar não encontrada!';
    ELSE
        RAISE NOTICE '✅ Organização encontrada: %', v_org_name;
    END IF;
END $$;

-- 1. Verificar configuração atual
SELECT
    name AS "Status",
    slug,
    sla_hours AS "Horas (antigo)",
    sla_days AS "Dias (novo)",
    sla_exclude_weekends AS "Ignora fins de semana"
FROM project_statuses
WHERE tenant_id = '923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b'
ORDER BY order_index;

-- 2. Migrar de horas para dias (conversão: horas / 24 = dias)
UPDATE project_statuses
SET
    sla_days = CASE
        WHEN sla_hours IS NOT NULL THEN ROUND(sla_hours::numeric / 24, 0)::integer
        ELSE NULL
    END,
    sla_hours = NULL  -- Limpar campo antigo após migração
WHERE tenant_id = '923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b'
AND sla_hours IS NOT NULL;

-- 3. Verificar resultado da migração
SELECT
    id,
    name,
    slug,
    sla_days AS "Dias (novo)",
    sla_exclude_weekends AS "Ignora fins de semana"
FROM project_statuses
WHERE tenant_id = '923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b'
ORDER BY order_index;

-- ============================================
-- ESTATÍSTICAS
-- ============================================

DO $$
DECLARE
    v_migrated_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_migrated_count
    FROM project_statuses
    WHERE tenant_id = '923589ed-f5e5-4b94-a5d6-6e2a43f8dc5b'
    AND sla_days IS NOT NULL;

    RAISE NOTICE '✅ Status com SLA configurado em dias: %', v_migrated_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Agora execute o script populate-sla-existing-projects-homolux.sql';
    RAISE NOTICE '   para atualizar os projetos existentes com os novos prazos em DIAS';
END $$;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

COMMIT;

-- ============================================
-- PRÓXIMOS PASSOS
-- ============================================

-- Após executar este script com sucesso:
-- 1. Execute: populate-sla-existing-projects-homolux.sql
--    (para atualizar projetos existentes com prazos em dias)
-- 2. Faça login como Homolux no sistema
-- 3. Vá em /admin/preferencias > aba Kanban
-- 4. Verifique se os prazos aparecem em DIAS (não horas)
-- 5. Verifique se os badges nos cartões mostram "X dias restantes"
