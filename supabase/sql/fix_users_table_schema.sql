-- ============================================================================
-- CORREÇÃO CRÍTICA: Schema da Tabela Users para Supabase
-- ============================================================================
-- Este script adiciona as colunas que estão faltando na tabela users
-- para compatibilidade com o sistema migrado do Firebase

-- ============================================================================
-- 1. ADICIONAR COLUNAS QUE ESTÃO FALTANDO
-- ============================================================================

-- Adicionar coluna pending_approval se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'pending_approval'
    ) THEN
        ALTER TABLE users ADD COLUMN pending_approval BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna pending_approval adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna pending_approval já existe na tabela users';
    END IF;
END $$;

-- Adicionar coluna is_company se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_company'
    ) THEN
        ALTER TABLE users ADD COLUMN is_company BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Coluna is_company adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna is_company já existe na tabela users';
    END IF;
END $$;

-- Adicionar coluna company_name se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE users ADD COLUMN company_name TEXT;
        RAISE NOTICE '✅ Coluna company_name adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna company_name já existe na tabela users';
    END IF;
END $$;

-- Adicionar coluna cnpj se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'cnpj'
    ) THEN
        ALTER TABLE users ADD COLUMN cnpj TEXT;
        RAISE NOTICE '✅ Coluna cnpj adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna cnpj já existe na tabela users';
    END IF;
END $$;

-- Adicionar coluna cpf se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'cpf'
    ) THEN
        ALTER TABLE users ADD COLUMN cpf TEXT;
        RAISE NOTICE '✅ Coluna cpf adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna cpf já existe na tabela users';
    END IF;
END $$;

-- Adicionar colunas de notificação se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_notification_status'
    ) THEN
        ALTER TABLE users ADD COLUMN email_notification_status BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Coluna email_notification_status adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna email_notification_status já existe na tabela users';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_notification_documents'
    ) THEN
        ALTER TABLE users ADD COLUMN email_notification_documents BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Coluna email_notification_documents adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna email_notification_documents já existe na tabela users';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_notification_comments'
    ) THEN
        ALTER TABLE users ADD COLUMN email_notification_comments BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Coluna email_notification_comments adicionada à tabela users';
    ELSE
        RAISE NOTICE '⚠️ Coluna email_notification_comments já existe na tabela users';
    END IF;
END $$;

-- ============================================================================
-- 2. VERIFICAR SE A COLUNA full_name EXISTE (RENOMEAR name SE NECESSÁRIO)
-- ============================================================================

DO $$
BEGIN
    -- Se full_name não existe mas name existe, renomear
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        ALTER TABLE users RENAME COLUMN name TO full_name;
        RAISE NOTICE '✅ Coluna name renomeada para full_name na tabela users';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        RAISE NOTICE '⚠️ Coluna full_name já existe na tabela users';
    ELSE
        -- Se nem name nem full_name existem, criar full_name
        ALTER TABLE users ADD COLUMN full_name TEXT;
        RAISE NOTICE '✅ Coluna full_name criada na tabela users';
    END IF;
END $$;

-- ============================================================================
-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice para pending_approval (usado frequentemente nas consultas)
CREATE INDEX IF NOT EXISTS idx_users_pending_approval ON users(pending_approval);

-- Índice para role (usado frequentemente nas consultas)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índice para is_company (usado nas consultas de clientes)
CREATE INDEX IF NOT EXISTS idx_users_is_company ON users(is_company);

-- Índice para email (usado para login e busca)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 4. ATUALIZAR POLÍTICA RLS SE NECESSÁRIO
-- ============================================================================

-- Verificar se RLS está habilitado
DO $$
BEGIN
    -- Habilitar RLS na tabela users se não estiver habilitado
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' AND rowsecurity = true
    ) THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado na tabela users';
    ELSE
        RAISE NOTICE '⚠️ RLS já está habilitado na tabela users';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFICAÇÃO FINAL E RELATÓRIO
-- ============================================================================

DO $$
DECLARE
    users_count INTEGER;
    pending_count INTEGER;
    columns_info TEXT;
BEGIN
    -- Contar total de usuários
    SELECT COUNT(*) INTO users_count FROM users;
    
    -- Contar usuários pendentes (se a coluna existir)
    BEGIN
        SELECT COUNT(*) INTO pending_count FROM users WHERE pending_approval = true;
    EXCEPTION WHEN undefined_column THEN
        pending_count := 0;
        RAISE NOTICE '⚠️ Coluna pending_approval ainda não foi criada';
    END;
    
    -- Listar colunas existentes
    SELECT string_agg(column_name, ', ' ORDER BY column_name) INTO columns_info
    FROM information_schema.columns 
    WHERE table_name = 'users' AND table_schema = 'public';
    
    RAISE NOTICE '📊 RELATÓRIO DA CORREÇÃO DA TABELA USERS:';
    RAISE NOTICE '👥 Total de usuários: %', users_count;
    RAISE NOTICE '⏳ Usuários pendentes de aprovação: %', pending_count;
    RAISE NOTICE '📋 Colunas na tabela users: %', columns_info;
    RAISE NOTICE '✅ Correção do schema da tabela users concluída!';
    RAISE NOTICE '🎉 Agora a página /admin/clientes deve funcionar corretamente!';
END $$;
