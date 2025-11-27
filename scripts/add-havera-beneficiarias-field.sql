-- Script para adicionar campo havera_beneficiarias na tabela projects
-- Este campo indica se o projeto terá compensação de créditos com unidades beneficiárias

-- Adicionar coluna havera_beneficiarias (booleana, padrão false)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS havera_beneficiarias BOOLEAN DEFAULT false;

-- Adicionar comentário na coluna para documentação
COMMENT ON COLUMN projects.havera_beneficiarias IS 'Indica se o projeto terá compensação de créditos com unidades beneficiárias';

-- Verificar se a coluna foi adicionada com sucesso
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'havera_beneficiarias';
