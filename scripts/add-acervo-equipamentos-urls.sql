-- Migração: Adicionar colunas datasheet_url e inmetro_url na tabela acervo_equipamentos
-- Execute este script no Supabase SQL Editor

ALTER TABLE acervo_equipamentos ADD COLUMN IF NOT EXISTS datasheet_url TEXT;
ALTER TABLE acervo_equipamentos ADD COLUMN IF NOT EXISTS inmetro_url TEXT;
