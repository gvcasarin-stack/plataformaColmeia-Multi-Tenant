-- Adicionar campos técnicos para geração de documentos na tabela projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_conexao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_ramal TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tensao_atendimento TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS coord_utm_fuso TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS coord_utm_x TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS coord_utm_y TEXT;

-- Campos estruturados de equipamentos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_quantidade INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_fabricante TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_modelo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_quantidade INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_fabricante TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_modelo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_potencia TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao TEXT;
