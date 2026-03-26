-- ========================================
-- CRIAR ASSINATURA AUTOMÁTICA
-- Execute este bloco INTEIRO de uma vez
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_assinatura_id UUID;
BEGIN
  -- 1. Buscar primeiro cliente disponível
  SELECT id INTO v_user_id
  FROM users
  WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND role = 'cliente'
  LIMIT 1;

  -- 2. Verificar se encontrou cliente
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum cliente encontrado no tenant';
  END IF;

  RAISE NOTICE 'Cliente selecionado: %', v_user_id;

  -- 3. Criar assinatura
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
    v_user_id,
    'ead0ae0b-7943-431c-892d-74fbc17769d2',
    '061ff77b-8b3a-4732-9158-a574c1f1690a',
    'ativa',
    0,
    3,
    NOW(),
    1,
    NOW(),
    (NOW() + INTERVAL '1 month')::timestamp
  )
  RETURNING id INTO v_assinatura_id;

  RAISE NOTICE '✅ Assinatura criada com sucesso! ID: %', v_assinatura_id;
END $$;

-- Verificar assinatura criada
SELECT 
  ca.id,
  ca.status,
  u.name as cliente,
  u.email,
  pa.nome as plano,
  CONCAT(ca.projetos_usados_mes_atual, '/', ca.projetos_mensais) as quota,
  ca.proximo_reset
FROM cliente_assinaturas ca
JOIN users u ON u.id = ca.user_id
JOIN planos_assinatura pa ON pa.id = ca.plano_id
WHERE ca.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND ca.status = 'ativa';

