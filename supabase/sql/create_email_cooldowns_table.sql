-- 🔧 CRIAR TABELA PARA CONTROLE DE COOLDOWN DE E-MAILS
-- Esta tabela armazena quando foi o último e-mail enviado para cada usuário por projeto

CREATE TABLE IF NOT EXISTS public.email_cooldowns (
    -- Chave primária composta: usuário + projeto
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    
    -- Timestamp do último e-mail enviado
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Chave primária composta
    PRIMARY KEY (user_id, project_id)
);

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_user_id ON public.email_cooldowns(user_id);

-- Índice para busca por projeto  
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_project_id ON public.email_cooldowns(project_id);

-- Índice para busca por timestamp (para limpeza)
CREATE INDEX IF NOT EXISTS idx_email_cooldowns_last_sent ON public.email_cooldowns(last_email_sent_at);

-- ========================================
-- CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ========================================

-- Habilitar RLS
ALTER TABLE public.email_cooldowns ENABLE ROW LEVEL SECURITY;

-- Política para service_role (operações do sistema)
CREATE POLICY "Service role can manage email cooldowns" ON public.email_cooldowns
    FOR ALL USING (true);

-- ========================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ========================================

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_email_cooldowns_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_email_cooldowns_updated_at_trigger ON public.email_cooldowns;
CREATE TRIGGER update_email_cooldowns_updated_at_trigger
    BEFORE UPDATE ON public.email_cooldowns
    FOR EACH ROW
    EXECUTE FUNCTION update_email_cooldowns_updated_at();

-- ========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE public.email_cooldowns IS 'Controle de cooldown para envio de e-mails - evita spam';
COMMENT ON COLUMN public.email_cooldowns.user_id IS 'ID do usuário que recebe o e-mail';
COMMENT ON COLUMN public.email_cooldowns.project_id IS 'ID do projeto relacionado ao e-mail';
COMMENT ON COLUMN public.email_cooldowns.last_email_sent_at IS 'Timestamp do último e-mail enviado';
