-- Adicionar coluna visible_in_roadmap à tabela project_statuses
-- Indica se o status deve aparecer no roadmap exibido ao cliente na Vista
-- Expandida do Projeto (funcionalidade a ser migrada posteriormente).
--
-- Regra padrão: todas as etapas aparecem no roadmap, EXCETO as etapas
-- marcadas como conclusão (is_conclusion = true).

ALTER TABLE project_statuses
  ADD COLUMN IF NOT EXISTS visible_in_roadmap boolean NOT NULL DEFAULT true;

-- Backfill: desmarcar etapas de conclusão já existentes
UPDATE project_statuses
SET visible_in_roadmap = false
WHERE is_conclusion = true;

-- Recriar função get_tenant_project_statuses para incluir visible_in_roadmap
-- (precisa recriar porque mudamos o tipo de retorno)

DROP FUNCTION IF EXISTS get_tenant_project_statuses(UUID);

CREATE OR REPLACE FUNCTION get_tenant_project_statuses(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name VARCHAR(100),
  slug VARCHAR(100),
  color VARCHAR(20),
  order_index INTEGER,
  is_default BOOLEAN,
  icon VARCHAR(50),
  is_active BOOLEAN,
  sla_days INTEGER,
  sla_exclude_weekends BOOLEAN,
  is_conclusion BOOLEAN,
  visible_in_roadmap BOOLEAN,
  project_count BIGINT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.tenant_id,
    ps.name,
    ps.slug,
    ps.color,
    ps.order_index,
    ps.is_default,
    ps.icon,
    ps.is_active,
    ps.sla_days,
    ps.sla_exclude_weekends,
    ps.is_conclusion,
    ps.visible_in_roadmap,
    COALESCE(COUNT(p.id), 0)::BIGINT AS project_count,
    ps.created_at,
    ps.updated_at
  FROM project_statuses ps
  LEFT JOIN projects p ON p.status = ps.slug AND p.tenant_id = ps.tenant_id
  WHERE ps.tenant_id = p_tenant_id
    AND ps.is_active = true
  GROUP BY ps.id, ps.tenant_id, ps.name, ps.slug, ps.color, ps.order_index,
           ps.is_default, ps.icon, ps.is_active, ps.sla_days, ps.sla_exclude_weekends,
           ps.is_conclusion, ps.visible_in_roadmap, ps.created_at, ps.updated_at
  ORDER BY ps.order_index ASC;
END;
$$;
