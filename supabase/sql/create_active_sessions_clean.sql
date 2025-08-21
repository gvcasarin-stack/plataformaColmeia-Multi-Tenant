-- Criar tabela de sessões ativas
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    login_time timestamp with time zone DEFAULT now() NOT NULL,
    last_activity timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address text,
    user_agent text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_is_active ON public.active_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON public.active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_active_sessions_cleanup ON public.active_sessions(is_active, expires_at);

-- Habilitar RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas suas próprias sessões
DROP POLICY IF EXISTS "Users can view own sessions" ON public.active_sessions;
CREATE POLICY "Users can view own sessions" ON public.active_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Política para service_role
DROP POLICY IF EXISTS "Service role can manage all sessions" ON public.active_sessions;
CREATE POLICY "Service role can manage all sessions" ON public.active_sessions
    FOR ALL USING (true);

-- Função para limpeza automática
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.active_sessions 
    SET is_active = false, 
        updated_at = now()
    WHERE is_active = true 
      AND expires_at < now();
END;
$$;

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

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_active_sessions_updated_at ON public.active_sessions;
CREATE TRIGGER update_active_sessions_updated_at
    BEFORE UPDATE ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
