-- ========================================
-- Script: Corrigir FKs faltantes em projetos existentes
-- Data: 27/11/2025
-- Descrição: Preencher cliente_pacote_id e cliente_assinatura_id com base no billing_snapshot
-- ========================================
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- ========================================

-- ==========================================
-- ETAPA 1: VERIFICAR ESTADO ANTES DA CORREÇÃO
-- ==========================================
SELECT
  '📊 ANTES DA CORREÇÃO' as titulo,
  '' as valor1,
  '' as valor2;

SELECT
  'Projetos PACOTE sem FK' as metrica,
  COUNT(*)::text as quantidade,
  'Serão corrigidos' as status
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot->>'pacote_id' IS NOT NULL
  AND billing_snapshot->>'pacote_id' != 'null'
  AND billing_snapshot->>'fallback_reason' IS NULL;

-- Listar os projetos que serão corrigidos
SELECT
  '🔧 Projetos que serão corrigidos:' as titulo,
  '' as projeto,
  '' as pacote;

SELECT
  'Projeto' as titulo,
  p.number as projeto,
  p.billing_snapshot->>'pacote_nome' as pacote
FROM projects p
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
  AND p.billing_snapshot->>'pacote_id' IS NOT NULL
  AND p.billing_snapshot->>'fallback_reason' IS NULL
ORDER BY p.created_at DESC;


-- ==========================================
-- ETAPA 2: CORRIGIR PROJETOS COM MODO PACOTE
-- ==========================================

-- Atualizar projetos que têm billing_mode = 'pacote'
-- E têm pacote_id no snapshot mas FK está NULL
UPDATE projects
SET
  cliente_pacote_id = (billing_snapshot->>'pacote_id')::uuid,
  updated_at = NOW()
WHERE billing_mode = 'pacote'
  AND billing_snapshot->>'pacote_id' IS NOT NULL
  AND billing_snapshot->>'pacote_id' != 'null'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot->>'fallback_reason' IS NULL;  -- Não corrigir projetos que foram fallback intencional

-- Log do resultado
SELECT
  'Projetos PACOTE corrigidos' as resultado,
  COUNT(*)::text as quantidade
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NOT NULL
  AND billing_snapshot->>'pacote_id' = cliente_pacote_id::text;


-- ==========================================
-- ETAPA 3: CORRIGIR PROJETOS COM MODO ASSINATURA
-- ==========================================

-- Atualizar projetos que têm billing_mode = 'assinatura'
-- E têm assinatura_id no snapshot mas FK está NULL
UPDATE projects
SET
  cliente_assinatura_id = (billing_snapshot->>'assinatura_id')::uuid,
  updated_at = NOW()
WHERE billing_mode = 'assinatura'
  AND billing_snapshot->>'assinatura_id' IS NOT NULL
  AND billing_snapshot->>'assinatura_id' != 'null'
  AND cliente_assinatura_id IS NULL
  AND billing_snapshot->>'fallback_reason' IS NULL;

-- Log do resultado
SELECT
  'Projetos ASSINATURA corrigidos' as resultado,
  COUNT(*)::text as quantidade
FROM projects
WHERE billing_mode = 'assinatura'
  AND cliente_assinatura_id IS NOT NULL
  AND billing_snapshot->>'assinatura_id' = cliente_assinatura_id::text;


-- ==========================================
-- ETAPA 4: VERIFICAR ESTADO DEPOIS DA CORREÇÃO
-- ==========================================
SELECT
  '📊 DEPOIS DA CORREÇÃO' as titulo,
  '' as valor1,
  '' as valor2;

-- Verificar quantos ainda faltam FK
SELECT
  billing_mode,
  COUNT(*) as total_projetos,
  COUNT(CASE WHEN billing_mode = 'pacote' AND cliente_pacote_id IS NOT NULL THEN 1 END) as com_fk_pacote,
  COUNT(CASE WHEN billing_mode = 'assinatura' AND cliente_assinatura_id IS NOT NULL THEN 1 END) as com_fk_assinatura,
  COUNT(CASE
    WHEN billing_mode = 'pacote' AND cliente_pacote_id IS NULL
    OR billing_mode = 'assinatura' AND cliente_assinatura_id IS NULL
    THEN 1
  END) as ainda_sem_fk
FROM projects
WHERE billing_mode IN ('pacote', 'assinatura')
GROUP BY billing_mode;


-- ==========================================
-- ETAPA 5: VALIDAR INTEGRIDADE (CASO CATARINA SOLAR)
-- ==========================================
SELECT
  '🔍 VALIDAÇÃO: Catarina Solar - Pacote Ouro' as titulo,
  '' as valor1,
  '' as valor2;

-- Buscar pacote da Catarina Solar
WITH catarina_pacote AS (
  SELECT cp.id
  FROM cliente_pacotes cp
  LEFT JOIN users u ON u.id = cp.user_id
  WHERE (u.company_name ILIKE '%Catarina Solar%' OR u.name ILIKE '%Catarina%')
    AND cp.projetos_usados > 0
  ORDER BY cp.data_ativacao DESC
  LIMIT 1
)
SELECT
  cp.id as pacote_id,
  u.company_name as cliente,
  pd.nome as pacote_nome,
  cp.projetos_usados as contador,
  COUNT(p.id) as projetos_vinculados,
  CASE
    WHEN cp.projetos_usados = COUNT(p.id) THEN '✅ CORRIGIDO!'
    WHEN cp.projetos_usados > COUNT(p.id) THEN '🔴 AINDA COM PROBLEMA'
    ELSE '⚠️ VERIFICAR'
  END as status
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
WHERE cp.id = (SELECT id FROM catarina_pacote)
GROUP BY cp.id, u.company_name, pd.nome, cp.projetos_usados;

-- Listar todos os projetos agora vinculados
SELECT
  '📋 Projetos vinculados ao pacote Catarina Solar:' as titulo,
  '' as projeto,
  '' as cliente;

WITH catarina_pacote AS (
  SELECT cp.id
  FROM cliente_pacotes cp
  LEFT JOIN users u ON u.id = cp.user_id
  WHERE (u.company_name ILIKE '%Catarina Solar%' OR u.name ILIKE '%Catarina%')
    AND cp.projetos_usados > 0
  ORDER BY cp.data_ativacao DESC
  LIMIT 1
)
SELECT
  ROW_NUMBER() OVER (ORDER BY p.created_at ASC)::text as numero,
  p.number as projeto,
  p.nome_cliente_final as cliente_final,
  p.created_at::date::text as data_criacao,
  CASE
    WHEN p.cliente_pacote_id IS NOT NULL THEN '✅ Vinculado'
    ELSE '❌ Sem FK'
  END as status_fk
FROM projects p
WHERE p.cliente_pacote_id = (SELECT id FROM catarina_pacote)
ORDER BY p.created_at ASC;


-- ==========================================
-- ETAPA 6: VERIFICAR CONSTRAINT DE EXCLUSIVIDADE
-- ==========================================
SELECT
  '🔒 VERIFICAÇÃO: Constraint de Exclusividade' as titulo,
  '' as valor;

SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK - Nenhum projeto com ambas as FKs'
    ELSE '❌ ERRO - ' || COUNT(*)::text || ' projetos com ambas as FKs!'
  END as resultado,
  COUNT(*) as quantidade_erros
FROM projects
WHERE cliente_pacote_id IS NOT NULL
  AND cliente_assinatura_id IS NOT NULL;


-- ==========================================
-- RESUMO FINAL
-- ==========================================
SELECT
  '📈 RESUMO DA CORREÇÃO' as titulo,
  '' as antes,
  '' as depois,
  '' as status;

WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE billing_mode = 'pacote') as total_pacotes,
    COUNT(*) FILTER (WHERE billing_mode = 'pacote' AND cliente_pacote_id IS NOT NULL) as pacotes_com_fk,
    COUNT(*) FILTER (WHERE billing_mode = 'assinatura') as total_assinaturas,
    COUNT(*) FILTER (WHERE billing_mode = 'assinatura' AND cliente_assinatura_id IS NOT NULL) as assinaturas_com_fk
  FROM projects
)
SELECT
  'Projetos PACOTE com FK' as metrica,
  '5 de 8 (62.5%)' as antes,
  pacotes_com_fk::text || ' de ' || total_pacotes::text ||
    ' (' || ROUND(pacotes_com_fk * 100.0 / NULLIF(total_pacotes, 0), 1)::text || '%)' as depois,
  CASE
    WHEN pacotes_com_fk = total_pacotes THEN '✅ 100% CORRIGIDO'
    WHEN pacotes_com_fk > 5 THEN '⚠️ Parcialmente corrigido'
    ELSE '❌ Sem mudança'
  END as status
FROM stats

UNION ALL

SELECT
  'Projetos ASSINATURA com FK',
  '0 de 0',
  assinaturas_com_fk::text || ' de ' || total_assinaturas::text,
  CASE
    WHEN total_assinaturas = 0 THEN 'N/A'
    WHEN assinaturas_com_fk = total_assinaturas THEN '✅ 100% CORRIGIDO'
    ELSE '⚠️ Verificar'
  END
FROM stats;


-- ==========================================
-- NOTA FINAL
-- ==========================================
SELECT
  '✅ CORREÇÃO CONCLUÍDA!' as mensagem,
  'Verifique os resultados acima para confirmar que todos os projetos foram corrigidos.' as proximos_passos;
