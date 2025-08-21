-- ==============================================
-- 05. CRIAÇÃO DAS TABELAS DE APOIO (MULTI-TENANT)
-- ==============================================
-- Tabelas auxiliares: configs, notifications, active_sessions, financial_transactions

-- ==============================================
-- TABELA: CONFIGS (Configurações por tenant)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identificação da configuração
    category TEXT NOT NULL, -- 'geral', 'kanban', 'email', 'financial', etc
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    
    -- Metadados
    description TEXT,
    is_system BOOLEAN DEFAULT false, -- Se é configuração do sistema (não editável pelo usuário)
    is_encrypted BOOLEAN DEFAULT false, -- Se o valor está criptografado
    
    -- Auditoria
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: chave única por tenant e categoria
    CONSTRAINT configs_category_valid CHECK (category IN ('geral', 'kanban', 'email', 'financial', 'notifications', 'security'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_configs_tenant_category_key ON public.configs(tenant_id, category, key);
CREATE INDEX IF NOT EXISTS idx_configs_tenant_id ON public.configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configs_category ON public.configs(category);

-- ==============================================
-- TABELA: NOTIFICATIONS (Notificações por tenant)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Destinatário
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Conteúdo da notificação
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error
    category TEXT NOT NULL DEFAULT 'system', -- system, project, user, financial
    
    -- Dados adicionais
    data JSONB DEFAULT '{}'::jsonb, -- Dados extras (IDs relacionados, URLs, etc)
    action_url TEXT, -- URL para ação relacionada
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Configurações
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    expires_at TIMESTAMPTZ, -- Data de expiração (opcional)
    
    -- Auditoria
    created_by UUID REFERENCES public.users(id), -- Quem criou (pode ser sistema)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT notifications_type_valid CHECK (type IN ('info', 'success', 'warning', 'error')),
    CONSTRAINT notifications_category_valid CHECK (category IN ('system', 'project', 'user', 'financial', 'security')),
    CONSTRAINT notifications_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON public.notifications(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ==============================================
-- TABELA: ACTIVE_SESSIONS (Sessões ativas por tenant)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Usuário
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Dados da sessão
    session_token TEXT NOT NULL,
    refresh_token TEXT,
    
    -- Informações do dispositivo/browser
    user_agent TEXT,
    ip_address INET,
    device_type TEXT, -- desktop, mobile, tablet
    browser TEXT,
    os TEXT,
    location JSONB, -- País, cidade, etc (se disponível)
    
    -- Status e controle
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_tenant_id ON public.active_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON public.active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON public.active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity);

-- ==============================================
-- TABELA: FINANCIAL_TRANSACTIONS (Transações financeiras)
-- ==============================================
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Relacionamentos
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Dados da transação
    type TEXT NOT NULL, -- income, expense, transfer
    category TEXT NOT NULL, -- project_payment, fixed_cost, equipment, etc
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    
    -- Datas
    transaction_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
    payment_method TEXT, -- credit_card, bank_transfer, pix, cash, etc
    
    -- Informações adicionais
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb, -- URLs de comprovantes, notas fiscais, etc
    
    -- Dados bancários (se aplicável)
    bank_account TEXT,
    transaction_id TEXT, -- ID da transação no banco/gateway
    
    -- Auditoria
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT financial_transactions_type_valid CHECK (type IN ('income', 'expense', 'transfer')),
    CONSTRAINT financial_transactions_status_valid CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT financial_transactions_amount_not_zero CHECK (amount != 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_id ON public.financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_project_id ON public.financial_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_client_id ON public.financial_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON public.financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON public.financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON public.financial_transactions(due_date);

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================
CREATE OR REPLACE TRIGGER update_configs_updated_at
    BEFORE UPDATE ON public.configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_active_sessions_updated_at
    BEFORE UPDATE ON public.active_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- FUNÇÕES AUXILIARES
-- ==============================================

-- Função para obter configuração
CREATE OR REPLACE FUNCTION get_config(org_id UUID, config_category TEXT, config_key TEXT)
RETURNS JSONB AS $$
DECLARE
    config_value JSONB;
BEGIN
    SELECT value INTO config_value
    FROM public.configs
    WHERE tenant_id = org_id
    AND category = config_category
    AND key = config_key;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para definir configuração
CREATE OR REPLACE FUNCTION set_config(
    org_id UUID,
    config_category TEXT,
    config_key TEXT,
    config_value JSONB,
    user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.configs (tenant_id, category, key, value, created_by, updated_by)
    VALUES (org_id, config_category, config_key, config_value, user_id, user_id)
    ON CONFLICT (tenant_id, category, key)
    DO UPDATE SET
        value = EXCLUDED.value,
        updated_by = user_id,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar notificação
CREATE OR REPLACE FUNCTION create_notification(
    org_id UUID,
    target_user_id UUID,
    notification_title TEXT,
    notification_message TEXT,
    notification_type TEXT DEFAULT 'info',
    notification_category TEXT DEFAULT 'system',
    notification_data JSONB DEFAULT '{}'::jsonb,
    created_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        tenant_id, user_id, title, message, type, category, data, created_by
    )
    VALUES (
        org_id, target_user_id, notification_title, notification_message,
        notification_type, notification_category, notification_data, created_by_id
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET 
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = notification_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.active_sessions
    WHERE expires_at < NOW()
    OR last_activity < (NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas financeiras
CREATE OR REPLACE FUNCTION get_financial_summary(
    org_id UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_income NUMERIC,
    total_expenses NUMERIC,
    net_result NUMERIC,
    pending_income NUMERIC,
    pending_expenses NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'paid' THEN amount ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'paid' THEN amount ELSE 0 END), 0) as net_result,
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_expenses
    FROM public.financial_transactions
    WHERE tenant_id = org_id
    AND (start_date IS NULL OR transaction_date >= start_date)
    AND (end_date IS NULL OR transaction_date <= end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.configs IS 'Configurações personalizáveis por tenant/categoria';
COMMENT ON TABLE public.notifications IS 'Sistema de notificações com isolamento por tenant';
COMMENT ON TABLE public.active_sessions IS 'Controle de sessões ativas por usuário/tenant';
COMMENT ON TABLE public.financial_transactions IS 'Transações financeiras com categorização avançada';
COMMENT ON FUNCTION get_config(UUID, TEXT, TEXT) IS 'Obtém valor de configuração específica';
COMMENT ON FUNCTION create_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB, UUID) IS 'Cria nova notificação para usuário';
