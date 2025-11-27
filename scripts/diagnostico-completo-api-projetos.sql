-- =====================================================
-- DIAGNÓSTICO COMPLETO: Por que a API não retorna projetos?
-- =====================================================

-- PARTE 1: VERIFICAR RLS (Row Level Security)
-- =====================================================

-- 1.1. Ver se RLS está habilitado na tabela projects
SELECT
  'RLS STATUS' as diagnostico,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'projects';

-- 1.2. Ver TODAS as políticas RLS da tabela projects
SELECT
  'POLÍTICAS RLS' as diagnostico,
  policyname,
  permissive,
  roles,
  cmd as comando,
  qual as condicao_where
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;

-- PARTE 2: TESTAR ACESSO DIRETO AOS PROJETOS
-- =====================================================

-- 2.1. Simular exatamente o que a API faz (sem RLS)
SELECT
  'QUERY SEM RLS (SERVICE ROLE)' as diagnostico,
  id,
  number,
  cliente_pacote_id,
  tenant_id,
  billing_mode,
  deleted_at
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY created_at DESC;

-- 2.2. Verificar permissões da role service_role
SELECT
  'PERMISSÕES SERVICE ROLE' as diagnostico,
  has_table_privilege('service_role', 'projects', 'SELECT') as pode_select,
  has_table_privilege('service_role', 'projects', 'INSERT') as pode_insert,
  has_table_privilege('service_role', 'projects', 'UPDATE') as pode_update,
  has_table_privilege('service_role', 'projects', 'DELETE') as pode_delete;

-- PARTE 3: VERIFICAR SE HÁ ALGO BLOQUEANDO
-- =====================================================

-- 3.1. Ver se há triggers que podem estar interferindo
SELECT
  'TRIGGERS NA TABELA' as diagnostico,
  trigger_name,
  event_manipulation as evento,
  action_statement as acao
FROM information_schema.triggers
WHERE event_object_table = 'projects'
ORDER BY trigger_name;

-- 3.2. Ver se há views ou materialized views envolvidas
SELECT
  'VIEWS RELACIONADAS' as diagnostico,
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition ILIKE '%projects%'
LIMIT 5;

-- PARTE 4: VERIFICAR ESTRUTURA DA TABELA
-- =====================================================

-- 4.1. Ver TODAS as colunas da tabela projects
SELECT
  'COLUNAS DA TABELA' as diagnostico,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN (
    'id', 'number', 'empresaIntegradora', 'nomeClienteFinal',
    'potenciakWp', 'status', 'payment_status', 'created_at',
    'cliente_pacote_id', 'tenant_id', 'billing_mode', 'deleted_at'
  )
ORDER BY ordinal_position;

-- PARTE 5: TESTE FINAL - SIMULAR EXATAMENTE A QUERY DA API
-- =====================================================

DO $$
DECLARE
  projeto_record RECORD;
  total_encontrado INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIMULAÇÃO DA QUERY DA API';
  RAISE NOTICE '========================================';

  -- Query EXATA que a API faz
  FOR projeto_record IN
    SELECT
      id,
      number,
      empresaIntegradora,
      nomeClienteFinal,
      potenciakWp,
      status,
      payment_status,
      created_at
    FROM projects
    WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
      AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    ORDER BY created_at DESC
  LOOP
    total_encontrado := total_encontrado + 1;
    RAISE NOTICE 'Projeto %: % (ID: %)', total_encontrado, projeto_record.number, projeto_record.id;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL ENCONTRADO: % projetos', total_encontrado;
  RAISE NOTICE '========================================';

  IF total_encontrado = 0 THEN
    RAISE NOTICE '🚨 PROBLEMA: Query não retorna nenhum projeto!';
    RAISE NOTICE '   Possível causa: RLS bloqueando mesmo com service_role';
  ELSIF total_encontrado = 2 THEN
    RAISE NOTICE '✅ Query SQL funciona perfeitamente!';
    RAISE NOTICE '   Problema deve estar no código da API ou Service Role Key';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- PARTE 6: RELATÓRIO FINAL
-- =====================================================

SELECT
  'RESUMO DO DIAGNÓSTICO' as secao,
  (SELECT COUNT(*) FROM projects
   WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6') as projetos_encontrados,
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'projects') as rls_habilitado,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'projects') as total_politicas_rls;
