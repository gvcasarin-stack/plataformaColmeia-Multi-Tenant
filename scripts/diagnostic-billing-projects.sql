-- =====================================================
-- DIAGNÓSTICO: Verificar vinculação de projetos com pacotes/assinaturas
-- =====================================================
-- Execute este script para diagnosticar por que os projetos
-- não estão aparecendo vinculados aos pacotes
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR PROJETOS ÓRFÃOS
-- =====================================================

-- 1.1. Projetos de PACOTES sem FK
SELECT
  'PROJETOS ÓRFÃOS DE PACOTE' as tipo,
  COUNT(*) as total
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot IS NOT NULL;

-- 1.2. Projetos de ASSINATURAS sem FK
SELECT
  'PROJETOS ÓRFÃOS DE ASSINATURA' as tipo,
  COUNT(*) as total
FROM projects
WHERE billing_mode = 'assinatura'
  AND cliente_assinatura_id IS NULL
  AND billing_snapshot IS NOT NULL;

-- =====================================================
-- PARTE 2: DETALHES DOS PROJETOS ÓRFÃOS
-- =====================================================

-- 2.1. Detalhes completos de projetos de PACOTE órfãos
SELECT
  p.id,
  p.number,
  p.billing_mode,
  p.cliente_pacote_id,
  p.billing_snapshot->>'pacote_id' as pacote_id_no_snapshot,
  p.billing_snapshot->>'pacote_nome' as pacote_nome,
  p.billing_snapshot->>'projetos_usados_depois' as projetos_usados,
  p.owner_id,
  u.name as owner_name,
  u.company_name as owner_company,
  p.created_at
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
  AND p.billing_snapshot IS NOT NULL
ORDER BY p.created_at DESC;

-- 2.2. Detalhes completos de projetos de ASSINATURA órfãos
SELECT
  p.id,
  p.number,
  p.billing_mode,
  p.cliente_assinatura_id,
  p.billing_snapshot->>'assinatura_id' as assinatura_id_no_snapshot,
  p.billing_snapshot->>'plano_nome' as plano_nome,
  p.billing_snapshot->>'projetos_usados_depois' as projetos_usados,
  p.owner_id,
  u.name as owner_name,
  u.company_name as owner_company,
  p.created_at
FROM projects p
LEFT JOIN users u ON p.owner_id = u.id
WHERE p.billing_mode = 'assinatura'
  AND p.cliente_assinatura_id IS NULL
  AND p.billing_snapshot IS NOT NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- PARTE 3: VERIFICAR PACOTES ATIVOS E SEUS PROJETOS
-- =====================================================

-- 3.1. Listar todos os pacotes ativos e quantos projetos estão vinculados
SELECT
  cp.id as pacote_id,
  cp.user_id,
  u.name as cliente_nome,
  u.company_name as cliente_empresa,
  pd.nome as pacote_nome,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.status,
  cp.data_ativacao,
  cp.data_expiracao,
  -- Contar projetos REALMENTE vinculados via FK
  (SELECT COUNT(*)
   FROM projects p
   WHERE p.cliente_pacote_id = cp.id) as projetos_vinculados_fk,
  -- Contar projetos que DEVERIAM estar vinculados (pelo billing_snapshot)
  (SELECT COUNT(*)
   FROM projects p
   WHERE p.billing_mode = 'pacote'
     AND p.billing_snapshot->>'pacote_id' = cp.id::text) as projetos_no_snapshot
FROM cliente_pacotes cp
LEFT JOIN users u ON cp.user_id = u.id
LEFT JOIN pacotes_definicoes pd ON cp.pacote_id = pd.id
WHERE cp.status = 'ativo'
ORDER BY cp.data_ativacao DESC;

-- =====================================================
-- PARTE 4: VERIFICAR ASSINATURAS ATIVAS E SEUS PROJETOS
-- =====================================================

-- 4.1. Listar todas as assinaturas ativas e quantos projetos estão vinculados
SELECT
  ca.id as assinatura_id,
  ca.user_id,
  u.name as cliente_nome,
  u.company_name as cliente_empresa,
  pa.nome as plano_nome,
  ca.projetos_mensais,
  ca.projetos_usados_mes_atual,
  ca.status,
  ca.data_inicio,
  ca.proximo_reset,
  -- Contar projetos REALMENTE vinculados via FK
  (SELECT COUNT(*)
   FROM projects p
   WHERE p.cliente_assinatura_id = ca.id) as projetos_vinculados_fk,
  -- Contar projetos que DEVERIAM estar vinculados (pelo billing_snapshot)
  (SELECT COUNT(*)
   FROM projects p
   WHERE p.billing_mode = 'assinatura'
     AND p.billing_snapshot->>'assinatura_id' = ca.id::text) as projetos_no_snapshot
FROM cliente_assinaturas ca
LEFT JOIN users u ON ca.user_id = u.id
LEFT JOIN planos_assinatura pa ON ca.plano_id = pa.id
WHERE ca.status IN ('ativa', 'pendente_renovacao')
ORDER BY ca.data_inicio DESC;

-- =====================================================
-- PARTE 5: VERIFICAR INTEGRIDADE DE DADOS
-- =====================================================

-- 5.1. Verificar se FK aponta para pacote inexistente
SELECT
  p.id as project_id,
  p.number,
  p.cliente_pacote_id,
  'FK INVÁLIDA - PACOTE NÃO EXISTE' as problema
FROM projects p
WHERE p.cliente_pacote_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cliente_pacotes cp WHERE cp.id = p.cliente_pacote_id
  );

-- 5.2. Verificar se FK aponta para assinatura inexistente
SELECT
  p.id as project_id,
  p.number,
  p.cliente_assinatura_id,
  'FK INVÁLIDA - ASSINATURA NÃO EXISTE' as problema
FROM projects p
WHERE p.cliente_assinatura_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM cliente_assinaturas ca WHERE ca.id = p.cliente_assinatura_id
  );

-- =====================================================
-- PARTE 6: RESUMO EXECUTIVO
-- =====================================================

DO $$
DECLARE
  orfaos_pacotes INTEGER;
  orfaos_assinaturas INTEGER;
  pacotes_ativos INTEGER;
  assinaturas_ativas INTEGER;
BEGIN
  -- Contar órfãos
  SELECT COUNT(*) INTO orfaos_pacotes
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NULL
    AND billing_snapshot IS NOT NULL;

  SELECT COUNT(*) INTO orfaos_assinaturas
  FROM projects
  WHERE billing_mode = 'assinatura'
    AND cliente_assinatura_id IS NULL
    AND billing_snapshot IS NOT NULL;

  -- Contar ativos
  SELECT COUNT(*) INTO pacotes_ativos
  FROM cliente_pacotes
  WHERE status = 'ativo';

  SELECT COUNT(*) INTO assinaturas_ativas
  FROM cliente_assinaturas
  WHERE status IN ('ativa', 'pendente_renovacao');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DO DIAGNÓSTICO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projetos órfãos de PACOTES: %', orfaos_pacotes;
  RAISE NOTICE 'Projetos órfãos de ASSINATURAS: %', orfaos_assinaturas;
  RAISE NOTICE 'Pacotes ativos: %', pacotes_ativos;
  RAISE NOTICE 'Assinaturas ativas: %', assinaturas_ativas;
  RAISE NOTICE '========================================';

  IF orfaos_pacotes > 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Execute fix-billing-fks-on-existing-projects.sql';
  ELSE
    RAISE NOTICE '✅ Todos os projetos de pacotes estão vinculados';
  END IF;

  IF orfaos_assinaturas > 0 THEN
    RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Execute fix-billing-fks-on-existing-projects.sql';
  ELSE
    RAISE NOTICE '✅ Todos os projetos de assinaturas estão vinculados';
  END IF;

  RAISE NOTICE '========================================';
END $$;
