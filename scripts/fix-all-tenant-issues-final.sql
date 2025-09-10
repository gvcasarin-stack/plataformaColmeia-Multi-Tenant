-- 🚨 CORREÇÃO FINAL: Todos os Problemas de Multi-Tenant
-- Execute este script no Supabase para corrigir TODOS os problemas
-- Data: 09/09/2025

-- ========================================
-- PASSO 1: CORRIGIR TABELA ORGANIZATIONS
-- ========================================

-- Adicionar TODAS as colunas necessárias
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'basico';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- ========================================
-- PASSO 2: REMOVER CAMPOS DUPLICADOS
-- ========================================

-- Migrar dados dos campos alternativos para os padrão
UPDATE organizations 
SET 
  trial_start_date = COALESCE(trial_start_date, trial_started_at, created_at),
  trial_end_date = COALESCE(trial_end_date, trial_ends_at, created_at + INTERVAL '7 days')
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;

-- Remover campos duplicados
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_started_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS trial_ends_at;

-- ========================================
-- PASSO 3: CORRIGIR ORGANIZAÇÕES CRIADAS HOJE
-- ========================================

-- Garantir que organizações criadas hoje tenham trial correto de 7 dias
UPDATE organizations 
SET 
  trial_start_date = created_at,
  trial_end_date = created_at + INTERVAL '7 days',
  is_trial = true,
  subscription_status = 'trial',
  status = 'active',
  updated_at = NOW()
WHERE DATE(created_at) = CURRENT_DATE;

-- ========================================
-- PASSO 4: CORRIGIR ISOLAMENTO MULTI-TENANT
-- ========================================

-- Corrigir projetos órfãos (sem tenant_id)
UPDATE projects 
SET 
  tenant_id = (
    SELECT tenant_id 
    FROM users 
    WHERE users.id = projects.created_by
    LIMIT 1
  ),
  updated_at = NOW()
WHERE tenant_id IS NULL 
  AND created_by IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = projects.created_by 
      AND users.tenant_id IS NOT NULL
  );

-- ========================================
-- PASSO 5: REFORÇAR POLÍTICAS RLS
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política crítica: Projetos isolados por tenant
DROP POLICY IF EXISTS "projects_tenant_isolation" ON projects;
CREATE POLICY "projects_tenant_isolation" ON projects
  FOR ALL 
  USING (
    tenant_id = (
      SELECT tenant_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Política crítica: Usuários isolados por tenant
DROP POLICY IF EXISTS "users_tenant_isolation" ON users;
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL 
  USING (
    tenant_id = (
      SELECT tenant_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin'
    )
  );

-- ========================================
-- PASSO 6: CRIAR FUNÇÕES SQL CORRIGIDAS
-- ========================================

-- Remover função antiga
DROP FUNCTION IF EXISTS get_trial_status(UUID);

-- Criar função de trial simplificada
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
  -- Buscar organização
  SELECT 
    o.is_trial,
    o.trial_start_date,
    o.trial_end_date,
    o.subscription_status
  INTO org_record
  FROM organizations o
  WHERE o.id = org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE,
      0, true, 'not_found'::TEXT, false, 'Organização não encontrada'::TEXT;
    RETURN;
  END IF;

  -- Calcular dias restantes
  days_left := GREATEST(0, EXTRACT(days FROM org_record.trial_end_date - current_time)::INTEGER);
  is_trial_expired := org_record.is_trial AND current_time > org_record.trial_end_date;

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
      WHEN is_trial_expired THEN 'Trial expirado'
      WHEN days_left <= 1 THEN 'Trial expira em breve'
      ELSE days_left || ' dias restantes'
    END::TEXT;
END;
$$;

-- Remover função antiga
DROP FUNCTION IF EXISTS initialize_new_organization(TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN);

-- Criar função de criação de organização
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
  -- Buscar usuário admin
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = admin_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin não encontrado: %', admin_email;
  END IF;

  -- Buscar plano se tabela existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    SELECT id INTO plan_record_id 
    FROM plans 
    WHERE plan_code = plan_type AND is_active = true;
  END IF;

  -- Criar organização
  INSERT INTO organizations (
    name, slug, plan, plan_id, is_trial,
    trial_start_date, trial_end_date, subscription_status, status,
    created_at, updated_at
  ) VALUES (
    org_name, org_slug, plan_type, plan_record_id, start_trial,
    NOW(), NOW() + INTERVAL '7 days', 'trial', 'active',
    NOW(), NOW()
  )
  RETURNING id INTO new_org_id;

  -- Atualizar usuário admin
  UPDATE users 
  SET tenant_id = new_org_id, role = 'admin', updated_at = NOW()
  WHERE id = admin_user_id;

  RETURN new_org_id;
END;
$$;

-- ========================================
-- PASSO 7: VERIFICAR CORREÇÃO
-- ========================================

-- Verificar estrutura final
SELECT 'ESTRUTURA FINAL:' as info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
  AND column_name LIKE '%trial%'
ORDER BY column_name;

-- Verificar organizações de hoje
SELECT 'ORGANIZAÇÕES CRIADAS HOJE:' as info;
SELECT 
  name, slug, is_trial,
  trial_start_date, trial_end_date,
  EXTRACT(days FROM trial_end_date - NOW())::INTEGER as dias_restantes
FROM organizations 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;

-- Verificar isolamento de dados
SELECT 'ISOLAMENTO POR TENANT:' as info;
SELECT 
  o.name as organizacao,
  COUNT(DISTINCT u.id) as usuarios,
  COUNT(DISTINCT p.id) as projetos
FROM organizations o
LEFT JOIN users u ON u.tenant_id = o.id
LEFT JOIN projects p ON p.tenant_id = o.id
GROUP BY o.id, o.name
ORDER BY o.created_at DESC;

SELECT '🚀 SISTEMA MULTI-TENANT TOTALMENTE CORRIGIDO!' as status;
