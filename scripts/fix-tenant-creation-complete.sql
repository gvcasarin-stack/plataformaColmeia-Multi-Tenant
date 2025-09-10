-- 🚨 CORREÇÃO CRÍTICA: Sistema de Criação de Tenants
-- Execute este script URGENTEMENTE no Supabase para corrigir erro de criação
-- Erro: column "plan" of relation "organizations" does not exist

-- ========================================
-- PASSO 1: CORRIGIR TABELA ORGANIZATIONS
-- ========================================

-- Adicionar todas as colunas necessárias para o sistema de planos
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basico';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- ========================================
-- PASSO 2: ATUALIZAR ORGANIZAÇÕES EXISTENTES
-- ========================================

UPDATE organizations 
SET 
  plan = COALESCE(plan, 'basico'),
  is_trial = COALESCE(is_trial, true),
  trial_start_date = COALESCE(trial_start_date, created_at, NOW()),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '7 days', NOW() + INTERVAL '7 days'),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE plan IS NULL;

-- ========================================
-- PASSO 3: CRIAR FUNÇÃO SQL CORRIGIDA
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
BEGIN
  -- Log de debug
  RAISE NOTICE '[initialize_new_organization] Iniciando: org=%, slug=%, email=%, plan=%', 
    org_name, org_slug, admin_email, plan_type;

  -- 1. Validar parâmetros obrigatórios
  IF org_name IS NULL OR org_name = '' THEN
    RAISE EXCEPTION 'Nome da organização é obrigatório';
  END IF;
  
  IF org_slug IS NULL OR org_slug = '' THEN
    RAISE EXCEPTION 'Slug da organização é obrigatório';
  END IF;
  
  IF admin_email IS NULL OR admin_email = '' THEN
    RAISE EXCEPTION 'Email do admin é obrigatório';
  END IF;

  -- 2. Verificar se o slug já existe
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) THEN
    RAISE EXCEPTION 'Slug % já está em uso', org_slug;
  END IF;

  -- 3. Buscar o usuário admin pelo email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin com email % não encontrado no auth.users', admin_email;
  END IF;
  
  RAISE NOTICE '[initialize_new_organization] Admin encontrado: %', admin_user_id;

  -- 4. Verificar se o plano existe (se a tabela plans existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    SELECT id INTO plan_record_id 
    FROM plans 
    WHERE plan_code = plan_type AND is_active = true;
    
    IF plan_record_id IS NULL THEN
      RAISE EXCEPTION 'Plano % não encontrado na tabela plans', plan_type;
    END IF;
    
    RAISE NOTICE '[initialize_new_organization] Plano encontrado: % (ID: %)', plan_type, plan_record_id;
  ELSE
    RAISE NOTICE '[initialize_new_organization] Tabela plans não existe, usando plan_type: %', plan_type;
  END IF;

  -- 5. Criar a organização
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

  RAISE NOTICE '[initialize_new_organization] Organização criada: %', new_org_id;

  -- 6. Atualizar o usuário admin com tenant_id
  UPDATE users 
  SET 
    tenant_id = new_org_id,
    role = COALESCE(role, 'admin'),
    updated_at = NOW()
  WHERE id = admin_user_id;

  RAISE NOTICE '[initialize_new_organization] Admin atualizado com tenant_id: %', new_org_id;

  -- 7. Retornar o ID da organização criada
  RETURN new_org_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '[initialize_new_organization] ERRO: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ========================================
-- PASSO 4: VERIFICAR CORREÇÃO
-- ========================================

-- Verificar estrutura da tabela
SELECT 'ESTRUTURA CORRIGIDA DA TABELA ORGANIZATIONS:' as info;
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Verificar função
SELECT 'FUNÇÃO SQL CRIADA:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name = 'initialize_new_organization';

-- Teste rápido da função (comentado para evitar execução acidental)
-- SELECT initialize_new_organization('Teste Org', 'teste-123', 'admin@teste.com', 'Admin Teste', 'basico', true);

SELECT '🚀 SISTEMA DE CRIAÇÃO DE TENANTS CORRIGIDO!' as status;
