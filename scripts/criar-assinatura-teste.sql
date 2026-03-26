-- ========================================
-- CRIAR ASSINATURA DE TESTE - Colmeia Solar
-- ========================================
-- Este script cria uma assinatura ativa para testar o modal de conversão

-- PASSO 1: Listar clientes disponíveis no seu tenant
SELECT 
  id as user_id,
  name as cliente_nome,
  email,
  role,
  billing_mode
FROM users
WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND role = 'cliente'
ORDER BY created_at DESC
LIMIT 10;

-- 👆 ESCOLHA UM user_id da lista acima e copie para usar abaixo

-- ========================================
-- PASSO 2: CRIAR A ASSINATURA
-- ========================================
-- ⚠️ SUBSTITUA o user_id abaixo pelo user_id escolhido no PASSO 1

INSERT INTO cliente_assinaturas (
  id,
  user_id,
  plano_id,
  tenant_id,
  status,
  projetos_usados_mes_atual,
  projetos_mensais,
  data_inicio,
  dia_renovacao,
  ultimo_reset,
  proximo_reset,
  created_at,
  updated_at
)
VALUES (
  uuid_generate_v4(),
  'COLE-O-USER-ID-AQUI', -- ⚠️ SUBSTITUA PELO USER_ID DO CLIENTE
  'ead0ae0b-7943-431c-892d-74fbc17769d2', -- Plano Mensal 3 Projetos
  '061ff77b-8b3a-4732-9158-a574c1f1690a', -- Colmeia Solar tenant_id
  'ativa',
  0, -- 0 projetos usados
  3, -- 3 projetos mensais (copiado do plano)
  NOW(),
  1, -- Dia 1 de renovação
  NOW(),
  (NOW() + INTERVAL '1 month')::timestamp,
  NOW(),
  NOW()
)
RETURNING 
  id,
  user_id,
  status,
  projetos_usados_mes_atual,
  projetos_mensais;

-- ========================================
-- PASSO 3: VERIFICAR SE FOI CRIADA
-- ========================================
SELECT 
  ca.id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.projetos_mensais,
  u.name as cliente_nome,
  pa.nome as plano_nome,
  pa.quantidade_mensal
FROM cliente_assinaturas ca
LEFT JOIN users u ON u.id = ca.user_id
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND ca.status = 'ativa';

-- ✅ Deve retornar 1 linha com a assinatura criada

-- ========================================
-- OBSERVAÇÕES:
-- ========================================
-- Após criar a assinatura, recarregue a página do modal
-- e a assinatura deve aparecer em "Assinaturas Disponíveis"

