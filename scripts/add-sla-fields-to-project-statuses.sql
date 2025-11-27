-- ============================================
-- Script: Adicionar campos de SLA na tabela project_statuses
-- Descrição: Adiciona campos para configuração de SLA (Service Level Agreement)
--            em cada status de projeto para controle de prazos
-- Data: 2025-01-14
-- ============================================

-- Adicionar campo sla_hours (prazo em horas)
-- Este campo armazena o prazo máximo em horas que um projeto pode ficar neste status
-- NULL = sem prazo configurado
ALTER TABLE project_statuses
ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT NULL;

-- Adicionar campo sla_exclude_weekends (ignorar finais de semana)
-- Se TRUE, os finais de semana não são contados no cálculo do prazo
ALTER TABLE project_statuses
ADD COLUMN IF NOT EXISTS sla_exclude_weekends BOOLEAN DEFAULT true;

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN project_statuses.sla_hours IS 'Prazo máximo em horas para projetos neste status. NULL = sem prazo';
COMMENT ON COLUMN project_statuses.sla_exclude_weekends IS 'Se true, finais de semana não contam no cálculo do prazo';

-- Adicionar campos na tabela projects para tracking de SLA
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP DEFAULT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sla_expires_at TIMESTAMP DEFAULT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sla_expired BOOLEAN DEFAULT false;

-- Adicionar comentários nas colunas da tabela projects
COMMENT ON COLUMN projects.status_changed_at IS 'Data/hora em que o projeto mudou para o status atual';
COMMENT ON COLUMN projects.sla_expires_at IS 'Data/hora em que o prazo SLA expira para o status atual';
COMMENT ON COLUMN projects.sla_expired IS 'Flag indicando se o prazo SLA foi ultrapassado';

-- Criar índice para consultas de projetos com SLA expirado
CREATE INDEX IF NOT EXISTS idx_projects_sla_expired
ON projects(tenant_id, sla_expired, sla_expires_at)
WHERE sla_expires_at IS NOT NULL;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se as colunas foram criadas com sucesso
DO $$
BEGIN
    -- Verificar project_statuses
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_statuses'
        AND column_name = 'sla_hours'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'project_statuses'
        AND column_name = 'sla_exclude_weekends'
    ) THEN
        RAISE NOTICE '✅ Campos de SLA adicionados com sucesso na tabela project_statuses';
    ELSE
        RAISE EXCEPTION '❌ Erro: Campos de SLA não foram criados na tabela project_statuses';
    END IF;

    -- Verificar projects
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'status_changed_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'sla_expires_at'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'sla_expired'
    ) THEN
        RAISE NOTICE '✅ Campos de tracking de SLA adicionados com sucesso na tabela projects';
    ELSE
        RAISE EXCEPTION '❌ Erro: Campos de tracking de SLA não foram criados na tabela projects';
    END IF;
END $$;

-- Exibir estrutura atualizada
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'project_statuses'
AND column_name IN ('sla_hours', 'sla_exclude_weekends')
ORDER BY ordinal_position;

SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('status_changed_at', 'sla_expires_at', 'sla_expired')
ORDER BY ordinal_position;

-- ============================================
-- EXEMPLOS DE USO (COMENTADO)
-- ============================================

-- Configurar SLA de 24 horas para status "Em Desenvolvimento"
-- UPDATE project_statuses
-- SET sla_hours = 24, sla_exclude_weekends = true
-- WHERE slug = 'em-desenvolvimento';

-- Configurar SLA de 48 horas para status "Aguardando Assinaturas"
-- UPDATE project_statuses
-- SET sla_hours = 48, sla_exclude_weekends = true
-- WHERE slug = 'aguardando-assinaturas';

-- Buscar projetos com SLA expirado
-- SELECT p.id, p.number, p.status, p.status_changed_at, p.sla_expires_at
-- FROM projects p
-- WHERE p.sla_expired = true
-- ORDER BY p.sla_expires_at DESC;
