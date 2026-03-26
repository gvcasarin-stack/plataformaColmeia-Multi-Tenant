-- ========================================
-- CRIAR ASSINATURA RÁPIDA - PASSO A PASSO
-- ========================================

-- PASSO 1: Listar clientes do seu tenant
SELECT 
  id,
  name,
  email
FROM users
WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND role = 'cliente'
LIMIT 10;

-- ⬆️ COPIE um ID da lista acima

-- ========================================
-- PASSO 2: COLE O ID ABAIXO E EXECUTE
-- ========================================

-- Substitua 'COLE-O-USER-ID-AQUI' pelo ID copiado:
INSERT INTO cliente_assinaturas (
  user_id,
  plano_id,
  tenant_id,
  status,
  projetos_usados_mes_atual,
  projetos_mensais,
  data_inicio,
  dia_renovacao,
  ultimo_reset,
  proximo_reset
) VALUES (
  'COLE-O-USER-ID-AQUI',  -- ⚠️ SUBSTITUA AQUI
  'ead0ae0b-7943-431c-892d-74fbc17769d2',
  '061ff77b-8b3a-4732-9158-a574c1f1690a',
  'ativa',
  0,
  3,
  NOW(),
  1,
  NOW(),
  (NOW() + INTERVAL '1 month')::timestamp
);

-- ========================================
-- PASSO 3: CONFIRME QUE FOI CRIADA
-- ========================================
SELECT 
  ca.id,
  ca.status,
  u.name as cliente,
  pa.nome as plano,
  CONCAT(ca.projetos_usados_mes_atual, '/', ca.projetos_mensais) as quota
FROM cliente_assinaturas ca
JOIN users u ON u.id = ca.user_id
JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

