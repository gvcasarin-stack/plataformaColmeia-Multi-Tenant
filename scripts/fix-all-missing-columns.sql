-- 🔧 SCRIPT COMPLETO PARA CORRIGIR TODAS AS COLUNAS FALTANTES
-- Execute este script no SQL Editor do Supabase

-- Verificar colunas existentes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY column_name;

-- ========================================
-- ADICIONAR TODAS AS COLUNAS FALTANTES
-- ========================================

-- Colunas básicas de dados do projeto
ALTER TABLE projects ADD COLUMN IF NOT EXISTS empresa_integradora text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS nome_cliente_final text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS distribuidora text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS potencia numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data_entrega date;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Não Iniciado';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'Baixa';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS valor_projeto numeric DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pagamento text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS price numeric;

-- Colunas de responsável admin
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_responsible_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_responsible_name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_responsible_email text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_responsible_phone text;

-- Colunas JSONB para dados complexos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS timeline_events jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_update_by jsonb;

-- Colunas de timestamp (se não existirem)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- ========================================
-- VERIFICAR SE TODAS FORAM ADICIONADAS
-- ========================================

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY column_name;

-- ========================================
-- CONTAR TOTAL DE COLUNAS
-- ========================================

SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects';

-- Comentário: Este script adiciona TODAS as colunas necessárias para o funcionamento completo 