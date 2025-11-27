-- ========================================
-- Script: Adicionar FKs de Pacotes e Assinaturas em Projects
-- Data: 2025-01-26
-- Descrição: Adiciona colunas para vincular projetos a pacotes e assinaturas específicas
-- ========================================

-- Adicionar colunas FK para pacotes e assinaturas
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cliente_pacote_id UUID REFERENCES cliente_pacotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_assinatura_id UUID REFERENCES cliente_assinaturas(id) ON DELETE SET NULL;

-- Adicionar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_projects_cliente_pacote_id ON projects(cliente_pacote_id);
CREATE INDEX IF NOT EXISTS idx_projects_cliente_assinatura_id ON projects(cliente_assinatura_id);

-- Adicionar comentários para documentação
COMMENT ON COLUMN projects.cliente_pacote_id IS 'FK para cliente_pacotes - indica qual pacote específico gerou este projeto';
COMMENT ON COLUMN projects.cliente_assinatura_id IS 'FK para cliente_assinaturas - indica qual assinatura específica gerou este projeto';

-- Verificação de integridade: projetos não devem ter ambas as FKs preenchidas
ALTER TABLE projects ADD CONSTRAINT check_billing_exclusivity
  CHECK (
    (cliente_pacote_id IS NULL OR cliente_assinatura_id IS NULL)
  );

COMMENT ON CONSTRAINT check_billing_exclusivity ON projects IS 'Garante que um projeto pertence apenas a um pacote OU a uma assinatura, nunca ambos';
