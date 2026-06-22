-- Índices para otimizar queries na tabela projects
-- O índice composto (tenant_id, deleted_at) cobre o filtro mais comum:
-- WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC

CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted
  ON projects(tenant_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at
  ON projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_status
  ON projects(tenant_id, status);
