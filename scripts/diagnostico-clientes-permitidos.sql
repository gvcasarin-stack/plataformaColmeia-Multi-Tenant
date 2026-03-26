-- ========================================
-- DIAGNÓSTICO: Verificar estrutura clientes_permitidos
-- ========================================

-- 1️⃣ Verificar se as colunas existem
SELECT 
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('clientes_permitidos', 'tem_restricao_clientes')
ORDER BY column_name;

-- 2️⃣ Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND (indexname LIKE '%clientes%' OR indexname LIKE '%restricao%');

-- 3️⃣ Verificar se há dados já salvos
SELECT 
  id,
  name,
  role,
  clientes_permitidos,
  tem_restricao_clientes
FROM users
WHERE role = 'colaborador'
LIMIT 5;

-- 4️⃣ Contar colaboradores
SELECT 
  COUNT(*) as total_colaboradores,
  COUNT(clientes_permitidos) as com_campo_clientes,
  COUNT(tem_restricao_clientes) as com_campo_restricao
FROM users
WHERE role = 'colaborador';

