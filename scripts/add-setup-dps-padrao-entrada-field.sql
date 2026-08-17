-- Adicionar campo "DPS no Padrão de Entrada?" ao Setup do Projeto
ALTER TABLE projects ADD COLUMN IF NOT EXISTS setup_dps_padrao_entrada TEXT;
