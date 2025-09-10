-- 🔍 DIAGNÓSTICO: Verificar estrutura da tabela organizations
-- Execute este script no SQL Editor do Supabase para diagnosticar o problema

-- ========================================
-- 1. VERIFICAR SE A TABELA ORGANIZATIONS EXISTE
-- ========================================

SELECT 'VERIFICANDO TABELA ORGANIZATIONS:' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'organizations';

-- ========================================
-- 2. LISTAR TODAS AS COLUNAS DA TABELA
-- ========================================

SELECT 'COLUNAS ATUAIS DA TABELA ORGANIZATIONS:' as info;

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'organizations'
ORDER BY ordinal_position;

-- ========================================
-- 3. VERIFICAR SE A FUNÇÃO SQL EXISTE
-- ========================================

SELECT 'VERIFICANDO FUNÇÃO initialize_new_organization:' as info;

SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'initialize_new_organization';

-- ========================================
-- 4. VERIFICAR DADOS ATUAIS DAS ORGANIZAÇÕES
-- ========================================

SELECT 'ORGANIZAÇÕES EXISTENTES:' as info;

SELECT 
  id,
  name,
  slug,
  created_at,
  -- Tentar acessar coluna plan (vai dar erro se não existir)
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'organizations' 
        AND column_name = 'plan'
    ) THEN 'COLUNA PLAN EXISTE'
    ELSE 'COLUNA PLAN NÃO EXISTE'
  END as plan_column_status
FROM organizations 
ORDER BY created_at DESC 
LIMIT 5;

-- ========================================
-- 5. VERIFICAR SE TABELA PLANS EXISTE
-- ========================================

SELECT 'VERIFICANDO TABELA PLANS:' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'plans';

-- Se a tabela plans existir, mostrar dados
SELECT 
  plan_code,
  name,
  price,
  is_active
FROM plans 
WHERE is_active = true
ORDER BY sort_order;

SELECT '🔍 DIAGNÓSTICO COMPLETO DA ESTRUTURA!' as status;
