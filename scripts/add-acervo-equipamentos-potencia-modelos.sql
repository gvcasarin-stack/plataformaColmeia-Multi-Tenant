-- Migração: Adicionar potencia e modelos (array) na tabela acervo_equipamentos
-- Execute este script no Supabase SQL Editor

ALTER TABLE acervo_equipamentos ADD COLUMN IF NOT EXISTS potencia NUMERIC;
ALTER TABLE acervo_equipamentos ADD COLUMN IF NOT EXISTS modelos TEXT[] DEFAULT '{}';
