-- ==============================================
-- 07. FUNÇÕES DE LIMITES DE PLANOS E UTILITÁRIOS
-- ==============================================
-- Funções avançadas para controle de limites, validações e utilitários do sistema

-- ==============================================
-- DEFINIÇÃO DOS PLANOS E SEUS LIMITES
-- ==============================================

-- Função para obter configurações padrão dos planos
CREATE OR REPLACE FUNCTION get_default_plan_limits(plan_name TEXT)
RETURNS JSONB AS $$
BEGIN
    CASE plan_name
        WHEN 'basic' THEN
            RETURN '{
                "max_users": 5,
                "max_projects": 10,
                "max_clients": 50,
                "max_storage_gb": 1,
                "max_transactions_per_month": 100,
                "features": [
                    "basic_support",
                    "project_management",
                    "client_management",
                    "basic_reports"
                ],
                "integrations": ["email"],
                "api_calls_per_day": 1000
            }'::jsonb;
        
        WHEN 'premium' THEN
            RETURN '{
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
            }'::jsonb;
        
        WHEN 'enterprise' THEN
            RETURN '{
                "max_users": -1,
                "max_projects": -1,
                "max_clients": -1,
                "max_storage_gb": 100,
                "max_transactions_per_month": -1,
                "features": [
                    "dedicated_support",
                    "project_management",
                    "client_management",
                    "enterprise_reports",
                    "financial_management",
                    "team_collaboration",
                    "custom_fields",
                    "automation",
                    "white_label",
                    "custom_integrations",
                    "advanced_security",
                    "audit_logs",
                    "sso"
                ],
                "integrations": ["all"],
                "api_calls_per_day": -1
            }'::jsonb;
        
        ELSE
            RETURN '{}'::jsonb;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==============================================
-- FUNÇÕES DE VERIFICAÇÃO DE LIMITES AVANÇADAS
-- ==============================================

-- Função principal para verificar qualquer limite
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
                FROM public.users
                WHERE tenant_id = org_id AND status = 'active';
            
            WHEN 'projects' THEN
                SELECT COUNT(*)::INTEGER INTO current_val
                FROM public.projects
                WHERE tenant_id = org_id AND status != 'Cancelado';
            
            WHEN 'clients' THEN
                SELECT COUNT(*)::INTEGER INTO current_val
                FROM public.clients
                WHERE tenant_id = org_id AND status = 'active';
            
            WHEN 'storage_gb' THEN
                -- Implementar cálculo de storage quando necessário
                current_val := 0;
            
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

-- ==============================================
-- FUNÇÕES DE RELATÓRIOS E ESTATÍSTICAS
-- ==============================================

-- Função para obter dashboard completo da organização
CREATE OR REPLACE FUNCTION get_organization_dashboard(org_id UUID)
RETURNS TABLE (
    org_name TEXT,
    plan TEXT,
    users_count BIGINT,
    users_limit INTEGER,
    projects_count BIGINT,
    projects_limit INTEGER,
    clients_count BIGINT,
    clients_limit INTEGER,
    active_projects BIGINT,
    completed_projects BIGINT,
    total_revenue NUMERIC,
    pending_revenue NUMERIC,
    recent_activity JSONB
) AS $$
DECLARE
    org_data RECORD;
    limits JSONB;
BEGIN
    -- Obter dados da organização
    SELECT o.name, o.plan, o.plan_limits
    INTO org_data
    FROM public.organizations o
    WHERE o.id = org_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    limits := org_data.plan_limits;
    
    RETURN QUERY
    SELECT 
        org_data.name,
        org_data.plan,
        (SELECT COUNT(*) FROM public.users WHERE tenant_id = org_id AND status = 'active'),
        (limits->>'max_users')::INTEGER,
        (SELECT COUNT(*) FROM public.projects WHERE tenant_id = org_id AND status != 'Cancelado'),
        (limits->>'max_projects')::INTEGER,
        (SELECT COUNT(*) FROM public.clients WHERE tenant_id = org_id AND status = 'active'),
        (limits->>'max_clients')::INTEGER,
        (SELECT COUNT(*) FROM public.projects WHERE tenant_id = org_id AND status NOT IN ('Finalizado', 'Cancelado')),
        (SELECT COUNT(*) FROM public.projects WHERE tenant_id = org_id AND status = 'Finalizado'),
        (SELECT COALESCE(SUM(amount), 0) FROM public.financial_transactions WHERE tenant_id = org_id AND type = 'income' AND status = 'paid'),
        (SELECT COALESCE(SUM(amount), 0) FROM public.financial_transactions WHERE tenant_id = org_id AND type = 'income' AND status = 'pending'),
        '[]'::jsonb; -- Implementar atividade recente conforme necessário
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de uso por período
CREATE OR REPLACE FUNCTION get_usage_statistics(
    org_id UUID,
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    period_start DATE,
    period_end DATE,
    new_projects INTEGER,
    new_clients INTEGER,
    new_users INTEGER,
    completed_projects INTEGER,
    total_transactions INTEGER,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        start_date,
        end_date,
        (SELECT COUNT(*)::INTEGER FROM public.projects 
         WHERE tenant_id = org_id AND DATE(created_at) BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM public.clients 
         WHERE tenant_id = org_id AND DATE(created_at) BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM public.users 
         WHERE tenant_id = org_id AND DATE(created_at) BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM public.projects 
         WHERE tenant_id = org_id AND status = 'Finalizado' 
         AND DATE(updated_at) BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM public.financial_transactions 
         WHERE tenant_id = org_id AND DATE(transaction_date) BETWEEN start_date AND end_date),
        (SELECT COALESCE(SUM(amount), 0) FROM public.financial_transactions 
         WHERE tenant_id = org_id AND type = 'income' AND status = 'paid'
         AND DATE(transaction_date) BETWEEN start_date AND end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNÇÕES DE MANUTENÇÃO E LIMPEZA
-- ==============================================

-- Função para limpeza automática de dados antigos
CREATE OR REPLACE FUNCTION cleanup_old_data(org_id UUID DEFAULT NULL)
RETURNS TABLE (
    cleanup_type TEXT,
    records_deleted INTEGER,
    message TEXT
) AS $$
DECLARE
    deleted_notifications INTEGER;
    deleted_sessions INTEGER;
    deleted_logs INTEGER;
BEGIN
    -- Limpar notificações antigas (mais de 90 dias)
    DELETE FROM public.notifications
    WHERE (org_id IS NULL OR tenant_id = org_id)
    AND created_at < NOW() - INTERVAL '90 days'
    AND is_read = true;
    
    GET DIAGNOSTICS deleted_notifications = ROW_COUNT;
    
    -- Limpar sessões expiradas
    DELETE FROM public.active_sessions
    WHERE (org_id IS NULL OR tenant_id = org_id)
    AND (expires_at < NOW() OR last_activity < NOW() - INTERVAL '30 days');
    
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    -- Retornar resultados
    RETURN QUERY SELECT 'notifications'::TEXT, deleted_notifications, 'Notificações antigas removidas'::TEXT;
    RETURN QUERY SELECT 'sessions'::TEXT, deleted_sessions, 'Sessões expiradas removidas'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para validar integridade dos dados
CREATE OR REPLACE FUNCTION validate_data_integrity(org_id UUID)
RETURNS TABLE (
    check_type TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    orphaned_projects INTEGER;
    orphaned_clients INTEGER;
    invalid_users INTEGER;
BEGIN
    -- Verificar projetos órfãos (sem usuário criador válido)
    SELECT COUNT(*)::INTEGER INTO orphaned_projects
    FROM public.projects p
    LEFT JOIN public.users u ON p.created_by = u.id
    WHERE p.tenant_id = org_id AND u.id IS NULL;
    
    -- Verificar clientes órfãos
    SELECT COUNT(*)::INTEGER INTO orphaned_clients
    FROM public.clients c
    LEFT JOIN public.users u ON c.created_by = u.id
    WHERE c.tenant_id = org_id AND u.id IS NULL;
    
    -- Verificar usuários inválidos (sem tenant)
    SELECT COUNT(*)::INTEGER INTO invalid_users
    FROM public.users u
    LEFT JOIN public.organizations o ON u.tenant_id = o.id
    WHERE u.tenant_id = org_id AND o.id IS NULL;
    
    -- Retornar resultados
    RETURN QUERY SELECT 
        'orphaned_projects'::TEXT,
        CASE WHEN orphaned_projects = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('%s projetos órfãos encontrados', orphaned_projects)::TEXT;
    
    RETURN QUERY SELECT 
        'orphaned_clients'::TEXT,
        CASE WHEN orphaned_clients = 0 THEN 'OK' ELSE 'WARNING' END::TEXT,
        format('%s clientes órfãos encontrados', orphaned_clients)::TEXT;
    
    RETURN QUERY SELECT 
        'invalid_users'::TEXT,
        CASE WHEN invalid_users = 0 THEN 'OK' ELSE 'ERROR' END::TEXT,
        format('%s usuários inválidos encontrados', invalid_users)::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- FUNÇÕES DE MIGRAÇÃO E UPGRADE DE PLANOS
-- ==============================================

-- Função para fazer upgrade de plano
CREATE OR REPLACE FUNCTION upgrade_organization_plan(
    org_id UUID,
    new_plan TEXT,
    updated_by_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    new_limits JSONB;
BEGIN
    -- Validar se o plano é válido
    IF new_plan NOT IN ('basic', 'premium', 'enterprise') THEN
        RAISE EXCEPTION 'Plano inválido: %', new_plan;
    END IF;
    
    -- Obter limites do novo plano
    new_limits := get_default_plan_limits(new_plan);
    
    -- Atualizar organização
    UPDATE public.organizations
    SET 
        plan = new_plan,
        plan_limits = new_limits,
        updated_at = NOW()
    WHERE id = org_id;
    
    -- Registrar a mudança (implementar log de auditoria se necessário)
    INSERT INTO public.notifications (tenant_id, user_id, title, message, type, category)
    SELECT 
        org_id,
        u.id,
        'Plano Atualizado',
        format('Plano da organização foi atualizado para %s', new_plan),
        'success',
        'system'
    FROM public.users u
    WHERE u.tenant_id = org_id AND u.role IN ('admin', 'superadmin');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==============================================
COMMENT ON FUNCTION get_default_plan_limits(TEXT) IS 'Retorna configurações padrão de limites por plano';
COMMENT ON FUNCTION check_limit(UUID, TEXT, INTEGER) IS 'Verificação avançada de limites com estatísticas detalhadas';
COMMENT ON FUNCTION org_has_feature(UUID, TEXT) IS 'Verifica se organização tem acesso a feature específica';
COMMENT ON FUNCTION get_organization_dashboard(UUID) IS 'Dashboard completo com estatísticas da organização';
COMMENT ON FUNCTION cleanup_old_data(UUID) IS 'Limpeza automática de dados antigos e desnecessários';
COMMENT ON FUNCTION validate_data_integrity(UUID) IS 'Validação de integridade dos dados da organização';
COMMENT ON FUNCTION upgrade_organization_plan(UUID, TEXT, UUID) IS 'Upgrade seguro de plano com notificações automáticas';
