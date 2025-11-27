-- Atualizar função SQL get_tenant_project_statuses para retornar sla_days
-- Esta função é usada pela API para buscar status com contagem de projetos

-- 1. Remover função antiga (necessário porque mudamos o tipo de retorno)
DROP FUNCTION IF EXISTS get_tenant_project_statuses(UUID);

-- 2. Criar função nova com sla_days
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
    COALESCE(COUNT(p.id), 0)::BIGINT as project_count,
    ps.created_at,
    ps.updated_at
  FROM project_statuses ps
  LEFT JOIN projects p ON p.status = ps.slug AND p.tenant_id = ps.tenant_id
  WHERE ps.tenant_id = p_tenant_id
    AND ps.is_active = true
  GROUP BY ps.id, ps.tenant_id, ps.name, ps.slug, ps.color, ps.order_index,
           ps.is_default, ps.icon, ps.is_active, ps.sla_days, ps.sla_exclude_weekends,
           ps.created_at, ps.updated_at
  ORDER BY ps.order_index ASC;
END;
$$;

-- Verificar se a função foi criada corretamente
SELECT
  id,
  name,
  slug,
  sla_days,
  sla_exclude_weekends,
  project_count
FROM get_tenant_project_statuses((SELECT id FROM organizations LIMIT 1))
ORDER BY order_index;
