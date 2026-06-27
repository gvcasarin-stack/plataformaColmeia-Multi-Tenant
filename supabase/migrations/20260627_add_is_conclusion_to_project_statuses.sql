-- Adicionar coluna is_conclusion à tabela project_statuses
-- Indica qual status representa "projeto concluído" para fins de métricas

ALTER TABLE project_statuses
  ADD COLUMN IF NOT EXISTS is_conclusion boolean NOT NULL DEFAULT false;

-- Recriar função get_tenant_project_statuses para incluir is_conclusion
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
    COALESCE(COUNT(p.id), 0)::BIGINT AS project_count,
    ps.created_at,
    ps.updated_at
  FROM project_statuses ps
  LEFT JOIN projects p ON p.status = ps.slug AND p.tenant_id = ps.tenant_id
  WHERE ps.tenant_id = p_tenant_id
    AND ps.is_active = true
  GROUP BY ps.id, ps.tenant_id, ps.name, ps.slug, ps.color, ps.order_index,
           ps.is_default, ps.icon, ps.is_active, ps.sla_days, ps.sla_exclude_weekends,
           ps.is_conclusion, ps.created_at, ps.updated_at
  ORDER BY ps.order_index ASC;
END;
$$;
