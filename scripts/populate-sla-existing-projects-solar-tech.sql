-- ============================================
-- Script: Popular campos SLA em projetos existentes - SOLAR TECH ENERGIA
-- Descrição: Preenche campos de SLA (status_changed_at, sla_expires_at, sla_expired)
--            para todos os projetos existentes da organização Solar Tech Energia
-- Tenant: Solar Tech Energia (061ff77b-8b3a-4732-9158-a574c1f1690a)
-- Data: 2025-01-14
-- ============================================

-- ⚠️ ATENÇÃO: Este script afeta APENAS a organização Solar Tech Energia
-- Para testar antes de aplicar em produção para todas as organizações

BEGIN;

-- Verificar se a organização existe
DO $$
DECLARE
    v_org_name TEXT;
BEGIN
    SELECT name INTO v_org_name
    FROM organizations
    WHERE id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

    IF v_org_name IS NULL THEN
        RAISE EXCEPTION '❌ Organização Solar Tech Energia não encontrada!';
    ELSE
        RAISE NOTICE '✅ Organização encontrada: %', v_org_name;
    END IF;
END $$;

-- ============================================
-- FUNÇÃO AUXILIAR: Calcular data de expiração do SLA
-- ============================================

CREATE OR REPLACE FUNCTION calculate_sla_expiration(
    p_start_date TIMESTAMPTZ,
    p_sla_days INTEGER,
    p_exclude_weekends BOOLEAN DEFAULT true
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
    v_current_date TIMESTAMPTZ;
    v_days_added INTEGER := 0;
BEGIN
    -- Se não tem SLA configurado, retorna NULL
    IF p_sla_days IS NULL OR p_sla_days <= 0 THEN
        RETURN NULL;
    END IF;

    v_current_date := p_start_date;

    -- Se não exclui finais de semana, apenas adiciona os dias
    IF NOT p_exclude_weekends THEN
        RETURN v_current_date + (p_sla_days || ' days')::INTERVAL;
    END IF;

    -- Adicionar dias úteis (excluindo finais de semana)
    WHILE v_days_added < p_sla_days LOOP
        v_current_date := v_current_date + INTERVAL '1 day';

        -- Se não for sábado (6) nem domingo (0), conta o dia
        IF EXTRACT(DOW FROM v_current_date) NOT IN (0, 6) THEN
            v_days_added := v_days_added + 1;
        END IF;
    END LOOP;

    RETURN v_current_date;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- POPULAR CAMPOS SLA NOS PROJETOS EXISTENTES
-- ============================================

-- Contar projetos antes da atualização
DO $$
DECLARE
    v_total_projects INTEGER;
    v_projects_without_sla INTEGER;
BEGIN
    -- Total de projetos da Solar Tech
    SELECT COUNT(*)
    INTO v_total_projects
    FROM projects
    WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

    -- Projetos sem SLA configurado
    SELECT COUNT(*)
    INTO v_projects_without_sla
    FROM projects
    WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND status_changed_at IS NULL;

    RAISE NOTICE '📊 Total de projetos Solar Tech: %', v_total_projects;
    RAISE NOTICE '📊 Projetos sem SLA: %', v_projects_without_sla;
END $$;

-- Atualizar projetos com campos SLA
WITH project_status_config AS (
    -- Buscar configurações de SLA por status
    SELECT
        ps.slug,
        ps.sla_days,
        ps.sla_exclude_weekends
    FROM project_statuses ps
    WHERE ps.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
),
projects_to_update AS (
    -- Selecionar projetos que precisam de SLA
    SELECT
        p.id,
        p.status,
        p.updated_at,
        psc.sla_days,
        psc.sla_exclude_weekends
    FROM projects p
    INNER JOIN project_status_config psc ON p.status = psc.slug
    WHERE p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND p.status_changed_at IS NULL  -- Apenas projetos sem SLA
    AND psc.sla_days IS NOT NULL     -- Apenas se o status tem SLA configurado
    AND psc.sla_days > 0
)
UPDATE projects p
SET
    status_changed_at = ptu.updated_at,  -- Usar data da última atualização
    sla_expires_at = calculate_sla_expiration(
        ptu.updated_at,
        ptu.sla_days,
        COALESCE(ptu.sla_exclude_weekends, true)
    ),
    sla_expired = CASE
        WHEN calculate_sla_expiration(
            ptu.updated_at,
            ptu.sla_days,
            COALESCE(ptu.sla_exclude_weekends, true)
        ) < NOW() THEN true
        ELSE false
    END,
    updated_at = NOW()  -- Atualizar timestamp de modificação
FROM projects_to_update ptu
WHERE p.id = ptu.id;

-- ============================================
-- VERIFICAÇÃO DOS RESULTADOS
-- ============================================

DO $$
DECLARE
    v_updated_count INTEGER;
    v_with_sla_count INTEGER;
    v_expired_count INTEGER;
BEGIN
    -- Projetos atualizados (agora com SLA)
    SELECT COUNT(*)
    INTO v_with_sla_count
    FROM projects
    WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND status_changed_at IS NOT NULL;

    -- Projetos com SLA expirado
    SELECT COUNT(*)
    INTO v_expired_count
    FROM projects
    WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND sla_expired = true;

    RAISE NOTICE '✅ Projetos com SLA configurado: %', v_with_sla_count;
    RAISE NOTICE '⚠️  Projetos com SLA expirado: %', v_expired_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Execute o SELECT abaixo para ver os detalhes:';
END $$;

-- Exibir amostra dos projetos atualizados
SELECT
    p.number AS "Número",
    p.nome_cliente_final AS "Cliente",
    ps.name AS "Status",
    p.status_changed_at AS "Mudou em",
    p.sla_expires_at AS "Expira em",
    CASE
        WHEN p.sla_expired THEN '🔴 ATRASADO'
        WHEN p.sla_expires_at IS NULL THEN '⚪ Sem SLA'
        WHEN p.sla_expires_at < NOW() + INTERVAL '1 day' THEN '🟡 ALERTA'
        ELSE '🟢 NO PRAZO'
    END AS "Situação SLA",
    CASE
        WHEN p.sla_expired THEN
            EXTRACT(EPOCH FROM (NOW() - p.sla_expires_at)) / 3600 || 'h atrasado'
        WHEN p.sla_expires_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (p.sla_expires_at - NOW())) / 3600 || 'h restantes'
        ELSE 'N/A'
    END AS "Prazo"
FROM projects p
LEFT JOIN project_statuses ps ON p.status = ps.slug AND ps.tenant_id = p.tenant_id
WHERE p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
AND p.status_changed_at IS NOT NULL
ORDER BY
    CASE
        WHEN p.sla_expired THEN 1
        WHEN p.sla_expires_at < NOW() + INTERVAL '1 day' THEN 2
        ELSE 3
    END,
    p.sla_expires_at ASC
LIMIT 20;

-- ============================================
-- ESTATÍSTICAS POR STATUS
-- ============================================

SELECT
    ps.name AS "Status",
    ps.sla_days AS "Prazo (dias)",
    COUNT(p.id) AS "Total Projetos",
    COUNT(CASE WHEN p.sla_expired THEN 1 END) AS "Atrasados",
    COUNT(CASE WHEN p.sla_expires_at IS NOT NULL AND NOT p.sla_expired THEN 1 END) AS "No Prazo",
    COUNT(CASE WHEN p.sla_expires_at IS NULL THEN 1 END) AS "Sem SLA"
FROM project_statuses ps
LEFT JOIN projects p ON p.status = ps.slug
    AND p.tenant_id = ps.tenant_id
    AND p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
WHERE ps.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
GROUP BY ps.name, ps.sla_days, ps.order_index
ORDER BY ps.order_index;

-- ============================================
-- FINALIZAÇÃO
-- ============================================

-- ⚠️ IMPORTANTE: Revise os resultados acima antes de fazer COMMIT!
-- Se estiver tudo correto, execute: COMMIT;
-- Se houver problemas, execute: ROLLBACK;

COMMIT;

-- Limpar função temporária
DROP FUNCTION IF EXISTS calculate_sla_expiration(TIMESTAMPTZ, INTEGER, BOOLEAN);

-- ============================================
-- INSTRUÇÕES PÓS-EXECUÇÃO
-- ============================================

-- Após executar este script com sucesso:
-- 1. Acesse o sistema web da Solar Tech Energia
-- 2. Vá para a página de projetos (Kanban)
-- 3. Verifique se os badges de SLA aparecem nos cartões
-- 4. Teste mover um cartão para ver se o SLA é recalculado
-- 5. Se tudo estiver funcionando, execute o script para outras organizações

-- Para aplicar em TODAS as organizações, use o script:
-- populate-sla-existing-projects-all-tenants.sql
