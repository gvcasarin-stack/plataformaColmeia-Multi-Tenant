-- ========================================
-- LISTAR TODAS AS ASSINATURAS ATIVAS (TODOS OS TENANTS)
-- ========================================

SELECT 
  ca.id as assinatura_id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.projetos_mensais,
  ca.tenant_id,
  -- Dados do cliente
  u.id as cliente_id,
  u.name as cliente_nome,
  u.email as cliente_email,
  -- Dados do plano
  pa.id as plano_id,
  pa.nome as plano_nome,
  pa.quantidade_mensal,
  pa.valor_mensal,
  -- Dados da empresa (tenant)
  o.id as empresa_id,
  o.name as empresa_nome,
  o.slug as empresa_slug
FROM cliente_assinaturas ca
LEFT JOIN users u ON u.id = ca.user_id
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
LEFT JOIN organizations o ON o.id = ca.tenant_id
WHERE ca.status = 'ativa'
ORDER BY o.name, ca.created_at DESC;

