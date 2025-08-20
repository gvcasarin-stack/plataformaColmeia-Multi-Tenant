-- ✅ SUPABASE - Tabela de Sessões Ativas para Controle de Segurança
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- 1. CRIAR TABELA ACTIVE_SESSIONS
-- ========================================

CREATE TABLE IF NOT EXISTS public.active_sessions (
    -- Campos principais
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Timestamps de controle
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    
    -- Informações de segurança
    ip_address text,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL,
    
    -- Metadados
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ========================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);

-- Índice para busca por sessões ativas
CREATE INDEX IF NOT EXISTS idx_active_sessions_is_active ON public.active_sessions(is_active);

-- Índice para busca por expiração
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON public.active_sessions(expires_at);

-- Índice para busca por última atividade
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity);

-- Índice composto para limpeza de sessões expiradas
CREATE INDEX IF NOT EXISTS idx_active_sessions_cleanup ON public.active_sessions(is_active, expires_at);

-- ========================================
-- 3. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias sessões
DROP POLICY IF EXISTS "Users can view own sessions" ON public.active_sessions;
CREATE POLICY "Users can view own sessions" ON public.active_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Política para service_role (bypass RLS para operações do sistema)
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.active_sessions;
CREATE POLICY "Service role can manage all sessions" ON public.active_sessions
    FOR ALL USING (true);

-- ========================================
-- 4. FUNÇÃO PARA LIMPEZA AUTOMÁTICA
-- ========================================

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Marcar sessões expiradas como inativas
    UPDATE public.active_sessions 
    SET is_active = false, 
        updated_at = now()
    WHERE is_active = true 
      AND expires_at < now();
    
    -- Log da operação
    RAISE NOTICE 'Sessões expiradas limpas em %', now();
END;
$$;

-- ========================================
-- 5. TRIGGER PARA ATUALIZAR updated_at
-- ========================================

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger para atualizar updated_at automaticamente
DROP TRIGGER IF EXISTS update_active_sessions_updated_at ON public.active_sessions;
CREATE TRIGGER update_active_sessions_updated_at
    BEFORE UPDATE ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. CONFIGURAR LIMPEZA AUTOMÁTICA (CRON)
-- ========================================

-- Agendar limpeza automática a cada 30 minutos
-- Nota: Requer extensão pg_cron habilitada no Supabase
SELECT cron.schedule(
    'cleanup-expired-sessions',
    '*/30 * * * *', -- A cada 30 minutos
    'SELECT cleanup_expired_sessions();'
);

-- ========================================
-- 7. VERIFICAR RESULTADO
-- ========================================

-- Verificar se a tabela foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'active_sessions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'active_sessions' 
    AND schemaname = 'public';

-- Verificar políticas RLS
SELECT policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'active_sessions';

-- ========================================
-- 8. TESTE BÁSICO (OPCIONAL)
-- ========================================

-- Inserir uma sessão de teste (descomente para testar)
/*
INSERT INTO public.active_sessions (
    user_id,
    ip_address,
    user_agent,
    expires_at
) VALUES (
    auth.uid(), -- Usar o usuário atual
    '127.0.0.1',
    'Test User Agent',
    now() + interval '8 hours'
);
*/

-- Verificar se a inserção funcionou
-- SELECT * FROM public.active_sessions WHERE user_id = auth.uid();

RAISE NOTICE '✅ Tabela active_sessions criada com sucesso!';
RAISE NOTICE '📋 Execute: SELECT * FROM public.active_sessions; para verificar';
RAISE NOTICE '🧹 Limpeza automática configurada para rodar a cada 30 minutos'; 