-- ==============================================
-- 02. CRIAÇÃO DA TABELA USERS (MULTI-TENANT)
-- ==============================================
-- Tabela de usuários com suporte completo a multi-tenant e roles

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

-- Função para verificar se usuário é admin da organização
CREATE OR REPLACE FUNCTION is_org_admin(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id
        AND tenant_id = org_id
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário tem permissão específica
CREATE OR REPLACE FUNCTION user_has_permission(user_id UUID, permission_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_permissions JSONB;
BEGIN
    SELECT permissions INTO user_permissions
    FROM public.users
    WHERE id = user_id AND status = 'active';
    
    RETURN COALESCE((user_permissions->>permission_key)::BOOLEAN, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter usuários da organização
CREATE OR REPLACE FUNCTION get_org_users(org_id UUID)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    role TEXT,
    status TEXT,
    last_login TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.name, u.role, u.status, u.last_login
    FROM public.users u
    WHERE u.tenant_id = org_id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar último login
CREATE OR REPLACE FUNCTION update_user_last_login(user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.users
    SET 
        last_login = NOW(),
        login_count = login_count + 1,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para bloquear usuário
CREATE OR REPLACE FUNCTION block_user(user_id UUID, reason TEXT, blocked_by_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users
    SET 
        is_blocked = true,
        status = 'blocked',
        blocked_reason = reason,
        blocked_at = NOW(),
        blocked_by = blocked_by_id,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para desbloquear usuário
CREATE OR REPLACE FUNCTION unblock_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.users
    SET 
        is_blocked = false,
        status = 'active',
        blocked_reason = NULL,
        blocked_at = NULL,
        blocked_by = NULL,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para verificar limite de usuários antes de inserir
CREATE OR REPLACE FUNCTION check_user_limit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_user_limit(NEW.tenant_id) THEN
        RAISE EXCEPTION 'Limite de usuários excedido para esta organização';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_user_limit
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION check_user_limit_trigger();

-- Comentários para documentação
COMMENT ON TABLE public.users IS 'Usuários do sistema com suporte multi-tenant e controle de roles/permissões';
COMMENT ON COLUMN public.users.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento multi-tenant';
COMMENT ON COLUMN public.users.permissions IS 'Permissões específicas além do role padrão';
COMMENT ON FUNCTION is_org_admin(UUID, UUID) IS 'Verifica se usuário é admin de uma organização específica';
COMMENT ON FUNCTION user_has_permission(UUID, TEXT) IS 'Verifica se usuário tem permissão específica';
