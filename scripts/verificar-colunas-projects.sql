-- Script para verificar os nomes exatos das colunas da tabela projects
-- Execute este script no Supabase SQL Editor ou qualquer cliente PostgreSQL

-- 1. Listar TODAS as colunas da tabela projects com seus tipos
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Ver um projeto de exemplo com TODOS os campos
-- (para confirmar os valores reais)
SELECT *
FROM projects
LIMIT 1;

-- 3. Buscar especificamente colunas relacionadas a "cliente" e "potencia"
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
    AND table_schema = 'public'
    AND (
        column_name ILIKE '%cliente%'
        OR column_name ILIKE '%potencia%'
        OR column_name ILIKE '%kwp%'
    )
ORDER BY column_name;
