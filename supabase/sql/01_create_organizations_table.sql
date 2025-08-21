-- ==============================================
-- 01. CRIAÇÃO DA TABELA ORGANIZATIONS (TENANTS)
-- ==============================================
-- Esta é a tabela principal que define cada empresa/organização no sistema multi-tenant

CREATE TABLE IF NOT EXISTS public.organizations (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- Nome da empresa
    slug TEXT UNIQUE NOT NULL, -- Subdomínio: empresa-abc (para empresa-abc.seuapp.com)
    
    -- Configurações do plano
    plan TEXT NOT NULL DEFAULT 'basic', -- basic, premium, enterprise
    plan_limits JSONB NOT NULL DEFAULT '{
        "max_users": 5,
        "max_projects": 10,
        "max_storage_gb": 1,
        "max_clients": 50,
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
    CONSTRAINT organizations_plan_valid CHECK (plan IN ('basic', 'premium', 'enterprise')),
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

-- Função para obter limites do plano
CREATE OR REPLACE FUNCTION get_plan_limits(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    limits JSONB;
BEGIN
    SELECT plan_limits INTO limits
    FROM public.organizations
    WHERE id = org_id AND status = 'active';
    
    RETURN COALESCE(limits, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar limite de usuários
CREATE OR REPLACE FUNCTION check_user_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_users INTEGER;
BEGIN
    -- Contar usuários ativos da organização
    SELECT COUNT(*) INTO current_count
    FROM public.users
    WHERE tenant_id = org_id AND status = 'active';
    
    -- Obter limite máximo
    SELECT (plan_limits->>'max_users')::INTEGER INTO max_users
    FROM public.organizations
    WHERE id = org_id;
    
    RETURN current_count < max_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar limite de projetos
CREATE OR REPLACE FUNCTION check_project_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_projects INTEGER;
BEGIN
    -- Contar projetos ativos da organização
    SELECT COUNT(*) INTO current_count
    FROM public.projects
    WHERE tenant_id = org_id AND status != 'Cancelado';
    
    -- Obter limite máximo
    SELECT (plan_limits->>'max_projects')::INTEGER INTO max_projects
    FROM public.organizations
    WHERE id = org_id;
    
    RETURN current_count < max_projects;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter organização atual do usuário
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Retorna o tenant_id do usuário logado
    RETURN (
        SELECT tenant_id
        FROM public.users
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.organizations IS 'Tabela principal de organizações/empresas no sistema multi-tenant';
COMMENT ON COLUMN public.organizations.slug IS 'Identificador único usado no subdomínio (empresa-abc.seuapp.com)';
COMMENT ON COLUMN public.organizations.plan_limits IS 'Limites específicos do plano da organização';
COMMENT ON FUNCTION get_plan_limits(UUID) IS 'Retorna os limites do plano de uma organização';
COMMENT ON FUNCTION check_user_limit(UUID) IS 'Verifica se a organização pode adicionar mais usuários';
COMMENT ON FUNCTION check_project_limit(UUID) IS 'Verifica se a organização pode criar mais projetos';
