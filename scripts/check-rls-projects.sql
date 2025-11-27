-- =====================================================
-- VERIFICAR RLS (Row Level Security) na tabela projects
-- =====================================================

-- 1. Ver se RLS está habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'projects';

-- 2. Ver TODAS as políticas RLS da tabela projects
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'projects';

-- 3. Testar se Service Role consegue ver os projetos
-- (Simular o que a API deveria fazer)
SELECT
  'TESTE SERVICE ROLE' as teste,
  COUNT(*) as total_projetos
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

-- 4. Ver detalhes dos projetos
SELECT
  'DETALHES DOS PROJETOS' as info,
  id,
  number,
  cliente_pacote_id,
  tenant_id,
  created_at
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6';
