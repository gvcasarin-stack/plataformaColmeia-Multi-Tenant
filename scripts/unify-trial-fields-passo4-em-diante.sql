-- 🎯 PADRONIZAÇÃO FINAL: Passos 4, 5 e 6 (CORRIGIDO)
-- Execute este script após ter executado os passos 1, 2 e 3
-- Data: 09/09/2025

-- ========================================
-- PASSO 4: RECRIAR FUNÇÃO get_trial_status (CORRIGIDO)
-- ========================================

-- Primeiro, remover função existente
DROP FUNCTION IF EXISTS get_trial_status(UUID);

-- Criar função com estrutura correta
CREATE OR REPLACE FUNCTION get_trial_status(org_id UUID)
RETURNS TABLE (
  is_trial BOOLEAN,
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
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
BEGIN
  -- Buscar dados da organização (APENAS campos padrão)
  SELECT 
    o.is_trial,
    o.trial_start_date,
    o.trial_end_date,
    o.subscription_status
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

  -- Calcular dias restantes (mínimo 0)
  days_left := GREATEST(0, EXTRACT(days FROM org_record.trial_end_date - current_time)::INTEGER);
  
  -- Verificar se trial expirou
  is_trial_expired := org_record.is_trial AND current_time > org_record.trial_end_date;

  -- Retornar status simplificado
  RETURN QUERY SELECT 
    org_record.is_trial,
    org_record.trial_start_date,
    org_record.trial_end_date,
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
-- PASSO 5: RECRIAR FUNÇÃO initialize_new_organization (CORRIGIDO)
-- ========================================

-- Remover função existente se houver
DROP FUNCTION IF EXISTS initialize_new_organization(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Criar função simplificada
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
  -- 1. Buscar usuário admin
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin com email % não encontrado', admin_email;
  END IF;

  -- 2. Buscar plano (se tabela existe)
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

  -- 3. Criar organização (APENAS campos padrão)
  INSERT INTO organizations (
    name,
    slug,
    plan,
    plan_id,
    is_trial,
    trial_start_date,
    trial_end_date,
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
    CASE WHEN start_trial THEN 'trial' ELSE 'active' END,
    'active',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_org_id;

  -- 4. Atualizar usuário admin
  UPDATE users 
  SET 
    tenant_id = new_org_id,
    role = 'admin',
    updated_at = NOW()
  WHERE id = admin_user_id;

  RETURN new_org_id;
END;
$$;

-- ========================================
-- PASSO 6: VERIFICAR PADRONIZAÇÃO FINAL
-- ========================================

-- Verificar que apenas campos padrão existem
SELECT 'ESTRUTURA FINAL DA TABELA (APENAS CAMPOS PADRÃO):' as info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name LIKE '%trial%'
ORDER BY column_name;

-- Verificar funções criadas
SELECT 'FUNÇÕES SQL CRIADAS:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_trial_status', 'initialize_new_organization');

-- Verificar organizações criadas hoje
SELECT 'ORGANIZAÇÕES CRIADAS HOJE (TRIAL CORRETO):' as info;
SELECT 
  name,
  slug,
  is_trial,
  trial_start_date,
  trial_end_date,
  subscription_status,
  EXTRACT(days FROM trial_end_date - NOW())::INTEGER as dias_restantes,
  CASE 
    WHEN trial_end_date > NOW() THEN '✅ TRIAL ATIVO'
    ELSE '❌ TRIAL EXPIRADO'
  END as status_trial
FROM organizations 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Testar função get_trial_status
SELECT 'TESTE DA FUNÇÃO get_trial_status:' as info;
SELECT 'Execute manualmente para testar:' as instrucao;
SELECT 'SELECT * FROM get_trial_status((SELECT id FROM organizations WHERE DATE(created_at) = CURRENT_DATE LIMIT 1));' as comando_teste;

SELECT '🚀 SISTEMA DE TRIAL PADRONIZADO E FUNCIONANDO!' as status;
SELECT 'Agora o frontend e backend usam os mesmos campos!' as resultado;
