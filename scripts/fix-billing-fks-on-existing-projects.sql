-- =====================================================
-- Migration: Corrigir FKs de Billing em Projetos Existentes
-- =====================================================
-- OBJETIVO: Vincular projetos órfãos aos seus pacotes/assinaturas
-- usando os dados do billing_snapshot
--
-- SEVERIDADE: MÉDIA - Corrige dados existentes
-- =====================================================

-- =====================================================
-- PARTE 1: DIAGNÓSTICO - IDENTIFICAR PROJETOS ÓRFÃOS
-- =====================================================

-- 1.1. Verificar projetos de PACOTES sem FK
DO $$
DECLARE
  orfaos_pacotes INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_pacotes
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NULL
    AND billing_snapshot IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO - PROJETOS ÓRFÃOS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projetos de PACOTES sem FK: %', orfaos_pacotes;
END $$;

-- 1.2. Verificar projetos de ASSINATURAS sem FK
DO $$
DECLARE
  orfaos_assinaturas INTEGER;
BEGIN
  SELECT COUNT(*) INTO orfaos_assinaturas
  FROM projects
  WHERE billing_mode = 'assinatura'
    AND cliente_assinatura_id IS NULL
    AND billing_snapshot IS NOT NULL;

  RAISE NOTICE 'Projetos de ASSINATURAS sem FK: %', orfaos_assinaturas;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- PARTE 2: MOSTRAR DETALHES DOS PROJETOS ÓRFÃOS (PREVIEW)
-- =====================================================

-- 2.1. Preview de projetos de PACOTES que serão corrigidos
SELECT
  'PACOTE' as tipo,
  p.id as project_id,
  p.number as project_number,
  p.billing_snapshot->>'pacote_id' as pacote_id_snapshot,
  p.billing_snapshot->>'pacote_nome' as pacote_nome,
  p.billing_snapshot->>'projetos_usados_depois' as projetos_usados,
  p.created_at
FROM projects p
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
  AND p.billing_snapshot IS NOT NULL
  AND p.billing_snapshot->>'pacote_id' IS NOT NULL
ORDER BY p.created_at DESC;

-- 2.2. Preview de projetos de ASSINATURAS que serão corrigidos
SELECT
  'ASSINATURA' as tipo,
  p.id as project_id,
  p.number as project_number,
  p.billing_snapshot->>'assinatura_id' as assinatura_id_snapshot,
  p.billing_snapshot->>'plano_nome' as plano_nome,
  p.billing_snapshot->>'projetos_usados_depois' as projetos_usados,
  p.created_at
FROM projects p
WHERE p.billing_mode = 'assinatura'
  AND p.cliente_assinatura_id IS NULL
  AND p.billing_snapshot IS NOT NULL
  AND p.billing_snapshot->>'assinatura_id' IS NOT NULL
ORDER BY p.created_at DESC;

-- =====================================================
-- PARTE 3: CORREÇÃO - VINCULAR PROJETOS AOS PACOTES
-- =====================================================

-- 3.1. Atualizar cliente_pacote_id baseado no billing_snapshot
UPDATE projects
SET
  cliente_pacote_id = (billing_snapshot->>'pacote_id')::uuid,
  updated_at = NOW()
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot IS NOT NULL
  AND billing_snapshot->>'pacote_id' IS NOT NULL;

-- 3.2. Verificar quantos foram atualizados
DO $$
DECLARE
  atualizados INTEGER;
BEGIN
  SELECT COUNT(*) INTO atualizados
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NOT NULL
    AND billing_snapshot->>'pacote_id' IS NOT NULL
    AND cliente_pacote_id::text = billing_snapshot->>'pacote_id';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO - PACOTES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projetos vinculados a PACOTES: %', atualizados;
END $$;

-- =====================================================
-- PARTE 4: CORREÇÃO - VINCULAR PROJETOS ÀS ASSINATURAS
-- =====================================================

-- 4.1. Atualizar cliente_assinatura_id baseado no billing_snapshot
UPDATE projects
SET
  cliente_assinatura_id = (billing_snapshot->>'assinatura_id')::uuid,
  updated_at = NOW()
WHERE billing_mode = 'assinatura'
  AND cliente_assinatura_id IS NULL
  AND billing_snapshot IS NOT NULL
  AND billing_snapshot->>'assinatura_id' IS NOT NULL;

-- 4.2. Verificar quantos foram atualizados
DO $$
DECLARE
  atualizados INTEGER;
BEGIN
  SELECT COUNT(*) INTO atualizados
  FROM projects
  WHERE billing_mode = 'assinatura'
    AND cliente_assinatura_id IS NOT NULL
    AND billing_snapshot->>'assinatura_id' IS NOT NULL
    AND cliente_assinatura_id::text = billing_snapshot->>'assinatura_id';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORREÇÃO - ASSINATURAS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projetos vinculados a ASSINATURAS: %', atualizados;
END $$;

-- =====================================================
-- PARTE 5: VALIDAÇÃO FINAL
-- =====================================================

-- 5.1. Verificar se ainda há projetos órfãos
DO $$
DECLARE
  ainda_orfaos_pacotes INTEGER;
  ainda_orfaos_assinaturas INTEGER;
BEGIN
  SELECT COUNT(*) INTO ainda_orfaos_pacotes
  FROM projects
  WHERE billing_mode = 'pacote'
    AND cliente_pacote_id IS NULL
    AND billing_snapshot IS NOT NULL;

  SELECT COUNT(*) INTO ainda_orfaos_assinaturas
  FROM projects
  WHERE billing_mode = 'assinatura'
    AND cliente_assinatura_id IS NULL
    AND billing_snapshot IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDAÇÃO FINAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Projetos de PACOTES ainda órfãos: %', ainda_orfaos_pacotes;
  RAISE NOTICE 'Projetos de ASSINATURAS ainda órfãos: %', ainda_orfaos_assinaturas;

  IF ainda_orfaos_pacotes = 0 AND ainda_orfaos_assinaturas = 0 THEN
    RAISE NOTICE '✅ SUCESSO: Todos os projetos foram vinculados!';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO: Ainda existem projetos órfãos. Verifique manualmente.';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- 5.2. Verificar integridade das FKs
SELECT
  p.billing_mode,
  COUNT(*) as total_projetos,
  COUNT(p.cliente_pacote_id) as com_fk_pacote,
  COUNT(p.cliente_assinatura_id) as com_fk_assinatura,
  COUNT(*) FILTER (WHERE p.cliente_pacote_id IS NULL AND p.billing_mode = 'pacote') as pacotes_sem_fk,
  COUNT(*) FILTER (WHERE p.cliente_assinatura_id IS NULL AND p.billing_mode = 'assinatura') as assinaturas_sem_fk
FROM projects p
WHERE p.billing_mode IN ('pacote', 'assinatura')
GROUP BY p.billing_mode;

-- =====================================================
-- PARTE 6: RELATÓRIO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ações realizadas:';
  RAISE NOTICE '- Projetos de pacotes vinculados via cliente_pacote_id';
  RAISE NOTICE '- Projetos de assinaturas vinculados via cliente_assinatura_id';
  RAISE NOTICE '- Campos updated_at atualizados';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '- Fazer deploy do código corrigido';
  RAISE NOTICE '- Testar criação de novos projetos';
  RAISE NOTICE '- Verificar se projetos aparecem no financeiro';
  RAISE NOTICE '========================================';
END $$;
