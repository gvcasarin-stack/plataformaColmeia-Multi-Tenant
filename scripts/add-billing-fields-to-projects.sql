-- Migration: Adicionar campos de billing na tabela projects
-- Data: 2025-01-22
-- Descrição: Adiciona billing_mode e billing_snapshot para congelar informações de cobrança no momento da criação do projeto

-- Adicionar coluna billing_mode (padrão 'avulso' para projetos existentes)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'avulso' CHECK (billing_mode IN ('avulso', 'pacote', 'assinatura'));

-- Adicionar coluna billing_snapshot (JSON com informações de billing congeladas)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS billing_snapshot JSONB DEFAULT NULL;

-- Comentários explicativos
COMMENT ON COLUMN projects.billing_mode IS 'Modalidade de cobrança do projeto no momento da criação: avulso, pacote ou assinatura';
COMMENT ON COLUMN projects.billing_snapshot IS 'Snapshot JSON das informações de billing no momento da criação do projeto (nome do pacote/plano, número do projeto, datas, etc.)';

-- Índice para consultas por billing_mode
CREATE INDEX IF NOT EXISTS idx_projects_billing_mode ON projects(billing_mode);

-- Verificar estrutura
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name IN ('billing_mode', 'billing_snapshot');
