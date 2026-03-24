-- Adicionar campos técnicos para geração de documentos na tabela projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_conexao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_ramal TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tensao_atendimento TEXT;
