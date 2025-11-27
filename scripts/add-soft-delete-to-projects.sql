-- =====================================================
-- Migration: Adicionar Soft Delete em Projetos
-- Descrição: Adiciona campos para soft delete (arquivamento)
-- Data: 2025-11-02
-- =====================================================

-- Adicionar campos de soft delete na tabela projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL;

-- Criar índice para melhorar performance de queries que filtram projetos não deletados
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- Criar índice composto para queries por tenant e status de deleção
CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted ON projects(tenant_id, deleted_at);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN projects.deleted_at IS 'Data e hora em que o projeto foi arquivado (soft delete). NULL = projeto ativo.';
COMMENT ON COLUMN projects.deleted_by IS 'ID do usuário que arquivou o projeto.';

-- =====================================================
-- Verificação dos campos adicionados
-- =====================================================
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY column_name;
