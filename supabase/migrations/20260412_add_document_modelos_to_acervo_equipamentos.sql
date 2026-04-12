-- Adiciona colunas de modelos aplicáveis por documento (datasheet e inmetro)
-- Separadas da lista geral de modelos do equipamento
ALTER TABLE acervo_equipamentos
  ADD COLUMN IF NOT EXISTS datasheet_modelos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inmetro_modelos TEXT[] DEFAULT '{}';
