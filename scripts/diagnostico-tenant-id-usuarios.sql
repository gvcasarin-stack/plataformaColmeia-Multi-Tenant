-- DIAGNÓSTICO: Verificar se usuários admin/superadmin têm tenant_id preenchido
-- Este script verifica se o campo tenant_id está NULL para usuários admin

-- 1. Contar quantos admins/superadmins existem
SELECT
  'Total de admins/superadmins' as tipo,
  COUNT(*) as quantidade
FROM users
WHERE role IN ('admin', 'superadmin', 'colaborador');

-- 2. Contar quantos admins/superadmins têm tenant_id NULL
SELECT
  'Admins/superadmins com tenant_id NULL' as tipo,
  COUNT(*) as quantidade
FROM users
WHERE role IN ('admin', 'superadmin', 'colaborador')
  AND tenant_id IS NULL;

-- 3. Contar quantos admins/superadmins têm tenant_id preenchido
SELECT
  'Admins/superadmins com tenant_id preenchido' as tipo,
  COUNT(*) as quantidade
FROM users
WHERE role IN ('admin', 'superadmin', 'colaborador')
  AND tenant_id IS NOT NULL;

-- 4. Listar todos os admins/superadmins com status do tenant_id
SELECT
  id,
  name,
  email,
  role,
  tenant_id,
  CASE
    WHEN tenant_id IS NULL THEN '❌ NULL (vai bloquear e-mails)'
    ELSE '✅ Preenchido'
  END as status_tenant_id
FROM users
WHERE role IN ('admin', 'superadmin', 'colaborador')
ORDER BY role, name;

-- 5. Verificar se a tabela users tem a coluna tenant_id
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'tenant_id';
