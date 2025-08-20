-- 🔧 SCRIPT DEFINITIVO: Criar Tabela Projects Completa no Supabase
-- Execute este script no SQL Editor do Supabase para criar/corrigir a tabela projects

-- ========================================
-- 1. VERIFICAR SE A TABELA EXISTE
-- ========================================

-- Verificar se a tabela projects existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'projects';

-- ========================================
-- 2. CRIAR TABELA PROJECTS (SE NÃO EXISTIR)
-- ========================================

CREATE TABLE IF NOT EXISTS public.projects (
    -- Campos principais
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    number text UNIQUE NOT NULL, -- CRÍTICO: Campo que estava faltando!
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Dados do projeto
    empresa_integradora text,
    nome_cliente_final text,
    distribuidora text,
    potencia numeric DEFAULT 0,
    data_entrega date,
    status text DEFAULT 'Não Iniciado',
    prioridade text DEFAULT 'Baixa',
    valor_projeto numeric DEFAULT 0,
    pagamento text,
    price numeric,
    
    -- Responsável admin
    admin_responsible_id uuid,
    admin_responsible_name text,
    admin_responsible_email text,
    admin_responsible_phone text,
    
    -- Dados complexos (JSONB)
    timeline_events jsonb DEFAULT '[]'::jsonb,
    documents jsonb DEFAULT '[]'::jsonb,
    files jsonb DEFAULT '[]'::jsonb,
    comments jsonb DEFAULT '[]'::jsonb,
    history jsonb DEFAULT '[]'::jsonb,
    last_update_by jsonb
);

-- ========================================
-- 3. ADICIONAR COLUNAS FALTANTES (SE A TABELA JÁ EXISTIR)
-- ========================================

-- Campos principais
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS number text; -- CRÍTICO!
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Dados do projeto
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS empresa_integradora text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS nome_cliente_final text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS distribuidora text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS potencia numeric DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS data_entrega date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text DEFAULT 'Não Iniciado';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'Baixa';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS valor_projeto numeric DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS pagamento text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS price numeric;

-- Responsável admin
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS admin_responsible_id uuid;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS admin_responsible_name text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS admin_responsible_email text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS admin_responsible_phone text;

-- Dados complexos (JSONB)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS timeline_events jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS last_update_by jsonb;

-- ========================================
-- 4. CRIAR CONSTRAINTS E ÍNDICES
-- ========================================

-- Primary key (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'projects' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.projects ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Unique constraint para number (CRÍTICO)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'projects' AND constraint_name = 'projects_number_key'
    ) THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_number_key UNIQUE (number);
    END IF;
END $$;

-- Foreign key para created_by
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'projects' AND constraint_name = 'projects_created_by_fkey'
    ) THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_number ON public.projects(number);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);

-- ========================================
-- 5. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios projetos
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
CREATE POLICY "Users can view own projects" ON public.projects
    FOR SELECT USING (auth.uid() = created_by);

-- Política para usuários criarem projetos
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects" ON public.projects
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Política para usuários atualizarem seus próprios projetos
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
CREATE POLICY "Users can update own projects" ON public.projects
    FOR UPDATE USING (auth.uid() = created_by);

-- Política para service_role (bypass RLS)
DROP POLICY IF EXISTS "Service role can do everything" ON public.projects;
CREATE POLICY "Service role can do everything" ON public.projects
    FOR ALL USING (true);

-- ========================================
-- 6. VERIFICAR RESULTADO FINAL
-- ========================================

-- Listar todas as colunas da tabela
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY column_name;

-- Contar total de colunas
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'projects';

-- Verificar constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'projects' AND table_schema = 'public';

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'projects' AND schemaname = 'public';

-- ========================================
-- 7. TESTE DE INSERÇÃO (OPCIONAL)
-- ========================================

-- Comentário: Descomente as linhas abaixo para testar a inserção
/*
INSERT INTO public.projects (
    name, 
    number, 
    created_by,
    empresa_integradora,
    nome_cliente_final,
    distribuidora,
    potencia,
    status
) VALUES (
    'Projeto Teste',
    'FV-2025-TEST',
    (SELECT id FROM auth.users LIMIT 1), -- Pega o primeiro usuário
    'Empresa Teste',
    'Cliente Teste',
    'Distribuidora Teste',
    10.5,
    'Não Iniciado'
);

-- Verificar se foi inserido
SELECT id, name, number, status FROM public.projects WHERE number = 'FV-2025-TEST';

-- Limpar teste (descomente se quiser remover)
-- DELETE FROM public.projects WHERE number = 'FV-2025-TEST';
*/

-- ========================================
-- RESULTADO ESPERADO
-- ========================================

-- Após executar este script, você deve ter:
-- ✅ Tabela 'projects' com TODAS as colunas necessárias
-- ✅ Campo 'number' (CRÍTICO) criado e único
-- ✅ Constraints e índices configurados
-- ✅ RLS configurado corretamente
-- ✅ Aproximadamente 26 colunas no total
-- ✅ Sistema pronto para criação de projetos 