-- 🔧 CORREÇÃO COMPLETA: Tabela organizations + Função SQL
-- Execute este script no SQL Editor do Supabase para corrigir o erro
-- Data: Janeiro 2025

-- ========================================
-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA ORGANIZATIONS
-- ========================================

-- Adicionar coluna plan (obrigatória para o sistema)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basico';

-- Adicionar coluna plan_id para referência normalizada
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS plan_id UUID;

-- Adicionar colunas de trial
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');

-- Adicionar coluna de status da assinatura
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- Adicionar constraint de foreign key para plan_id (se a tabela plans existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
        -- Adicionar foreign key constraint
        ALTER TABLE organizations 
        ADD CONSTRAINT IF NOT EXISTS fk_organizations_plan_id 
        FOREIGN KEY (plan_id) REFERENCES plans(id);
    END IF;
END $$;

-- ========================================
-- 2. ATUALIZAR ORGANIZAÇÕES EXISTENTES
-- ========================================

-- Atualizar organizações existentes sem plano
UPDATE organizations 
SET 
  plan = COALESCE(plan, 'basico'),
  is_trial = COALESCE(is_trial, true),
  trial_start_date = COALESCE(trial_start_date, created_at),
  trial_end_date = COALESCE(trial_end_date, created_at + INTERVAL '7 days'),
  subscription_status = COALESCE(subscription_status, 'trial')
WHERE plan IS NULL OR plan = '';

-- Conectar com a tabela plans se ela existir
DO $$
DECLARE
    plan_basic_id UUID;
    plan_prof_id UUID;
BEGIN
    -- Verificar se a tabela plans existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
        -- Buscar IDs dos planos
        SELECT id INTO plan_basic_id FROM plans WHERE plan_code = 'basico' AND is_active = true;
        SELECT id INTO plan_prof_id FROM plans WHERE plan_code = 'profissional' AND is_active = true;
        
        -- Atualizar organizações com plan_id
        IF plan_basic_id IS NOT NULL THEN
            UPDATE organizations 
            SET plan_id = plan_basic_id 
            WHERE plan = 'basico' AND plan_id IS NULL;
        END IF;
        
        IF plan_prof_id IS NOT NULL THEN
            UPDATE organizations 
            SET plan_id = plan_prof_id 
            WHERE plan = 'profissional' AND plan_id IS NULL;
        END IF;
    END IF;
END $$;

-- ========================================
-- 3. CRIAR/ATUALIZAR FUNÇÃO SQL initialize_new_organization
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
  -- Log de início
  RAISE NOTICE 'Iniciando criação de organização: % com slug: %', org_name, org_slug;

  -- 1. Verificar se o plano existe (se a tabela plans existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    SELECT id INTO plan_record_id 
    FROM plans 
    WHERE plan_code = plan_type AND is_active = true;
    
    IF plan_record_id IS NULL THEN
      RAISE EXCEPTION 'Plano % não encontrado ou inativo', plan_type;
    END IF;
    
    RAISE NOTICE 'Plano encontrado: % (ID: %)', plan_type, plan_record_id;
  ELSE
    RAISE NOTICE 'Tabela plans não existe, usando plan_type diretamente';
  END IF;

  -- 2. Buscar o usuário admin pelo email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin com email % não encontrado', admin_email;
  END IF;
  
  RAISE NOTICE 'Usuário admin encontrado: % (ID: %)', admin_email, admin_user_id;

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
    plan_record_id, -- Pode ser NULL se tabela plans não existir
    start_trial,
    NOW(),
    CASE WHEN start_trial THEN NOW() + INTERVAL '7 days' ELSE NULL END,
    CASE WHEN start_trial THEN 'trial' ELSE 'active' END,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_org_id;

  RAISE NOTICE 'Organização criada com ID: %', new_org_id;

  -- 4. Atualizar o usuário admin com tenant_id
  UPDATE users 
  SET 
    tenant_id = new_org_id,
    role = COALESCE(role, 'admin'), -- Manter role existente ou definir como admin
    updated_at = NOW()
  WHERE id = admin_user_id;

  RAISE NOTICE 'Usuário admin atualizado com tenant_id: %', new_org_id;

  -- 5. Retornar o ID da organização criada
  RETURN new_org_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log detalhado do erro
    RAISE EXCEPTION 'Erro ao criar organização: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- ========================================
-- 4. COMENTÁRIOS E PERMISSÕES
-- ========================================

COMMENT ON FUNCTION initialize_new_organization IS 'Inicializa nova organização com usuário admin e configurações padrão - VERSÃO CORRIGIDA';

-- ========================================
-- 5. VERIFICAR RESULTADO
-- ========================================

-- Verificar se as colunas foram adicionadas
SELECT 'COLUNAS ADICIONADAS:' as info;
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

-- Verificar se a função foi criada/atualizada
SELECT 'FUNÇÃO SQL:' as info;
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'initialize_new_organization';

-- Testar a função com dados fictícios
SELECT 'TESTE DA FUNÇÃO:' as info;
SELECT 'Execute manualmente: SELECT initialize_new_organization(''Teste'', ''teste-' || extract(epoch from now())::text, ''teste@example.com'', ''Admin Teste'', ''basico'', true);' as comando_teste;

SELECT '✅ Tabela organizations corrigida e função SQL criada!' as status;
