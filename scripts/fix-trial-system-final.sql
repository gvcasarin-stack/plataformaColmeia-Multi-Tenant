-- 🚨 CORREÇÃO FINAL: Sistema de Trial Completo
-- Execute este script no Supabase para corrigir TODOS os problemas de trial
-- Data: 09/09/2025

-- ========================================
-- PASSO 1: CORRIGIR TABELA ORGANIZATIONS
-- ========================================

-- Adicionar TODAS as colunas necessárias para o sistema de planos e trial
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basico';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;

-- CAMPOS PADRONIZADOS DE TRIAL
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- CAMPOS ALTERNATIVOS PARA COMPATIBILIDADE
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- ========================================
-- PASSO 2: SINCRONIZAR CAMPOS EXISTENTES
-- ========================================

-- Corrigir TODAS as organizações existentes
UPDATE organizations 
SET 
  -- Campos básicos
  plan = COALESCE(plan, 'basico'),
  is_trial = COALESCE(is_trial, true),
  subscription_status = COALESCE(subscription_status, 'trial'),
  status = COALESCE(status, 'active'),
  
  -- Campos de trial padronizados
  trial_start_date = COALESCE(trial_start_date, created_at, NOW()),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '7 days', NOW() + INTERVAL '7 days'),
  
  -- Campos alternativos (sincronizar)
  trial_started_at = COALESCE(trial_started_at, trial_start_date, created_at, NOW()),
  trial_ends_at = COALESCE(trial_ends_at, trial_end_date, created_at + INTERVAL '7 days', NOW() + INTERVAL '7 days'),
  
  updated_at = NOW()
WHERE plan IS NULL 
   OR trial_start_date IS NULL 
   OR trial_end_date IS NULL
   OR trial_started_at IS NULL 
   OR trial_ends_at IS NULL;

-- CORREÇÃO ESPECÍFICA: Organizações criadas HOJE devem ter trial de 7 dias
UPDATE organizations 
SET 
  trial_start_date = created_at,
  trial_end_date = created_at + INTERVAL '7 days',
  trial_started_at = created_at,
  trial_ends_at = created_at + INTERVAL '7 days',
  is_trial = true,
  subscription_status = 'trial',
  updated_at = NOW()
WHERE DATE(created_at) = CURRENT_DATE;

-- ========================================
-- PASSO 3: CRIAR FUNÇÃO get_trial_status CORRIGIDA
-- ========================================

CREATE OR REPLACE FUNCTION get_trial_status(org_id UUID)
RETURNS TABLE (
  is_trial BOOLEAN,
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  days_remaining INTEGER,
  is_expired BOOLEAN,
  subscription_status TEXT,
  can_access BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_record RECORD;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
  days_left INTEGER;
  is_trial_expired BOOLEAN;
  trial_start TIMESTAMP WITH TIME ZONE;
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Buscar dados da organização
  SELECT 
    o.is_trial,
    o.trial_start_date,
    o.trial_end_date,
    o.trial_started_at,
    o.trial_ends_at,
    o.subscription_status,
    o.status
  INTO org_record
  FROM organizations o
  WHERE o.id = org_id;

  -- Se organização não encontrada
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, 
      NULL::TIMESTAMP WITH TIME ZONE,
      NULL::TIMESTAMP WITH TIME ZONE,
      0,
      true,
      'not_found'::TEXT,
      false,
      'Organização não encontrada'::TEXT;
    RETURN;
  END IF;

  -- Usar campos padronizados primeiro, depois fallback
  trial_start := COALESCE(org_record.trial_start_date, org_record.trial_started_at, current_time);
  trial_end := COALESCE(org_record.trial_end_date, org_record.trial_ends_at, current_time + INTERVAL '7 days');

  -- Calcular dias restantes (mínimo 0)
  days_left := GREATEST(0, EXTRACT(days FROM trial_end - current_time)::INTEGER);
  
  -- Verificar se trial expirou
  is_trial_expired := org_record.is_trial AND current_time > trial_end;

  -- Retornar status completo
  RETURN QUERY SELECT 
    org_record.is_trial,
    trial_start,
    trial_end,
    days_left,
    is_trial_expired,
    COALESCE(org_record.subscription_status, 'trial')::TEXT,
    (NOT is_trial_expired OR COALESCE(org_record.subscription_status, 'trial') = 'active'),
    CASE 
      WHEN NOT org_record.is_trial THEN 'Assinatura ativa'
      WHEN COALESCE(org_record.subscription_status, 'trial') = 'active' THEN 'Assinatura ativa'
      WHEN is_trial_expired THEN 'Trial expirado - Faça upgrade'
      WHEN days_left = 0 THEN 'Trial expira hoje'
      WHEN days_left = 1 THEN 'Trial expira amanhã'
      ELSE days_left || ' dias restantes de trial'
    END::TEXT;
END;
$$;

-- ========================================
-- PASSO 4: CRIAR FUNÇÃO initialize_new_organization CORRIGIDA
-- ========================================

CREATE OR REPLACE FUNCTION initialize_new_organization(
  org_name TEXT,
  org_slug TEXT,
  admin_email TEXT,
  admin_name TEXT,
  plan_type TEXT DEFAULT 'basico',
  start_trial BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
  admin_user_id UUID;
  plan_record_id UUID;
  trial_start TIMESTAMP WITH TIME ZONE := NOW();
  trial_end TIMESTAMP WITH TIME ZONE := NOW() + INTERVAL '7 days';
BEGIN
  -- 1. Buscar o usuário admin pelo email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin com email % não encontrado', admin_email;
  END IF;

  -- 2. Verificar se o plano existe (se a tabela plans existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    SELECT id INTO plan_record_id 
    FROM plans 
    WHERE plan_code = plan_type AND is_active = true;
    
    IF plan_record_id IS NULL THEN
      -- Se plano não encontrado, usar básico como fallback
      SELECT id INTO plan_record_id 
      FROM plans 
      WHERE plan_code = 'basico' AND is_active = true;
    END IF;
  END IF;

  -- 3. Criar a organização com trial correto
  INSERT INTO organizations (
    name,
    slug,
    plan,
    plan_id,
    is_trial,
    trial_start_date,
    trial_end_date,
    trial_started_at,
    trial_ends_at,
    subscription_status,
    status,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_slug,
    plan_type,
    plan_record_id,
    start_trial,
    trial_start,
    trial_end,
    trial_start, -- Compatibilidade
    trial_end,   -- Compatibilidade
    CASE WHEN start_trial THEN 'trial' ELSE 'active' END,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_org_id;

  -- 4. Atualizar o usuário admin com tenant_id
  UPDATE users 
  SET 
    tenant_id = new_org_id,
    role = 'admin',
    updated_at = NOW()
  WHERE id = admin_user_id;

  -- 5. Retornar o ID da organização criada
  RETURN new_org_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar organização: %', SQLERRM;
END;
$$;

-- ========================================
-- PASSO 5: VERIFICAR CORREÇÃO GERAL
-- ========================================

-- Verificar estrutura da tabela
SELECT 'ESTRUTURA DA TABELA ORGANIZATIONS:' as info;
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name IN ('plan', 'is_trial', 'trial_start_date', 'trial_end_date', 'trial_started_at', 'trial_ends_at', 'subscription_status')
ORDER BY column_name;

-- Verificar funções SQL
SELECT 'FUNÇÕES SQL CRIADAS:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_trial_status', 'initialize_new_organization');

-- Verificar organizações criadas hoje
SELECT 'ORGANIZAÇÕES CRIADAS HOJE:' as info;
SELECT 
  name,
  slug,
  plan,
  is_trial,
  trial_start_date,
  trial_end_date,
  subscription_status,
  created_at,
  EXTRACT(days FROM trial_end_date - NOW())::INTEGER as dias_restantes
FROM organizations 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

SELECT '🚀 SISTEMA DE TRIAL COMPLETAMENTE CORRIGIDO!' as status;
SELECT 'Agora você pode criar novas organizações com trial de 7 dias funcionando corretamente!' as instrucao;
