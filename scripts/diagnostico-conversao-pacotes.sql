-- ========================================
-- Script: Diagnóstico - Conversão de Pacotes Não Aparece
-- Data: 2025-01-28
-- Descrição: Investigar por que pacotes disponíveis não aparecem no modal
-- ========================================

-- 🔍 PASSO 1: Buscar o projeto FV-2025-377
-- ========================================
SELECT
  id AS project_id,
  number AS project_number,
  owner_id,
  billing_mode,
  tenant_id,
  nome_cliente_final,
  empresa_integradora,
  created_at
FROM projects
WHERE number LIKE '%377%'  -- Ajustar conforme número exato
  OR nome_cliente_final ILIKE '%catarina%'
ORDER BY created_at DESC
LIMIT 5;

-- 🔍 PASSO 2: Buscar usuário dono do projeto
-- ========================================
-- Copie o owner_id do resultado acima e substitua abaixo
SELECT
  u.id AS user_id,
  u.email,
  u.full_name,
  u.role,
  u.billing_mode,
  u.tenant_id
FROM users u
WHERE u.id = 'b772107b-bfa8-48e7-81ac-995331e66623';  -- 🔧 SUBSTITUIR

-- 🔍 PASSO 3: Buscar pacotes ativos da Catarina Solar
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
  u.full_name AS user_name,
  pd.nome AS pacote_nome
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.status = 'ativo'
  AND u.full_name ILIKE '%catarina%'
ORDER BY cp.data_ativacao DESC
LIMIT 5;

-- 🔍 PASSO 4: COMPARAÇÃO CRÍTICA - owner_id vs user_id
-- ========================================
-- Esta query mostra SE os IDs correspondem
SELECT
  p.id AS project_id,
  p.number AS project_number,
  p.owner_id AS project_owner_id,
  p.billing_mode AS project_billing_mode,
  cp.id AS pacote_id,
  cp.user_id AS pacote_user_id,
  cp.status AS pacote_status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  -- 🔍 VERIFICAÇÃO CRÍTICA
  (p.owner_id = cp.user_id) AS "IDs_MATCH",
  -- Dados do usuário do projeto
  u_proj.email AS project_user_email,
  u_proj.full_name AS project_user_name,
  -- Dados do usuário do pacote
  u_pac.email AS pacote_user_email,
  u_pac.full_name AS pacote_user_name
FROM projects p
CROSS JOIN cliente_pacotes cp
LEFT JOIN users u_proj ON u_proj.id = p.owner_id
LEFT JOIN users u_pac ON u_pac.id = cp.user_id
WHERE p.number LIKE '%377%'
  AND cp.status = 'ativo'
  AND p.tenant_id = cp.tenant_id
ORDER BY p.created_at DESC
LIMIT 10;

-- ✅ INTERPRETAÇÃO DOS RESULTADOS:
--
-- Se IDs_MATCH = TRUE:
--   ✅ IDs correspondem - problema está em outro lugar
--   → Verificar se filtro de quota está correto
--
-- Se IDs_MATCH = FALSE:
--   ❌ IDs NÃO correspondem - CAUSA RAIZ ENCONTRADA!
--   → project_owner_id aponta para usuário diferente
--   → Precisa usar client_id ou buscar de outra forma
--
-- Se retornar 0 linhas:
--   ❌ Pacote não existe ou tenant_id diferente
--   → Verificar se pacote está mesmo ativo

-- 🔍 PASSO 5: Verificar TODOS os projetos da Catarina Solar
-- ========================================
-- Para entender padrão de ownership
SELECT
  p.id,
  p.number,
  p.owner_id,
  p.billing_mode,
  p.cliente_pacote_id,
  p.cliente_assinatura_id,
  u.email AS owner_email,
  u.full_name AS owner_name,
  u.role AS owner_role
FROM projects p
LEFT JOIN users u ON u.id = p.owner_id
WHERE p.nome_cliente_final ILIKE '%catarina%'
  OR p.empresa_integradora ILIKE '%catarina%'
ORDER BY p.created_at DESC
LIMIT 10;

-- 🔍 PASSO 6: Verificar se existe campo client_id na tabela projects
-- ========================================
-- (Executar no psql ou interface SQL)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name LIKE '%client%'
ORDER BY ordinal_position;

-- 🔍 PASSO 7: Buscar TODOS os usuários chamados Catarina
-- ========================================
-- Para identificar qual é o ID correto
SELECT
  id,
  email,
  full_name,
  role,
  billing_mode,
  tenant_id,
  created_at
FROM users
WHERE full_name ILIKE '%catarina%'
  OR email ILIKE '%catarina%'
ORDER BY created_at DESC;

-- ========================================
-- 📊 RESUMO DO DIAGNÓSTICO
-- ========================================
--
-- Após executar os scripts acima, você terá:
--
-- 1. ID do projeto (PASSO 1)
-- 2. owner_id do projeto e dados do usuário (PASSO 2)
-- 3. Pacotes disponíveis da Catarina (PASSO 3)
-- 4. COMPARAÇÃO CRÍTICA - IDs_MATCH? (PASSO 4) ⭐ MAIS IMPORTANTE
-- 5. Padrão de ownership de projetos (PASSO 5)
-- 6. Verificação de campo client_id (PASSO 6)
-- 7. Todos os usuários Catarina (PASSO 7)
--
-- 🎯 FOCO NO PASSO 4:
-- Se IDs_MATCH = FALSE, então a causa raiz é confirmada!
--
-- ========================================
