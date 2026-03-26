-- ========================================
-- DIAGNÓSTICO: Por que assinatura não aparece no Financeiro
-- ========================================

-- 1. Verificar a assinatura criada (estrutura completa)
SELECT 
  ca.*,
  pa.nome as plano_nome,
  pa.valor_mensal as plano_valor_mensal,
  u.name as cliente_nome
FROM cliente_assinaturas ca
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
LEFT JOIN users u ON u.id = ca.user_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND ca.status = 'ativa'
ORDER BY ca.created_at DESC
LIMIT 1;

-- 2. Verificar se o campo valor_mensal existe na tabela cliente_assinaturas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cliente_assinaturas'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Simular exatamente a query que a API faz
SELECT 
  ca.id,
  ca.user_id,
  ca.plano_id,
  ca.tenant_id,
  ca.data_inicio,
  ca.dia_renovacao,
  ca.projetos_mensais,
  ca.projetos_usados_mes_atual,
  ca.ultimo_reset,
  ca.proximo_reset,
  ca.status,
  ca.payment_status,
  ca.data_pagamento_parcela1,
  ca.data_pagamento_integral,
  ca.data_cancelamento,
  ca.created_at,
  -- Verificar se os JOINs funcionam
  u.id as user_exists,
  u.name as user_name,
  pa.id as plano_exists,
  pa.nome as plano_nome,
  pa.quantidade_mensal,
  pa.valor_mensal
FROM cliente_assinaturas ca
LEFT JOIN users u ON u.id = ca.user_id
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY ca.data_inicio DESC;

-- 4. Verificar campos que o frontend espera
SELECT 
  ca.id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.projetos_mensais,
  -- ⚠️ CAMPO CRÍTICO: valor_mensal (pode não existir em cliente_assinaturas)
  ca.valor_mensal as valor_mensal_direto,
  -- Valor do plano (correto)
  pa.valor_mensal as valor_mensal_do_plano,
  -- Payment status
  ca.payment_status,
  -- Verificação
  CASE 
    WHEN ca.valor_mensal IS NOT NULL THEN '✅ tem valor_mensal direto'
    WHEN pa.valor_mensal IS NOT NULL THEN '⚠️ só tem no plano (precisa buscar via JOIN)'
    ELSE '❌ não tem valor_mensal em nenhum lugar'
  END as status_valor
FROM cliente_assinaturas ca
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND ca.status = 'ativa';

-- 5. Verificar contagem para MRR
SELECT 
  COUNT(*) as total_assinaturas,
  COUNT(CASE WHEN ca.status = 'ativa' THEN 1 END) as ativas,
  SUM(CASE WHEN ca.status = 'ativa' THEN COALESCE(ca.valor_mensal, pa.valor_mensal, 0) ELSE 0 END) as mrr_total
FROM cliente_assinaturas ca
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

