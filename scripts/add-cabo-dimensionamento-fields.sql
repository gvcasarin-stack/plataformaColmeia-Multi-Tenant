-- Migração: Campos de Dimensionamento dos Cabos CC e CA (Item 10 do Memorial Descritivo)
-- e características físicas dos módulos (Tabela 4 - Item 7 do Memorial)
-- Execute este script no Supabase SQL Editor antes de usar os novos campos

-- Características físicas dos módulos (Tabela 4)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_eficiencia TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_comprimento_m TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_largura_m TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_area_unitaria_m2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_peso_kg TEXT;

-- Dimensionamento dos Cabos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_isolacao_material TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_cc_secao_mm2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_cc_capacidade_corrente_a TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_cc_fator_temperatura TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_cc_fator_agrupamento TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_ca_secao_mm2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_ca_capacidade_corrente_a TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_ca_fator_temperatura TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cabo_ca_fator_agrupamento TEXT;
