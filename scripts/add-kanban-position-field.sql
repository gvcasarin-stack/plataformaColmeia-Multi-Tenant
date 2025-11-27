-- 🆕 Migration: Adicionar campo position para ordenação manual no Kanban
-- Data: 2025-01-24
-- Descrição: Adiciona campo para permitir ordenação manual dos cartões dentro das colunas do Kanban

-- 1. Adicionar coluna position (nullable inicialmente)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS kanban_position INTEGER;

-- 2. Popular position inicial baseado na ordem de criação dentro de cada status
-- Isso garante que projetos existentes tenham uma posição inicial
WITH ranked_projects AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, status ORDER BY created_at) as position
  FROM projects
  WHERE kanban_position IS NULL
)
UPDATE projects
SET kanban_position = ranked_projects.position
FROM ranked_projects
WHERE projects.id = ranked_projects.id;

-- 3. Criar índice composto para otimizar queries de ordenação no Kanban
-- Este índice otimiza a query: WHERE tenant_id = X AND status = Y ORDER BY kanban_position
CREATE INDEX IF NOT EXISTS idx_projects_kanban_sort
ON projects(tenant_id, status, kanban_position);

-- 4. Adicionar comentário na coluna para documentação
COMMENT ON COLUMN projects.kanban_position IS 'Posição do projeto no quadro Kanban dentro de sua coluna (status). Usado para ordenação manual.';

-- ✅ Verificação: Contar projetos com position
SELECT
  COUNT(*) as total_projetos,
  COUNT(kanban_position) as projetos_com_position,
  COUNT(*) - COUNT(kanban_position) as projetos_sem_position
FROM projects;

-- ✅ Verificação: Mostrar distribuição de posições por status
SELECT
  status,
  COUNT(*) as total_projetos,
  MIN(kanban_position) as min_position,
  MAX(kanban_position) as max_position,
  AVG(kanban_position)::INTEGER as avg_position
FROM projects
WHERE kanban_position IS NOT NULL
GROUP BY status
ORDER BY status;

-- ✅ Verificação: Mostrar alguns exemplos por tenant
SELECT
  tenant_id,
  status,
  number,
  kanban_position,
  created_at
FROM projects
ORDER BY tenant_id, status, kanban_position
LIMIT 20;
