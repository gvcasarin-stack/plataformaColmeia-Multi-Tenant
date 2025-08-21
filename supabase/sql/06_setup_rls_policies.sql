-- ==============================================
-- 06. CONFIGURAÇÃO DAS POLÍTICAS RLS (MULTI-TENANT)
-- ==============================================
-- Row Level Security para isolamento completo entre tenants

-- ==============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ==============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- POLÍTICAS PARA TABELA: ORGANIZATIONS
-- ==============================================

-- Usuários podem ver apenas sua própria organização
CREATE POLICY "users_can_view_own_organization" ON public.organizations
FOR SELECT
USING (
    id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Apenas superadmins podem atualizar organizações
CREATE POLICY "superadmins_can_update_organizations" ON public.organizations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND tenant_id = organizations.id
        AND role = 'superadmin'
        AND status = 'active'
    )
);

-- Apenas superadmins podem criar organizações (para casos especiais)
CREATE POLICY "superadmins_can_create_organizations" ON public.organizations
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'superadmin'
    )
);

-- ==============================================
-- POLÍTICAS PARA TABELA: USERS
-- ==============================================

-- Usuários podem ver apenas usuários da mesma organização
CREATE POLICY "users_can_view_same_tenant" ON public.users
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "users_can_update_own_data" ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admins podem atualizar usuários da mesma organização
CREATE POLICY "admins_can_update_same_tenant_users" ON public.users
FOR UPDATE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- Admins podem criar novos usuários na organização
CREATE POLICY "admins_can_create_users" ON public.users
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
    OR id = auth.uid() -- Permite self-registration
);

-- ==============================================
-- POLÍTICAS PARA TABELA: PROJECTS
-- ==============================================

-- Usuários podem ver apenas projetos da mesma organização
CREATE POLICY "users_can_view_same_tenant_projects" ON public.projects
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Usuários podem criar projetos na própria organização
CREATE POLICY "users_can_create_projects" ON public.projects
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Criadores podem atualizar seus próprios projetos
CREATE POLICY "creators_can_update_own_projects" ON public.projects
FOR UPDATE
USING (
    created_by = auth.uid()
    AND tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Admins podem atualizar qualquer projeto da organização
CREATE POLICY "admins_can_update_any_project" ON public.projects
FOR UPDATE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- Apenas admins podem deletar projetos
CREATE POLICY "admins_can_delete_projects" ON public.projects
FOR DELETE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- ==============================================
-- POLÍTICAS PARA TABELA: CLIENTS
-- ==============================================

-- Usuários podem ver apenas clientes da mesma organização
CREATE POLICY "users_can_view_same_tenant_clients" ON public.clients
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Usuários podem criar clientes na própria organização
CREATE POLICY "users_can_create_clients" ON public.clients
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
);

-- Criadores e admins podem atualizar clientes
CREATE POLICY "creators_and_admins_can_update_clients" ON public.clients
FOR UPDATE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
            AND status = 'active'
        )
    )
);

-- Apenas admins podem deletar clientes
CREATE POLICY "admins_can_delete_clients" ON public.clients
FOR DELETE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- ==============================================
-- POLÍTICAS PARA TABELA: CONFIGS
-- ==============================================

-- Usuários podem ver configurações da organização
CREATE POLICY "users_can_view_tenant_configs" ON public.configs
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Apenas admins podem modificar configurações
CREATE POLICY "admins_can_modify_configs" ON public.configs
FOR ALL
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
)
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- ==============================================
-- POLÍTICAS PARA TABELA: NOTIFICATIONS
-- ==============================================

-- Usuários podem ver apenas suas próprias notificações
CREATE POLICY "users_can_view_own_notifications" ON public.notifications
FOR SELECT
USING (
    user_id = auth.uid()
    AND tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "users_can_update_own_notifications" ON public.notifications
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Sistema e admins podem criar notificações
CREATE POLICY "system_can_create_notifications" ON public.notifications
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    OR created_by IS NULL -- Permite criação pelo sistema
);

-- ==============================================
-- POLÍTICAS PARA TABELA: ACTIVE_SESSIONS
-- ==============================================

-- Usuários podem ver apenas suas próprias sessões
CREATE POLICY "users_can_view_own_sessions" ON public.active_sessions
FOR SELECT
USING (
    user_id = auth.uid()
    AND tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Usuários podem atualizar suas próprias sessões
CREATE POLICY "users_can_update_own_sessions" ON public.active_sessions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Sistema pode criar sessões
CREATE POLICY "system_can_create_sessions" ON public.active_sessions
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
);

-- Admins podem ver todas as sessões da organização
CREATE POLICY "admins_can_view_tenant_sessions" ON public.active_sessions
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
);

-- ==============================================
-- POLÍTICAS PARA TABELA: FINANCIAL_TRANSACTIONS
-- ==============================================

-- Usuários podem ver transações da organização (com base em permissões)
CREATE POLICY "users_can_view_tenant_transactions" ON public.financial_transactions
FOR SELECT
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND (
        -- Admins veem tudo
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
            AND status = 'active'
        )
        -- Usuários veem apenas transações relacionadas aos seus projetos
        OR project_id IN (
            SELECT id FROM public.projects
            WHERE created_by = auth.uid()
        )
        -- Ou transações que criaram
        OR created_by = auth.uid()
    )
);

-- Usuários com permissão podem criar transações
CREATE POLICY "authorized_users_can_create_transactions" ON public.financial_transactions
FOR INSERT
WITH CHECK (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
    AND (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
            AND status = 'active'
        )
        OR (
            SELECT (permissions->>'can_view_financials')::BOOLEAN
            FROM public.users
            WHERE id = auth.uid()
        ) = true
    )
);

-- Apenas criadores e admins podem atualizar transações
CREATE POLICY "creators_and_admins_can_update_transactions" ON public.financial_transactions
FOR UPDATE
USING (
    tenant_id = (
        SELECT tenant_id 
        FROM public.users 
        WHERE id = auth.uid()
    )
    AND (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'superadmin')
            AND status = 'active'
        )
    )
);

-- ==============================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ==============================================

-- Função para verificar se usuário tem acesso a tenant específico
CREATE OR REPLACE FUNCTION user_has_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND tenant_id = target_tenant_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter tenant_id do usuário atual
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

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==============================================
COMMENT ON POLICY "users_can_view_same_tenant" ON public.users IS 'Usuários veem apenas usuários da mesma organização';
COMMENT ON POLICY "users_can_view_same_tenant_projects" ON public.projects IS 'Isolamento completo de projetos por tenant';
COMMENT ON POLICY "users_can_view_same_tenant_clients" ON public.clients IS 'Isolamento completo de clientes por tenant';
COMMENT ON FUNCTION user_has_tenant_access(UUID) IS 'Verifica se usuário atual tem acesso a tenant específico';
COMMENT ON FUNCTION get_user_tenant_id() IS 'Retorna tenant_id do usuário autenticado atual';
