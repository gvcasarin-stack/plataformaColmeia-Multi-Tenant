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
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_potencia_wp TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_quantidade INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_fabricante TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_modelo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_potencia TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao TEXT;

-- Campos do Memorial Descritivo
ALTER TABLE projects ADD COLUMN IF NOT EXISTS conta_contrato TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS classe_uc TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS numero_poste_transformador TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS numero_condutores_fase INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secao_fase_mm2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secao_neutro_mm2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disjuntor_polos INTEGER;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disjuntor_corrente_a TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS disjuntor_tensao_v TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_fornecimento TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modalidade_compensacao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS planta_situacao_url TEXT;
