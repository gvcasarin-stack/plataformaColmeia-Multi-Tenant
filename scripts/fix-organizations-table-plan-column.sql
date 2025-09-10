-- 🔧 CORREÇÃO: Adicionar coluna 'plan' na tabela organizations
-- Execute este script no SQL Editor do Supabase
-- Data: Janeiro 2025

-- ========================================
-- 1. VERIFICAR ESTRUTURA ATUAL DA TABELA
-- ========================================

-- Verificar se a tabela organizations existe e suas colunas
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- ========================================
-- 2. ADICIONAR COLUNA PLAN SE NÃO EXISTIR
-- ========================================

-- Adicionar coluna plan para armazenar o tipo de plano da organização
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basico';

-- Adicionar coluna plan_id para referência à tabela plans (opcional, mais normalizado)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

-- Adicionar colunas relacionadas ao trial
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Adicionar coluna de status da assinatura
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- ========================================
-- 3. ATUALIZAR ORGANIZAÇÕES EXISTENTES
-- ========================================

-- Atualizar organizações existentes que não têm plano definido
UPDATE organizations 
SET 
  plan = 'basico',
  is_trial = true,
  trial_start_date = COALESCE(trial_start_date, created_at),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '7 days'),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE plan IS NULL OR plan = '';

-- ========================================
-- 4. CRIAR/ATUALIZAR FUNÇÃO SQL
-- ========================================

-- Função para inicializar nova organização
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
BEGIN
  -- 1. Verificar se o plano existe
  SELECT id INTO plan_record_id 
  FROM plans 
  WHERE plan_code = plan_type AND is_active = true;
  
  IF plan_record_id IS NULL THEN
    RAISE EXCEPTION 'Plano % não encontrado ou inativo', plan_type;
  END IF;

  -- 2. Buscar o usuário admin pelo email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin com email % não encontrado', admin_email;
  END IF;

  -- 3. Criar a organização
  INSERT INTO organizations (
    name,
    slug,
    plan,
    plan_id,
    is_trial,
    trial_start_date,
    trial_end_date,
    subscription_status,
    created_at,
    updated_at
  ) VALUES (
    org_name,
    org_slug,
    plan_type,
    plan_record_id,
    start_trial,
    NOW(),
    CASE WHEN start_trial THEN NOW() + INTERVAL '7 days' ELSE NULL END,
    CASE WHEN start_trial THEN 'trial' ELSE 'active' END,
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
    -- Log do erro para debug
    RAISE EXCEPTION 'Erro ao criar organização: %', SQLERRM;
END;
$$;

-- ========================================
-- 5. COMENTÁRIOS E PERMISSÕES
-- ========================================

-- Comentários para documentação
COMMENT ON FUNCTION initialize_new_organization IS 'Inicializa nova organização com usuário admin e configurações padrão';
COMMENT ON COLUMN organizations.plan IS 'Tipo de plano da organização (basico, profissional)';
COMMENT ON COLUMN organizations.plan_id IS 'Referência ao plano na tabela plans';
COMMENT ON COLUMN organizations.is_trial IS 'Se a organização está em período de trial';
COMMENT ON COLUMN organizations.subscription_status IS 'Status da assinatura (trial, active, suspended, cancelled)';

-- ========================================
-- 6. VERIFICAR RESULTADO
-- ========================================

-- Verificar se as colunas foram adicionadas
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name IN ('plan', 'plan_id', 'is_trial', 'trial_start_date', 'trial_end_date', 'subscription_status')
ORDER BY column_name;

-- Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'initialize_new_organization';

SELECT '✅ Tabela organizations atualizada e função SQL criada com sucesso!' as status;
