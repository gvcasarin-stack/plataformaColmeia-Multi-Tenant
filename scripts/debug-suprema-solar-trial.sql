-- 🔍 DIAGNÓSTICO ESPECÍFICO: Organização Suprema Solar
-- Execute este script para verificar o trial da organização criada

-- ========================================
-- 1. VERIFICAR ORGANIZAÇÃO SUPREMA SOLAR
-- ========================================

SELECT 'DADOS DA ORGANIZAÇÃO SUPREMA SOLAR:' as info;

SELECT 
  id,
  name,
  slug,
  plan,
  is_trial,
  trial_start_date,
  trial_end_date,
  trial_started_at,
  trial_ends_at,
  subscription_status,
  status,
  created_at,
  updated_at,
  -- Cálculos de trial
  NOW() as agora,
  EXTRACT(days FROM COALESCE(trial_end_date, trial_ends_at) - NOW())::INTEGER as dias_restantes,
  CASE 
    WHEN COALESCE(trial_end_date, trial_ends_at) > NOW() THEN 'TRIAL ATIVO'
    ELSE 'TRIAL EXPIRADO'
  END as status_trial
FROM organizations 
WHERE name ILIKE '%suprema%' OR slug ILIKE '%suprema%'
ORDER BY created_at DESC
LIMIT 3;

-- ========================================
-- 2. VERIFICAR USUÁRIO GABRIEL CASARIN
-- ========================================

SELECT 'DADOS DO USUÁRIO GABRIEL CASARIN:' as info;

SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.tenant_id,
  u.created_at,
  o.name as organization_name,
  o.slug as organization_slug,
  o.is_trial,
  o.trial_end_date,
  o.trial_ends_at
FROM users u
LEFT JOIN organizations o ON u.tenant_id = o.id
WHERE u.email = 'casarin166@yahoo.com.br'
ORDER BY u.created_at DESC;

-- ========================================
-- 3. CORRIGIR TRIAL DA ORGANIZAÇÃO ESPECÍFICA
-- ========================================

-- Corrigir trial para organizações criadas hoje
UPDATE organizations 
SET 
  trial_start_date = created_at,
  trial_end_date = created_at + INTERVAL '7 days',
  trial_started_at = created_at,
  trial_ends_at = created_at + INTERVAL '7 days',
  is_trial = true,
  subscription_status = 'trial',
  updated_at = NOW()
WHERE (name ILIKE '%suprema%' OR slug ILIKE '%suprema%')
  AND DATE(created_at) = CURRENT_DATE;

-- ========================================
-- 4. VERIFICAR CORREÇÃO
-- ========================================

SELECT 'APÓS CORREÇÃO:' as info;

SELECT 
  name,
  slug,
  is_trial,
  trial_start_date,
  trial_end_date,
  trial_started_at,
  trial_ends_at,
  subscription_status,
  created_at,
  -- Verificar se trial está correto agora
  EXTRACT(days FROM trial_end_date - NOW())::INTEGER as dias_restantes_correto,
  CASE 
    WHEN trial_end_date > NOW() THEN '✅ TRIAL ATIVO'
    ELSE '❌ TRIAL EXPIRADO'
  END as status_final
FROM organizations 
WHERE name ILIKE '%suprema%' OR slug ILIKE '%suprema%'
ORDER BY created_at DESC;

SELECT '✅ Trial da organização Suprema Solar corrigido!' as status;
