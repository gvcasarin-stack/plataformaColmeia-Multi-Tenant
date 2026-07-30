-- Adicionar campo "É ampliação de sistema existente?" ao Setup do Projeto
ALTER TABLE projects ADD COLUMN IF NOT EXISTS setup_e_ampliacao TEXT;
