-- 🆕 Migration: Adicionar coluna owner_id na tabela projects
-- Data: 2025-01-24
-- Descrição: Adiciona campo para identificar o proprietário do projeto (diferente de created_by)

-- 1. Adicionar coluna owner_id (nullable inicialmente para não quebrar dados existentes)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS owner_id UUID;

-- 2. Popular owner_id com created_by para projetos existentes
UPDATE projects
SET owner_id = created_by
WHERE owner_id IS NULL;

-- 3. Adicionar foreign key constraint
ALTER TABLE projects
ADD CONSTRAINT fk_projects_owner
FOREIGN KEY (owner_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- 4. Criar índice para melhorar performance de queries por owner
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);

-- 5. Criar índice composto tenant_id + owner_id (queries comuns)
CREATE INDEX IF NOT EXISTS idx_projects_tenant_owner ON projects(tenant_id, owner_id);

-- ✅ Verificação: Contar projetos com owner_id
SELECT
  COUNT(*) as total_projetos,
  COUNT(owner_id) as projetos_com_owner,
  COUNT(*) - COUNT(owner_id) as projetos_sem_owner
FROM projects;

-- ✅ Verificação: Mostrar alguns exemplos
SELECT
  id,
  number,
  created_by,
  owner_id,
  CASE
    WHEN created_by = owner_id THEN 'MESMO'
    ELSE 'DIFERENTE'
  END as status_propriedade
FROM projects
LIMIT 10;
