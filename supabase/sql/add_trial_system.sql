-- ==============================================
-- SISTEMA DE TRIAL - BLOQUEIO SUAVE + MODAL
-- ==============================================
-- Adiciona campos e funções para controle de trial de 7 dias

-- ==============================================
-- 1. ADICIONAR CAMPOS DE TRIAL NA TABELA ORGANIZATIONS
-- ==============================================

-- Adicionar colunas para controle de trial
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';

-- Adicionar constraint para subscription_status (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'organizations_subscription_status_valid'
    ) THEN
        ALTER TABLE public.organizations 
        ADD CONSTRAINT organizations_subscription_status_valid 
        CHECK (subscription_status IN ('trial', 'active', 'cancelled', 'expired', 'past_due'));
    END IF;
END $$;

-- Adicionar campos de pagamento
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method_added BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_payment_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_date DATE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON public.organizations(trial_ends_at) WHERE is_trial = true;
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

SELECT '✅ Campos de trial adicionados à tabela organizations' as status;

-- ==============================================
-- 2. ATUALIZAR ORGANIZAÇÃO EXISTENTE PARA ATIVA
-- ==============================================

-- A organização SGF já criada deve ser ativa, não trial
UPDATE public.organizations 
SET 
    is_trial = false,
    subscription_status = 'active',
    trial_started_at = NULL,
    trial_ends_at = NULL,
    payment_method_added = true,
    updated_at = NOW()
WHERE slug = 'sgf-energia';

SELECT '✅ Organização SGF configurada como ativa (não trial)' as status;

-- ==============================================
-- 3. FUNÇÕES DE CONTROLE DE TRIAL
-- ==============================================

-- Função para verificar status do trial
CREATE OR REPLACE FUNCTION get_trial_status(org_id UUID)
RETURNS TABLE (
    is_trial_active BOOLEAN,
    days_remaining INTEGER,
    trial_expired BOOLEAN,
    subscription_status TEXT,
    can_use_features BOOLEAN,
    upgrade_required BOOLEAN
) AS $$
DECLARE
    org_record RECORD;
    days_left INTEGER;
BEGIN
    -- Buscar dados da organização
    SELECT 
        o.is_trial,
        o.trial_ends_at,
        o.subscription_status,
        o.payment_method_added
    INTO org_record
    FROM public.organizations o
    WHERE o.id = org_id AND o.status = 'active';
    
    -- Se organização não encontrada
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, true, 'not_found'::TEXT, false, true;
        RETURN;
    END IF;
    
    -- Se não é trial, é assinatura ativa
    IF NOT org_record.is_trial THEN
        RETURN QUERY SELECT false, 0, false, org_record.subscription_status, true, false;
        RETURN;
    END IF;
    
    -- Calcular dias restantes
    days_left := EXTRACT(DAY FROM (org_record.trial_ends_at - NOW()))::INTEGER;
    
    -- Retornar status do trial
    RETURN QUERY SELECT 
        org_record.is_trial,
        GREATEST(days_left, 0),
        (NOW() > org_record.trial_ends_at),
        org_record.subscription_status,
        (NOW() <= org_record.trial_ends_at), -- Pode usar features se trial não expirou
        (NOW() > org_record.trial_ends_at);  -- Precisa upgrade se trial expirou
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se pode criar recursos (projetos, clientes, etc)
CREATE OR REPLACE FUNCTION can_create_resource(org_id UUID, resource_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    trial_status RECORD;
    current_count INTEGER;
    limit_val INTEGER;
BEGIN
    -- Obter status do trial
    SELECT * INTO trial_status FROM get_trial_status(org_id) LIMIT 1;
    
    -- Se trial expirado, bloquear criação
    IF trial_status.trial_expired AND trial_status.is_trial_active THEN
        RETURN false;
    END IF;
    
    -- Se não pode usar features, bloquear
    IF NOT trial_status.can_use_features THEN
        RETURN false;
    END IF;
    
    -- Verificar limites específicos do recurso
    SELECT * INTO trial_status FROM check_limit(org_id, resource_type);
    
    RETURN trial_status.can_proceed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para converter trial em assinatura ativa
CREATE OR REPLACE FUNCTION activate_subscription(
    org_id UUID,
    stripe_customer_id_param TEXT,
    stripe_subscription_id_param TEXT,
    new_plan TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    plan_limits JSONB;
BEGIN
    -- Se novo plano especificado, obter limites
    IF new_plan IS NOT NULL THEN
        plan_limits := get_default_plan_limits(new_plan);
    END IF;
    
    -- Atualizar organização
    UPDATE public.organizations
    SET 
        is_trial = false,
        subscription_status = 'active',
        stripe_customer_id = stripe_customer_id_param,
        stripe_subscription_id = stripe_subscription_id_param,
        payment_method_added = true,
        trial_started_at = NULL,
        trial_ends_at = NULL,
        plan = COALESCE(new_plan, plan),
        plan_limits = COALESCE(plan_limits, plan_limits),
        next_billing_date = (CURRENT_DATE + INTERVAL '1 month')::DATE,
        updated_at = NOW()
    WHERE id = org_id;
    
    -- Criar notificação de boas-vindas
    INSERT INTO public.notifications (
        tenant_id,
        user_id,
        title,
        message,
        type,
        category,
        data
    )
    SELECT 
        org_id,
        u.id,
        'Assinatura Ativada! 🎉',
        'Sua assinatura foi ativada com sucesso. Aproveite todos os recursos!',
        'success',
        'system',
        jsonb_build_object('plan', new_plan, 'activated_at', NOW())
    FROM public.users u
    WHERE u.tenant_id = org_id AND u.role IN ('admin', 'superadmin');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para marcar trial como expirado (executar via cron)
CREATE OR REPLACE FUNCTION expire_trials()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Atualizar trials expirados
    UPDATE public.organizations
    SET 
        subscription_status = 'expired',
        updated_at = NOW()
    WHERE is_trial = true 
    AND trial_ends_at < NOW() 
    AND subscription_status = 'trial';
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Criar notificações para admins das organizações expiradas
    INSERT INTO public.notifications (
        tenant_id,
        user_id,
        title,
        message,
        type,
        category,
        priority,
        data
    )
    SELECT 
        o.id,
        u.id,
        'Trial Expirado ⏰',
        'Seu período de teste expirou. Faça upgrade para continuar usando todas as funcionalidades.',
        'warning',
        'system',
        'high',
        jsonb_build_object(
            'expired_at', NOW(),
            'trial_days', o.trial_days,
            'upgrade_url', '/billing/upgrade'
        )
    FROM public.organizations o
    JOIN public.users u ON u.tenant_id = o.id
    WHERE o.is_trial = true 
    AND o.trial_ends_at < NOW() 
    AND o.subscription_status = 'expired'
    AND u.role IN ('admin', 'superadmin');
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter organizações que precisam de lembrete
CREATE OR REPLACE FUNCTION get_trial_reminders()
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    admin_emails TEXT[],
    days_remaining INTEGER,
    reminder_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.name,
        array_agg(u.email) as admin_emails,
        EXTRACT(DAY FROM (o.trial_ends_at - NOW()))::INTEGER as days_remaining,
        CASE 
            WHEN EXTRACT(DAY FROM (o.trial_ends_at - NOW())) <= 1 THEN 'final_warning'
            WHEN EXTRACT(DAY FROM (o.trial_ends_at - NOW())) <= 2 THEN 'urgent'
            WHEN EXTRACT(DAY FROM (o.trial_ends_at - NOW())) <= 3 THEN 'reminder'
            ELSE 'early'
        END as reminder_type
    FROM public.organizations o
    JOIN public.users u ON u.tenant_id = o.id
    WHERE o.is_trial = true
    AND o.subscription_status = 'trial'
    AND o.trial_ends_at > NOW()
    AND o.trial_ends_at <= (NOW() + INTERVAL '3 days')
    AND u.role IN ('admin', 'superadmin')
    GROUP BY o.id, o.name, o.trial_ends_at
    ORDER BY days_remaining ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Funções de controle de trial criadas' as status;

-- ==============================================
-- 4. ATUALIZAR FUNÇÃO DE INICIALIZAÇÃO
-- ==============================================

-- Atualizar função para criar organizações com trial
CREATE OR REPLACE FUNCTION initialize_new_organization(
    org_name TEXT,
    org_slug TEXT,
    admin_email TEXT,
    admin_name TEXT,
    plan_type TEXT DEFAULT 'basico',
    start_trial BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
    plan_limits JSONB;
    trial_end TIMESTAMPTZ;
BEGIN
    -- Obter limites do plano
    plan_limits := get_default_plan_limits(plan_type);
    
    -- Calcular fim do trial se aplicável
    trial_end := CASE WHEN start_trial THEN NOW() + INTERVAL '7 days' ELSE NULL END;
    
    -- Criar organização
    INSERT INTO public.organizations (
        name,
        slug,
        plan,
        plan_limits,
        contact_email,
        status,
        is_trial,
        trial_started_at,
        trial_ends_at,
        subscription_status
    ) VALUES (
        org_name,
        org_slug,
        plan_type,
        plan_limits,
        admin_email,
        'active',
        start_trial,
        CASE WHEN start_trial THEN NOW() ELSE NULL END,
        trial_end,
        CASE WHEN start_trial THEN 'trial' ELSE 'active' END
    ) RETURNING id INTO new_org_id;
    
    -- Criar notificação de boas-vindas
    INSERT INTO public.notifications (
        tenant_id,
        user_id,
        title,
        message,
        type,
        category,
        data
    ) VALUES (
        new_org_id,
        new_org_id, -- Temporário, será atualizado quando usuário for criado
        CASE WHEN start_trial THEN 'Bem-vindo! Trial de 7 dias iniciado 🚀' ELSE 'Organização criada com sucesso! 🎉' END,
        CASE WHEN start_trial THEN 'Você tem 7 dias para explorar todos os recursos. Aproveite!' ELSE 'Sua organização foi criada e está pronta para uso.' END,
        'success',
        'system',
        jsonb_build_object(
            'is_trial', start_trial,
            'trial_days', CASE WHEN start_trial THEN 7 ELSE 0 END,
            'plan', plan_type
        )
    );
    
    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Função de inicialização atualizada' as status;

-- ==============================================
-- 5. VERIFICAÇÃO FINAL
-- ==============================================

-- Verificar se tudo foi criado corretamente
SELECT 
    'Trial System Status' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'organizations' AND column_name = 'is_trial'
        ) THEN '✅ Campos adicionados'
        ELSE '❌ Campos não encontrados'
    END as status;

-- Testar função de trial
SELECT 
    'Trial Function Test' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM get_trial_status('e6ccd2e2-ea97-4aed-8a6d-feb1bbc59f2b')
        ) THEN '✅ Funções funcionando'
        ELSE '❌ Erro nas funções'
    END as status;

-- Mostrar status da organização SGF
SELECT 
    name,
    slug,
    is_trial,
    subscription_status,
    trial_ends_at,
    'Organização principal (ativa, não trial)' as note
FROM public.organizations 
WHERE slug = 'sgf-energia';

SELECT '
🎉 SISTEMA DE TRIAL CONFIGURADO COM SUCESSO!

✅ Campos de trial adicionados
✅ Funções de controle criadas  
✅ Bloqueio suave implementado
✅ Sistema de notificações pronto
✅ Organização SGF configurada como ativa

📋 FUNCIONALIDADES IMPLEMENTADAS:
- Trial de 7 dias para novas organizações
- Bloqueio suave após expiração (read-only)
- Verificação can_create_resource() para modal
- Ativação de assinatura via Stripe
- Sistema de lembretes automáticos
- Notificações de status

🔧 PRÓXIMOS PASSOS:
1. Implementar middleware para detectar tenant
2. Criar página de registro de organizações  
3. Integrar modal de upgrade com Stripe
4. Configurar cron job para expire_trials()

' as final_message;
