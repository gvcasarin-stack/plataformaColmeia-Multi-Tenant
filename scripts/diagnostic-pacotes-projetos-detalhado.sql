-- =====================================================
-- DIAGNÓSTICO DETALHADO: Por que pacotes mostram 0 projetos?
-- =====================================================
-- OBJETIVO: Descobrir por que a interface mostra "0 de 5"
-- quando deveria mostrar "2 de 5"
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR PACOTES E SEUS CAMPOS
-- =====================================================

-- 1.1. Ver TODOS os pacotes e seus contadores
SELECT
  'PACOTES - VISÃO GERAL' as diagnostico,
  cp.id as pacote_id,
  cp.tenant_id,
  u.company_name as cliente,
  pd.nome as pacote_nome,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.status,
  cp.created_at
FROM cliente_pacotes cp
LEFT JOIN users u ON cp.user_id = u.id
LEFT JOIN pacotes_definicoes pd ON cp.pacote_id = pd.id
ORDER BY cp.created_at DESC;

-- =====================================================
-- PARTE 2: VERIFICAR PROJETOS E SEUS FKs
-- =====================================================

-- 2.1. Ver TODOS os projetos e seus FKs de billing
SELECT
  'PROJETOS - VISÃO GERAL' as diagnostico,
  p.id as project_id,
  p.number,
  p.tenant_id,
  p.billing_mode,
  p.cliente_pacote_id,
  p.cliente_assinatura_id,
  p.billing_snapshot->>'pacote_id' as pacote_id_no_snapshot,
  p.billing_snapshot->>'assinatura_id' as assinatura_id_no_snapshot,
  p.created_at
FROM projects p
WHERE p.billing_mode IN ('pacote', 'assinatura')
ORDER BY p.created_at DESC
LIMIT 20;

-- =====================================================
-- PARTE 3: VERIFICAR MATCH ENTRE PACOTES E PROJETOS
-- =====================================================

-- 3.1. Para cada pacote, contar quantos projetos têm FK vinculado
SELECT
  'CONTAGEM POR PACOTE (VIA FK)' as diagnostico,
  cp.id as pacote_id,
  u.company_name as cliente,
  pd.nome as pacote_nome,
  cp.tenant_id as pacote_tenant_id,
  cp.projetos_inclusos,
  cp.projetos_usados as contador_na_tabela,
  COUNT(p.id) as projetos_com_fk_vinculado,
  cp.status as pacote_status
FROM cliente_pacotes cp
LEFT JOIN users u ON cp.user_id = u.id
LEFT JOIN pacotes_definicoes pd ON cp.pacote_id = pd.id
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
GROUP BY cp.id, u.company_name, pd.nome, cp.tenant_id, cp.projetos_inclusos, cp.projetos_usados, cp.status
ORDER BY cp.created_at DESC;

-- 3.2. Listar os projetos vinculados a cada pacote (DETALHADO)
SELECT
  'PROJETOS POR PACOTE (DETALHADO)' as diagnostico,
  cp.id as pacote_id,
  u.company_name as cliente,
  pd.nome as pacote_nome,
  p.id as project_id,
  p.number as project_number,
  p.tenant_id as project_tenant_id,
  cp.tenant_id as pacote_tenant_id,
  CASE
    WHEN p.tenant_id = cp.tenant_id THEN '✅ Match'
    ELSE '❌ Diferente!'
  END as tenant_match
FROM cliente_pacotes cp
LEFT JOIN users u ON cp.user_id = u.id
LEFT JOIN pacotes_definicoes pd ON cp.pacote_id = pd.id
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
WHERE cp.status = 'ativo'
ORDER BY cp.created_at DESC, p.created_at DESC;

-- =====================================================
-- PARTE 4: VERIFICAR PROJETOS ÓRFÃOS
-- =====================================================

-- 4.1. Projetos de pacotes SEM FK (órfãos)
SELECT
  'PROJETOS ÓRFÃOS DE PACOTE' as diagnostico,
  COUNT(*) as total_orfaos
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot IS NOT NULL;

-- 4.2. Detalhes dos projetos órfãos
SELECT
  'DETALHES DE ÓRFÃOS' as diagnostico,
  p.id,
  p.number,
  p.tenant_id,
  p.billing_mode,
  p.cliente_pacote_id,
  p.billing_snapshot->>'pacote_id' as pacote_id_no_snapshot,
  p.billing_snapshot->>'pacote_nome' as pacote_nome,
  p.created_at
FROM projects p
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
  AND p.billing_snapshot IS NOT NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- PARTE 5: VERIFICAR ISOLAMENTO DE TENANT
-- =====================================================

-- 5.1. Verificar se há pacotes/projetos de tenants diferentes
SELECT
  'VERIFICAÇÃO DE TENANT' as diagnostico,
  DISTINCT p.tenant_id as project_tenant,
  cp.tenant_id as pacote_tenant,
  COUNT(*) as quantidade
FROM projects p
JOIN cliente_pacotes cp ON p.cliente_pacote_id = cp.id
WHERE p.billing_mode = 'pacote'
GROUP BY p.tenant_id, cp.tenant_id;

-- =====================================================
-- PARTE 6: SIMULAR QUERY DA API
-- =====================================================

-- 6.1. Simular exatamente o que a API faz
-- Assumindo tenant_id específico (substitua pelo seu)
DO $$
DECLARE
  test_tenant_id UUID;
  pacote_record RECORD;
  project_count INTEGER;
BEGIN
  -- Pegar o primeiro tenant_id que tem pacote
  SELECT tenant_id INTO test_tenant_id
  FROM cliente_pacotes
  WHERE status = 'ativo'
  LIMIT 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIMULAÇÃO DA QUERY DA API';
  RAISE NOTICE 'Tenant ID: %', test_tenant_id;
  RAISE NOTICE '========================================';

  -- Buscar pacotes deste tenant
  FOR pacote_record IN
    SELECT id, tenant_id
    FROM cliente_pacotes
    WHERE tenant_id = test_tenant_id
      AND status = 'ativo'
  LOOP
    -- Contar projetos vinculados (como a API faz)
    SELECT COUNT(*) INTO project_count
    FROM projects
    WHERE cliente_pacote_id = pacote_record.id
      AND tenant_id = test_tenant_id;

    RAISE NOTICE 'Pacote ID: % | Projetos encontrados: %', pacote_record.id, project_count;
  END LOOP;

  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- PARTE 7: VERIFICAR SOFT DELETE
-- =====================================================

-- 7.1. Verificar se projetos foram soft-deleted
SELECT
  'PROJETOS SOFT-DELETED' as diagnostico,
  p.id,
  p.number,
  p.cliente_pacote_id,
  p.deleted_at,
  CASE
    WHEN p.deleted_at IS NOT NULL THEN '🗑️ DELETADO'
    ELSE '✅ Ativo'
  END as status_delete
FROM projects p
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NOT NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- PARTE 8: RELATÓRIO FINAL
-- =====================================================

DO $$
DECLARE
  total_pacotes INTEGER;
  total_projetos_billing_pacote INTEGER;
  total_projetos_com_fk INTEGER;
  total_projetos_orfaos INTEGER;
BEGIN
  -- Contar pacotes
  SELECT COUNT(*) INTO total_pacotes
  FROM cliente_pacotes
  WHERE status = 'ativo';

  -- Contar projetos com billing_mode = pacote
  SELECT COUNT(*) INTO total_projetos_billing_pacote
  FROM projects
  WHERE billing_mode = 'pacote';

  -- Contar projetos COM FK de pacote
  SELECT COUNT(*) INTO total_projetos_com_fk
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NOT NULL;

  -- Contar projetos órfãos
  SELECT COUNT(*) INTO total_projetos_orfaos
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NULL
    AND billing_snapshot IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RELATÓRIO FINAL DO DIAGNÓSTICO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de pacotes ativos: %', total_pacotes;
  RAISE NOTICE 'Total de projetos com billing_mode=pacote: %', total_projetos_billing_pacote;
  RAISE NOTICE 'Total de projetos COM FK vinculado: %', total_projetos_com_fk;
  RAISE NOTICE 'Total de projetos ÓRFÃOS: %', total_projetos_orfaos;
  RAISE NOTICE '========================================';

  IF total_projetos_orfaos > 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Há % projetos órfãos!', total_projetos_orfaos;
    RAISE NOTICE '   AÇÃO: Execute fix-billing-fks-on-existing-projects.sql';
  ELSIF total_projetos_com_fk = 0 THEN
    RAISE NOTICE '⚠️ PROBLEMA: Nenhum projeto está vinculado via FK!';
    RAISE NOTICE '   AÇÃO: Verifique se o SQL foi executado corretamente';
  ELSE
    RAISE NOTICE '✅ FKs estão configurados corretamente';
    RAISE NOTICE '   PROBLEMA PODE SER: Na query da API ou no frontend';
  END IF;

  RAISE NOTICE '========================================';
END $$;
