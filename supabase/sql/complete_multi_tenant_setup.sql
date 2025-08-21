-- ==============================================
-- CONFIGURAÇÃO COMPLETA MULTI-TENANT - SCRIPT ÚNICO
-- ==============================================
-- Execute este arquivo completo no Supabase SQL Editor
-- Sistema: SGF Multi-Tenant Platform v1.0.0

SELECT '🚀 Iniciando configuração completa do sistema multi-tenant...' as status;

-- ==============================================
-- 01. TABELA ORGANIZATIONS (TENANTS)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.organizations (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Nome da empresa
    slug TEXT UNIQUE NOT NULL, -- Subdomínio: empresa-abc (para empresa-abc.seuapp.com)
    
    -- Configurações do plano
    plan TEXT NOT NULL DEFAULT 'basico', -- basico, profissional
    plan_limits JSONB NOT NULL DEFAULT '{
        "max_users": 10,
        "max_projects": 30,
        "max_storage_gb": 3,
        "max_clients": 100,
        "features": ["basic_support"]
    }'::jsonb,
    
    -- Configurações gerais
    settings JSONB DEFAULT '{
        "timezone": "America/Sao_Paulo",
        "currency": "BRL",
        "date_format": "DD/MM/YYYY",
        "language": "pt-BR"
    }'::jsonb,
    
    -- Informações de contato
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Status da organização
    status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    
    -- Informações de cobrança
    billing_email TEXT,
    billing_address JSONB,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
    CONSTRAINT organizations_plan_valid CHECK (plan IN ('basico', 'profissional')),
    CONSTRAINT organizations_status_valid CHECK (status IN ('active', 'suspended', 'cancelled'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Passo 1 concluído: Tabela organizations criada' as status;

-- ==============================================
-- 02. TABELA USERS (MULTI-TENANT)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.users (
    -- Identificação (compatível com Supabase Auth)
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Informações pessoais
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    
    -- Sistema de roles multi-level
    role TEXT NOT NULL DEFAULT 'client', -- superadmin, admin, client, technician, manager
    user_type TEXT NOT NULL DEFAULT 'client', -- Para compatibilidade: admin, client, superadmin
    
    -- Permissões específicas (além do role)
    permissions JSONB DEFAULT '{
        "can_create_projects": true,
        "can_edit_projects": false,
        "can_delete_projects": false,
        "can_manage_users": false,
        "can_view_financials": false,
        "can_export_data": false
    }'::jsonb,
    
    -- Status do usuário
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, blocked, pending
    is_blocked BOOLEAN DEFAULT false,
    blocked_reason TEXT,
    blocked_at TIMESTAMPTZ,
    blocked_by UUID REFERENCES public.users(id),
    
    -- Configurações do usuário
    settings JSONB DEFAULT '{
        "notifications": {
            "email": true,
            "push": true,
            "project_updates": true,
            "system_alerts": true
        },
        "preferences": {
            "theme": "light",
            "language": "pt-BR",
            "timezone": "America/Sao_Paulo"
        }
    }'::jsonb,
    
    -- Informações de acesso
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    auth_provider TEXT DEFAULT 'supabase',
    
    -- Informações adicionais
    avatar_url TEXT,
    department TEXT,
    position TEXT,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    
    -- Constraints
    CONSTRAINT users_role_valid CHECK (role IN ('superadmin', 'admin', 'client', 'technician', 'manager')),
    CONSTRAINT users_user_type_valid CHECK (user_type IN ('superadmin', 'admin', 'client')),
    CONSTRAINT users_status_valid CHECK (status IN ('active', 'inactive', 'blocked', 'pending')),
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON public.users(tenant_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_tenant ON public.users(email, tenant_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Passo 2 concluído: Tabela users criada' as status;

-- ==============================================
-- 03. TABELA PROJECTS (MULTI-TENANT)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.projects (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Campos básicos
    name TEXT NOT NULL,
    number TEXT NOT NULL, -- Número único do projeto (ex: FV-2024-001)
    description TEXT,
    
    -- Relacionamentos
    created_by UUID NOT NULL REFERENCES public.users(id),
    client_id UUID, -- Será criada constraint após criar tabela clients
    
    -- Campos específicos do projeto de energia solar
    empresa_integradora TEXT NOT NULL DEFAULT '',
    nome_cliente_final TEXT NOT NULL DEFAULT '',
    distribuidora TEXT NOT NULL DEFAULT '',
    potencia NUMERIC NOT NULL DEFAULT 0, -- Potência em kW
    data_entrega DATE,
    
    -- Status e prioridade
    status TEXT NOT NULL DEFAULT 'Não Iniciado',
    prioridade TEXT NOT NULL DEFAULT 'Baixa', -- 'Baixa', 'Média', 'Alta', 'Urgente'
    
    -- Campos financeiros
    valor_projeto NUMERIC DEFAULT 0,
    pagamento TEXT,
    price NUMERIC,
    
    -- Responsável admin
    admin_responsible_id UUID REFERENCES public.users(id),
    admin_responsible_name TEXT,
    admin_responsible_email TEXT,
    admin_responsible_phone TEXT,
    
    -- Campos JSONB para dados complexos
    timeline_events JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    files JSONB DEFAULT '[]'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    history JSONB DEFAULT '[]'::jsonb,
    last_update_by JSONB,
    
    -- Dados técnicos específicos
    lista_materiais JSONB DEFAULT '[]'::jsonb,
    disjuntor_padrao_entrada TEXT,
    tipo_ligacao TEXT, -- monofasico, bifasico, trifasico
    tensao_nominal TEXT,
    coordenadas JSONB,
    endereco_instalacao JSONB,
    
    -- Configurações e metadados
    settings JSONB DEFAULT '{
        "notifications_enabled": true,
        "auto_timeline": true,
        "require_approval": false
    }'::jsonb,
    
    -- Campos de controle
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.users(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT projects_status_valid CHECK (status IN (
        'Não Iniciado', 'Em Desenvolvimento', 'Aguardando', 'Homologação',
        'Projeto Aprovado', 'Aguardando Vistoria', 'Projeto Pausado', 
        'Em Vistoria', 'Finalizado', 'Cancelado'
    )),
    CONSTRAINT projects_prioridade_valid CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Urgente')),
    CONSTRAINT projects_tipo_ligacao_valid CHECK (tipo_ligacao IN ('monofasico', 'bifasico', 'trifasico')),
    CONSTRAINT projects_potencia_positive CHECK (potencia >= 0),
    CONSTRAINT projects_valor_positive CHECK (valor_projeto >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON public.projects(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_number_tenant ON public.projects(tenant_id, number);

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Passo 3 concluído: Tabela projects criada' as status;

-- ==============================================
-- 04. TABELA CLIENTS (MULTI-TENANT)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.clients (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Informações básicas
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Informações de contato
    contact_person TEXT,
    secondary_phone TEXT,
    website TEXT,
    
    -- Endereço
    address JSONB DEFAULT '{
        "street": "",
        "number": "",
        "complement": "",
        "neighborhood": "",
        "city": "",
        "state": "",
        "zip_code": "",
        "country": "Brasil"
    }'::jsonb,
    
    -- Informações comerciais
    company_type TEXT, -- pessoa_fisica, pessoa_juridica, MEI, etc
    document_number TEXT, -- CPF ou CNPJ
    state_registration TEXT,
    municipal_registration TEXT,
    
    -- Configurações do cliente
    settings JSONB DEFAULT '{
        "notifications": {
            "project_updates": true,
            "payment_reminders": true,
            "system_alerts": false
        },
        "preferences": {
            "communication_method": "email",
            "invoice_format": "pdf"
        }
    }'::jsonb,
    
    -- Informações financeiras
    credit_limit NUMERIC DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    preferred_payment_method TEXT,
    
    -- Status e classificação
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, blocked
    category TEXT DEFAULT 'standard', -- standard, premium, vip
    source TEXT,
    
    -- Informações adicionais
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Relacionamentos
    created_by UUID NOT NULL REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_contact TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT clients_status_valid CHECK (status IN ('active', 'inactive', 'blocked')),
    CONSTRAINT clients_category_valid CHECK (category IN ('standard', 'premium', 'vip')),
    CONSTRAINT clients_company_type_valid CHECK (company_type IN ('pessoa_fisica', 'pessoa_juridica', 'MEI', 'cooperativa', 'associacao')),
    CONSTRAINT clients_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT clients_credit_limit_positive CHECK (credit_limit >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON public.clients(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_tenant ON public.clients(email, tenant_id) WHERE email IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Adicionar constraint de foreign key para client_id na tabela projects
ALTER TABLE public.projects 
ADD CONSTRAINT fk_projects_client_id 
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;

SELECT '✅ Passo 4 concluído: Tabela clients criada e relacionamentos configurados' as status;

-- ==============================================
-- 05. TABELAS DE APOIO
-- ==============================================

-- TABELA: CONFIGS
CREATE TABLE IF NOT EXISTS public.configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT configs_category_valid CHECK (category IN ('geral', 'kanban', 'email', 'financial', 'notifications', 'security'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_configs_tenant_category_key ON public.configs(tenant_id, category, key);

-- TABELA: NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    category TEXT NOT NULL DEFAULT 'system',
    data JSONB DEFAULT '{}'::jsonb,
    action_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal',
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT notifications_type_valid CHECK (type IN ('info', 'success', 'warning', 'error')),
    CONSTRAINT notifications_category_valid CHECK (category IN ('system', 'project', 'user', 'financial', 'security')),
    CONSTRAINT notifications_priority_valid CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON public.notifications(tenant_id, user_id);

-- TABELA: ACTIVE_SESSIONS
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL,
    refresh_token TEXT,
    user_agent TEXT,
    ip_address INET,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location JSONB,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_tenant_user ON public.active_sessions(tenant_id, user_id);

-- TABELA: FINANCIAL_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'BRL',
    transaction_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    bank_account TEXT,
    transaction_id TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT financial_transactions_type_valid CHECK (type IN ('income', 'expense', 'transfer')),
    CONSTRAINT financial_transactions_status_valid CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    CONSTRAINT financial_transactions_amount_not_zero CHECK (amount != 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_id ON public.financial_transactions(tenant_id);

-- Triggers para updated_at
CREATE OR REPLACE TRIGGER update_configs_updated_at
    BEFORE UPDATE ON public.configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_active_sessions_updated_at
    BEFORE UPDATE ON public.active_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Passo 5 concluído: Tabelas de apoio criadas' as status;

-- ==============================================
-- 06. HABILITAR ROW LEVEL SECURITY (RLS)
-- ==============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para obter tenant_id do usuário atual
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT tenant_id
        FROM public.users
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLÍTICAS PARA ORGANIZATIONS
CREATE POLICY "users_can_view_own_organization" ON public.organizations
FOR SELECT USING (id = get_user_tenant_id());

-- POLÍTICAS PARA USERS
CREATE POLICY "users_can_view_same_tenant" ON public.users
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "users_can_update_own_data" ON public.users
FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- POLÍTICAS PARA PROJECTS
CREATE POLICY "users_can_view_same_tenant_projects" ON public.projects
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "users_can_create_projects" ON public.projects
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

CREATE POLICY "creators_can_update_own_projects" ON public.projects
FOR UPDATE USING (created_by = auth.uid() AND tenant_id = get_user_tenant_id());

-- POLÍTICAS PARA CLIENTS
CREATE POLICY "users_can_view_same_tenant_clients" ON public.clients
FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "users_can_create_clients" ON public.clients
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id() AND created_by = auth.uid());

-- POLÍTICAS PARA CONFIGS
CREATE POLICY "users_can_view_tenant_configs" ON public.configs
FOR SELECT USING (tenant_id = get_user_tenant_id());

-- POLÍTICAS PARA NOTIFICATIONS
CREATE POLICY "users_can_view_own_notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

CREATE POLICY "users_can_update_own_notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- POLÍTICAS PARA ACTIVE_SESSIONS
CREATE POLICY "users_can_view_own_sessions" ON public.active_sessions
FOR SELECT USING (user_id = auth.uid() AND tenant_id = get_user_tenant_id());

-- POLÍTICAS PARA FINANCIAL_TRANSACTIONS
CREATE POLICY "users_can_view_tenant_transactions" ON public.financial_transactions
FOR SELECT USING (tenant_id = get_user_tenant_id());

SELECT '✅ Passo 6 concluído: Políticas RLS configuradas' as status;

-- ==============================================
-- 07. FUNÇÕES DE CONTROLE DE LIMITES
-- ==============================================

-- Função para obter configurações padrão dos planos
CREATE OR REPLACE FUNCTION get_default_plan_limits(plan_name TEXT)
RETURNS JSONB AS $$
BEGIN
    CASE plan_name
        WHEN 'basico' THEN
            RETURN '{
                "max_users": 10,
                "max_projects": 30,
                "max_clients": 100,
                "max_storage_gb": 3,
                "max_transactions_per_month": 500,
                "features": [
                    "basic_support",
                    "project_management", 
                    "client_management",
                    "basic_reports",
                    "email_notifications"
                ],
                "integrations": ["email"],
                "api_calls_per_day": 2000
            }'::jsonb;
        WHEN 'profissional' THEN
            RETURN '{
                "max_users": 50,
                "max_projects": 100,
                "max_clients": 1000,
                "max_storage_gb": 10,
                "max_transactions_per_month": 2000,
                "features": [
                    "priority_support",
                    "project_management",
                    "client_management", 
                    "advanced_reports",
                    "financial_management",
                    "team_collaboration",
                    "custom_fields",
                    "automation",
                    "email_notifications",
                    "whatsapp_integration",
                    "calendar_sync",
                    "export_data"
                ],
                "integrations": ["email", "whatsapp", "calendar", "accounting"],
                "api_calls_per_day": 10000
            }'::jsonb;
        ELSE
            RETURN '{}'::jsonb;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função para verificar limites
CREATE OR REPLACE FUNCTION check_limit(
    org_id UUID,
    limit_type TEXT,
    current_count INTEGER DEFAULT NULL
)
RETURNS TABLE (
    can_proceed BOOLEAN,
    current_usage INTEGER,
    limit_value INTEGER,
    usage_percentage NUMERIC,
    message TEXT
) AS $$
DECLARE
    org_limits JSONB;
    limit_val INTEGER;
    current_val INTEGER;
    usage_pct NUMERIC;
BEGIN
    -- Obter limites da organização
    SELECT plan_limits INTO org_limits
    FROM public.organizations
    WHERE id = org_id AND status = 'active';
    
    IF org_limits IS NULL THEN
        RETURN QUERY SELECT false, 0, 0, 0.0, 'Organização não encontrada ou inativa'::TEXT;
        RETURN;
    END IF;
    
    -- Obter limite específico
    limit_val := (org_limits->>('max_' || limit_type))::INTEGER;
    
    -- Se limite é -1, é ilimitado (plano enterprise)
    IF limit_val = -1 THEN
        RETURN QUERY SELECT true, COALESCE(current_count, 0), -1, 0.0, 'Ilimitado'::TEXT;
        RETURN;
    END IF;
    
    -- Calcular uso atual se não fornecido
    IF current_count IS NULL THEN
        CASE limit_type
            WHEN 'users' THEN
                SELECT COUNT(*)::INTEGER INTO current_val
                FROM public.users WHERE tenant_id = org_id AND status = 'active';
            WHEN 'projects' THEN
                SELECT COUNT(*)::INTEGER INTO current_val
                FROM public.projects WHERE tenant_id = org_id AND status != 'Cancelado';
            WHEN 'clients' THEN
                SELECT COUNT(*)::INTEGER INTO current_val
                FROM public.clients WHERE tenant_id = org_id AND status = 'active';
            ELSE
                current_val := 0;
        END CASE;
    ELSE
        current_val := current_count;
    END IF;
    
    -- Calcular percentual de uso
    usage_pct := CASE 
        WHEN limit_val > 0 THEN ROUND((current_val::NUMERIC / limit_val::NUMERIC) * 100, 2)
        ELSE 0
    END;
    
    -- Retornar resultado
    RETURN QUERY SELECT 
        current_val < limit_val,
        current_val,
        limit_val,
        usage_pct,
        CASE 
            WHEN current_val >= limit_val THEN 'Limite excedido'
            WHEN usage_pct >= 90 THEN 'Próximo do limite'
            WHEN usage_pct >= 75 THEN 'Uso alto'
            ELSE 'Dentro do limite'
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se organização tem feature específica
CREATE OR REPLACE FUNCTION org_has_feature(org_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    org_features JSONB;
BEGIN
    SELECT plan_limits->'features' INTO org_features
    FROM public.organizations
    WHERE id = org_id AND status = 'active';
    
    RETURN org_features ? feature_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Passo 7 concluído: Funções de controle criadas' as status;

-- ==============================================
-- 08. DADOS INICIAIS E CONFIGURAÇÃO
-- ==============================================

-- Organização padrão para desenvolvimento
INSERT INTO public.organizations (
    id,
    name,
    slug,
    plan,
    plan_limits,
    settings,
    contact_email,
    status
) VALUES (
    gen_random_uuid(),
    'SGF Energia Solar',
    'sgf-energia',
    'profissional',
    get_default_plan_limits('profissional'),
    '{
        "timezone": "America/Sao_Paulo",
        "currency": "BRL",
        "date_format": "DD/MM/YYYY",
        "language": "pt-BR"
    }',
    'contato@sgfenergia.com.br',
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- Função para inicializar nova organização
CREATE OR REPLACE FUNCTION initialize_new_organization(
    org_name TEXT,
    org_slug TEXT,
    admin_email TEXT,
    admin_name TEXT,
    plan_type TEXT DEFAULT 'basico'
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    plan_limits JSONB;
BEGIN
    -- Obter limites do plano
    plan_limits := get_default_plan_limits(plan_type);
    
    -- Criar organização
    INSERT INTO public.organizations (
        name,
        slug,
        plan,
        plan_limits,
        contact_email,
        status
    ) VALUES (
        org_name,
        org_slug,
        plan_type,
        plan_limits,
        admin_email,
        'active'
    ) RETURNING id INTO new_org_id;
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o sistema está configurado corretamente
CREATE OR REPLACE FUNCTION verify_system_setup()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    message TEXT
) AS $$
BEGIN
    -- Verificar se existem organizações
    RETURN QUERY
    SELECT 
        'organizations_exist'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('%s organizações encontradas', COUNT(*))::TEXT
    FROM public.organizations;
    
    -- Verificar se RLS está habilitado
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        CASE WHEN bool_and(relrowsecurity) THEN 'OK' ELSE 'ERROR' END::TEXT,
        'Row Level Security configurado'::TEXT
    FROM pg_class
    WHERE relname IN ('organizations', 'users', 'projects', 'clients');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Passo 8 concluído: Configuração inicial finalizada' as status;

-- ==============================================
-- VERIFICAÇÃO FINAL DO SISTEMA
-- ==============================================

-- Verificar tabelas criadas
SELECT 
    '📊 Tabelas criadas' as check_type,
    table_name,
    '✅ OK' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'users', 'projects', 'clients', 'configs', 'notifications', 'active_sessions', 'financial_transactions')
ORDER BY table_name;

-- Verificar RLS habilitado
SELECT 
    '🔒 Row Level Security' as check_type,
    tablename,
    CASE WHEN rowsecurity THEN '✅ Habilitado' ELSE '❌ Desabilitado' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'users', 'projects', 'clients')
ORDER BY tablename;

-- Executar verificação do sistema
SELECT * FROM verify_system_setup();

-- ==============================================
-- MENSAGEM FINAL
-- ==============================================

SELECT '
🎉 CONFIGURAÇÃO MULTI-TENANT CONCLUÍDA COM SUCESSO!

✅ 8 tabelas principais criadas
✅ Row Level Security habilitado
✅ Políticas de isolamento por tenant
✅ Funções de controle de limites
✅ Organização padrão criada

📋 PRÓXIMOS PASSOS:
1. Criar usuário super admin via Supabase Auth
2. Inserir usuário na tabela users com tenant_id
3. Configurar subdomínios no DNS  
4. Atualizar código da aplicação
5. Testar isolamento entre tenants

🔧 COMANDOS ÚTEIS:
- Verificar sistema: SELECT * FROM verify_system_setup();
- Verificar limites: SELECT * FROM check_limit(org_id, ''users'');
- Nova organização: SELECT initialize_new_organization(''Nome'', ''slug'', ''email'', ''admin'', ''basico'');

🚀 Sistema multi-tenant pronto para produção!
' as final_message;
