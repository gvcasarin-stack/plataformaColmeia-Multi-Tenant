-- ==============================================
-- 08. DADOS INICIAIS E CONFIGURAÇÃO DO SISTEMA
-- ==============================================
-- Script para inserir dados iniciais e configurar o sistema multi-tenant

-- ==============================================
-- ORGANIZAÇÃO PADRÃO PARA DESENVOLVIMENTO
-- ==============================================
-- Esta organização será usada para desenvolvimento e testes iniciais

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
    'premium',
    '{
        "max_users": 25,
        "max_projects": 100,
        "max_clients": 500,
        "max_storage_gb": 10,
        "max_transactions_per_month": 1000,
        "features": [
            "priority_support",
            "project_management",
            "client_management",
            "advanced_reports",
            "financial_management",
            "team_collaboration",
            "custom_fields",
            "automation"
        ],
        "integrations": ["email", "whatsapp", "calendar", "accounting"],
        "api_calls_per_day": 10000
    }',
    '{
        "timezone": "America/Sao_Paulo",
        "currency": "BRL",
        "date_format": "DD/MM/YYYY",
        "language": "pt-BR"
    }',
    'contato@sgfenergia.com.br',
    'active'
) ON CONFLICT (slug) DO NOTHING;

-- ==============================================
-- CONFIGURAÇÕES PADRÃO DO SISTEMA
-- ==============================================
-- Configurações que serão aplicadas para todas as organizações

-- Obter ID da organização padrão
DO $$
DECLARE
    org_id UUID;
    super_admin_id UUID;
BEGIN
    -- Buscar organização padrão
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'sgf-energia' LIMIT 1;
    
    IF org_id IS NOT NULL THEN
        -- Configurações gerais
        INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
        (org_id, 'geral', 'company_name', '"SGF Energia Solar"', 'Nome da empresa', org_id),
        (org_id, 'geral', 'default_project_status', '"Não Iniciado"', 'Status padrão para novos projetos', org_id),
        (org_id, 'geral', 'project_number_format', '"{slug}-{year}-{number}"', 'Formato do número do projeto', org_id),
        (org_id, 'geral', 'currency', '"BRL"', 'Moeda padrão', org_id),
        (org_id, 'geral', 'timezone', '"America/Sao_Paulo"', 'Fuso horário padrão', org_id);
        
        -- Configurações do Kanban
        INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
        (org_id, 'kanban', 'default_columns', '[
            {"id": "nao-iniciado", "name": "Não Iniciado", "color": "#gray"},
            {"id": "em-desenvolvimento", "name": "Em Desenvolvimento", "color": "#blue"},
            {"id": "aguardando", "name": "Aguardando", "color": "#yellow"},
            {"id": "homologacao", "name": "Homologação", "color": "#orange"},
            {"id": "finalizado", "name": "Finalizado", "color": "#green"}
        ]', 'Colunas padrão do quadro Kanban', org_id);
        
        -- Configurações de email
        INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
        (org_id, 'email', 'from_name', '"SGF Energia Solar"', 'Nome do remetente nos emails', org_id),
        (org_id, 'email', 'from_email', '"noreply@sgfenergia.com.br"', 'Email do remetente', org_id),
        (org_id, 'email', 'welcome_template', '{
            "subject": "Bem-vindo ao SGF Energia Solar!",
            "template": "welcome_user"
        }', 'Template de email de boas-vindas', org_id);
        
        -- Configurações financeiras
        INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
        (org_id, 'financial', 'default_payment_terms', '30', 'Prazo padrão de pagamento em dias', org_id),
        (org_id, 'financial', 'tax_rate', '0.18', 'Taxa de imposto padrão', org_id),
        (org_id, 'financial', 'invoice_prefix', '"SGF"', 'Prefixo das faturas', org_id);
        
        -- Configurações de notificações
        INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
        (org_id, 'notifications', 'project_updates', 'true', 'Notificar sobre atualizações de projetos', org_id),
        (org_id, 'notifications', 'user_registration', 'true', 'Notificar sobre novos usuários', org_id),
        (org_id, 'notifications', 'payment_reminders', 'true', 'Lembretes de pagamento', org_id);
    END IF;
END $$;

-- ==============================================
-- USUÁRIO SUPER ADMIN PADRÃO
-- ==============================================
-- Criar usuário super admin para configuração inicial
-- ATENÇÃO: Este usuário deve ser criado via Supabase Auth primeiro!

-- Exemplo de como inserir o usuário após criação no Supabase Auth:
-- INSERT INTO public.users (
--     id,
--     tenant_id,
--     email,
--     name,
--     role,
--     user_type,
--     permissions,
--     status
-- ) VALUES (
--     'UUID_DO_SUPABASE_AUTH', -- Substituir pelo UUID real do Supabase Auth
--     (SELECT id FROM public.organizations WHERE slug = 'sgf-energia'),
--     'admin@sgfenergia.com.br',
--     'Super Administrador',
--     'superadmin',
--     'superadmin',
--     '{
--         "can_create_projects": true,
--         "can_edit_projects": true,
--         "can_delete_projects": true,
--         "can_manage_users": true,
--         "can_view_financials": true,
--         "can_export_data": true,
--         "can_manage_organization": true
--     }',
--     'active'
-- );

-- ==============================================
-- EXEMPLOS DE DADOS PARA DESENVOLVIMENTO
-- ==============================================
-- Dados de exemplo para facilitar o desenvolvimento (opcional)

DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Buscar organização padrão
    SELECT id INTO org_id FROM public.organizations WHERE slug = 'sgf-energia' LIMIT 1;
    
    IF org_id IS NOT NULL THEN
        -- Exemplo de cliente
        INSERT INTO public.clients (
            tenant_id,
            name,
            email,
            phone,
            company_type,
            document_number,
            address,
            status,
            created_by
        ) VALUES (
            org_id,
            'Empresa Exemplo Ltda',
            'contato@empresaexemplo.com.br',
            '(11) 99999-9999',
            'pessoa_juridica',
            '12.345.678/0001-90',
            '{
                "street": "Rua das Flores",
                "number": "123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP",
                "zip_code": "01234-567",
                "country": "Brasil"
            }',
            'active',
            org_id -- Temporário, deve ser substituído pelo ID do usuário real
        ) ON CONFLICT DO NOTHING;
        
        -- Exemplo de transação financeira
        INSERT INTO public.financial_transactions (
            tenant_id,
            type,
            category,
            description,
            amount,
            transaction_date,
            status,
            created_by
        ) VALUES (
            org_id,
            'income',
            'project_payment',
            'Pagamento do projeto exemplo',
            15000.00,
            CURRENT_DATE,
            'paid',
            org_id -- Temporário, deve ser substituído pelo ID do usuário real
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ==============================================
-- ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ==============================================

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_users_tenant_status_role ON public.users(tenant_id, status, role);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status_priority ON public.projects(tenant_id, status, prioridade);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user_read ON public.notifications(tenant_id, user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant_date_type ON public.financial_transactions(tenant_id, transaction_date, type);

-- Índices para campos JSONB (se necessário para consultas específicas)
CREATE INDEX IF NOT EXISTS idx_projects_timeline_events_gin ON public.projects USING gin(timeline_events);
CREATE INDEX IF NOT EXISTS idx_organizations_plan_limits_gin ON public.organizations USING gin(plan_limits);

-- ==============================================
-- FUNÇÕES DE INICIALIZAÇÃO
-- ==============================================

-- Função para inicializar nova organização
CREATE OR REPLACE FUNCTION initialize_new_organization(
    org_name TEXT,
    org_slug TEXT,
    admin_email TEXT,
    admin_name TEXT,
    plan_type TEXT DEFAULT 'basic'
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    admin_user_id UUID;
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
    
    -- Configurações padrão para nova organização
    INSERT INTO public.configs (tenant_id, category, key, value, description, created_by) VALUES
    (new_org_id, 'geral', 'company_name', to_jsonb(org_name), 'Nome da empresa', new_org_id),
    (new_org_id, 'geral', 'default_project_status', '"Não Iniciado"', 'Status padrão para novos projetos', new_org_id),
    (new_org_id, 'email', 'from_name', to_jsonb(org_name), 'Nome do remetente nos emails', new_org_id);
    
    -- Notificação de sistema sobre nova organização
    INSERT INTO public.notifications (
        tenant_id,
        user_id,
        title,
        message,
        type,
        category
    ) SELECT 
        new_org_id,
        u.id,
        'Organização Criada',
        'Bem-vindo! Sua organização foi criada com sucesso.',
        'success',
        'system'
    FROM public.users u 
    WHERE u.tenant_id = new_org_id AND u.role = 'superadmin';
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- VERIFICAÇÕES DE INTEGRIDADE INICIAL
-- ==============================================

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
    
    -- Verificar se existem configurações padrão
    RETURN QUERY
    SELECT 
        'default_configs'::TEXT,
        CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('%s configurações encontradas', COUNT(*))::TEXT
    FROM public.configs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMENTÁRIOS FINAIS
-- ==============================================
COMMENT ON FUNCTION initialize_new_organization(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Inicializa nova organização com configurações padrão';
COMMENT ON FUNCTION verify_system_setup() IS 'Verifica se o sistema multi-tenant está configurado corretamente';

-- Executar verificação inicial
-- SELECT * FROM verify_system_setup();
