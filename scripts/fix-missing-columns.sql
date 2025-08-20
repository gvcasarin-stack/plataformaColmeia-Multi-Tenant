-- 🔧 SCRIPT PARA CORRIGIR COLUNAS FALTANTES NA TABELA PROJECTS
-- Execute este script no SQL Editor do Supabase

-- Verificar se a tabela projects existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'projects';

-- Verificar colunas existentes na tabela projects
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- Adicionar colunas JSONB faltantes (se não existirem)
-- Estas colunas são essenciais para o funcionamento do sistema

-- 1. Coluna comments (CRÍTICA - causando o erro atual)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;

-- 2. Coluna timeline_events
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS timeline_events jsonb DEFAULT '[]'::jsonb;

-- 3. Coluna documents
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- 4. Coluna files
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;

-- 5. Coluna history
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;

-- 6. Coluna last_update_by
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS last_update_by jsonb;

-- Verificar se todas as colunas foram adicionadas
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects'
AND column_name IN ('comments', 'timeline_events', 'documents', 'files', 'history', 'last_update_by')
ORDER BY column_name;

-- Comentário: Execute este script no Supabase Dashboard > SQL Editor 