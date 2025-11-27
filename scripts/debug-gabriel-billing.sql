-- ========================================
-- DEBUG: Verificar por que Gabriel Casarin não tem billing info
-- ========================================

-- 1. Verificar dados do usuário Gabriel Casarin
SELECT
  id,
  email,
  name,
  billing_mode,
  tenant_id,
  created_at
FROM users
WHERE email ILIKE '%gabriel%casarin%'
   OR name ILIKE '%gabriel%casarin%';

-- 2. Buscar TODOS os pacotes na tabela cliente_pacotes (ver estrutura da tabela)
SELECT * FROM cliente_pacotes
ORDER BY created_at DESC
LIMIT 5;

-- 3. Buscar pacotes do Gabriel especificamente
-- (substitua 'ID_DO_GABRIEL' pelo ID que aparecer na query 1)
SELECT
  cp.*,
  pd.nome as nome_pacote,
  pd.quantidade_projetos,
  pd.preco
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
ORDER BY cp.created_at DESC;

-- 4. Verificar se o campo é "cliente_id" ao invés de "user_id"
-- (caso a query 3 retorne vazio)
SELECT
  cp.*,
  pd.nome as nome_pacote
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.cliente_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
ORDER BY cp.created_at DESC;

-- 5. Buscar QUALQUER pacote relacionado ao tenant do Gabriel
SELECT
  cp.*,
  u.email,
  u.name,
  pd.nome as nome_pacote
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE u.tenant_id = (
  SELECT tenant_id FROM users WHERE id = 'b772107b-bfa8-48e7-81ac-995331e66623'
)
ORDER BY cp.created_at DESC;
