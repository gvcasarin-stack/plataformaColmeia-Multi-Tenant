-- ========================================
-- Script: Diagnóstico CORRIGIDO - Conversão de Pacotes
-- Data: 2025-01-28
-- Correção: Usa 'name' ao invés de 'full_name'
-- ========================================

-- 📊 DADOS JÁ OBTIDOS DO PROJETO FV-2025-377:
-- owner_id: b772107b-bfa8-48e7-81ac-995331e66623
-- empresa_integradora: "Catarina Solar"
-- nome_cliente_final: "Teste Pacote 6"
-- tenant_id: 061ff77b-8b3a-4732-9158-a574c1f1690a

-- 🔍 PASSO 2 CORRIGIDO: Buscar usuário dono do projeto
-- ========================================
SELECT
  u.id AS user_id,
  u.email,
  u.name,  -- ✅ CORRIGIDO: era full_name
  u.role,
  u.billing_mode,
  u.tenant_id
FROM users u
WHERE u.id = 'b772107b-bfa8-48e7-81ac-995331e66623';  -- owner_id do projeto

-- 🔍 PASSO 3 CORRIGIDO: Buscar pacotes da Catarina Solar
-- ========================================
SELECT
  cp.id AS pacote_id,
  cp.user_id,
  cp.status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  cp.data_ativacao,
  cp.data_expiracao,
  cp.tenant_id,
  u.email AS user_email,
  u.name AS user_name,  -- ✅ CORRIGIDO: era full_name
  pd.nome AS pacote_nome
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.status = 'ativo'
  AND u.name ILIKE '%catarina%'  -- ✅ CORRIGIDO: era full_name
  AND cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY cp.data_ativacao DESC
LIMIT 5;

-- 🔍 PASSO 4 CRÍTICO: COMPARAR owner_id vs user_id
-- ========================================
SELECT
  -- Dados do Projeto
  p.id AS project_id,
  p.number AS project_number,
  p.owner_id AS project_owner_id,
  p.billing_mode AS project_billing_mode,
  p.nome_cliente_final,
  p.empresa_integradora,

  -- Dados do Pacote
  cp.id AS pacote_id,
  cp.user_id AS pacote_user_id,
  cp.status AS pacote_status,
  cp.projetos_usados,
  cp.projetos_inclusos,

  -- 🎯 VERIFICAÇÃO CRÍTICA
  (p.owner_id = cp.user_id) AS "IDs_MATCH",

  -- Dados do usuário do projeto (owner)
  u_proj.email AS project_owner_email,
  u_proj.name AS project_owner_name,  -- ✅ CORRIGIDO
  u_proj.role AS project_owner_role,

  -- Dados do usuário do pacote
  u_pac.email AS pacote_user_email,
  u_pac.name AS pacote_user_name,  -- ✅ CORRIGIDO
  u_pac.role AS pacote_user_role

FROM projects p
CROSS JOIN cliente_pacotes cp
LEFT JOIN users u_proj ON u_proj.id = p.owner_id
LEFT JOIN users u_pac ON u_pac.id = cp.user_id
WHERE p.number = 'FV-2025-377'
  AND cp.status = 'ativo'
  AND p.tenant_id = cp.tenant_id
  AND cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY cp.data_ativacao DESC;

-- 🔍 PASSO 5: Buscar TODOS os usuários com "Catarina" no nome
-- ========================================
SELECT
  id,
  email,
  name,  -- ✅ CORRIGIDO
  role,
  billing_mode,
  tenant_id,
  created_at
FROM users
WHERE (name ILIKE '%catarina%' OR email ILIKE '%catarina%')  -- ✅ CORRIGIDO
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY created_at DESC;

-- 🔍 PASSO 6: Buscar pacotes pelo tenant (sem filtro de nome)
-- ========================================
-- Para ver TODOS os pacotes ativos no tenant
SELECT
  cp.id AS pacote_id,
  cp.user_id,
  cp.status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  u.email AS user_email,
  u.name AS user_name,  -- ✅ CORRIGIDO
  u.role,
  pd.nome AS pacote_nome
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.status = 'ativo'
  AND cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY cp.data_ativacao DESC;

-- ========================================
-- 📊 ANÁLISE PRELIMINAR BASEADA NOS RESULTADOS JÁ OBTIDOS
-- ========================================
--
-- Projeto FV-2025-377:
-- - owner_id: b772107b-bfa8-48e7-81ac-995331e66623
-- - empresa_integradora: "Catarina Solar"
-- - nome_cliente_final: "Teste Pacote 6"
--
-- 🎯 HIPÓTESE CONFIRMADA:
-- "Catarina Solar" NÃO é o cliente final, é a EMPRESA INTEGRADORA!
-- O cliente final é "Teste Pacote 6"
--
-- O pacote está ativado para "Catarina Solar" (empresa)
-- Mas o projeto pertence a "Teste Pacote 6" (cliente final)
--
-- Por isso owner_id ≠ pacote.user_id
--
-- ✅ SOLUÇÃO:
-- API deve buscar pacotes da EMPRESA INTEGRADORA, não do owner_id
-- OU buscar pacotes por tenant e permitir seleção manual
--
-- ========================================
