-- ========================================
-- Script de Diagnóstico: FKs de Pacotes em Projetos
-- Data: 27/11/2025
-- Descrição: Verifica se cliente_pacote_id está sendo preenchido corretamente
-- ========================================
-- COMO USAR: Copie e cole no SQL Editor do Supabase
-- ========================================

-- ==========================================
-- DIAGNÓSTICO 1: Visão Geral das FKs
-- ==========================================
SELECT
  'Total de projetos' as metrica,
  COUNT(*)::text as valor,
  '100%' as percentual
FROM projects

UNION ALL

SELECT
  'Projetos modo PACOTE',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'pacote'

UNION ALL

SELECT
  'Projetos modo ASSINATURA',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'assinatura'

UNION ALL

SELECT
  'Projetos modo AVULSO',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'avulso'

UNION ALL

SELECT
  '🔴 Projetos PACOTE com FK NULL (BUG!)',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects WHERE billing_mode = 'pacote'), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'pacote' AND cliente_pacote_id IS NULL

UNION ALL

SELECT
  '✅ Projetos PACOTE com FK preenchida',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects WHERE billing_mode = 'pacote'), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'pacote' AND cliente_pacote_id IS NOT NULL

UNION ALL

SELECT
  '🔴 Projetos ASSINATURA com FK NULL (BUG!)',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects WHERE billing_mode = 'assinatura'), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'assinatura' AND cliente_assinatura_id IS NULL

UNION ALL

SELECT
  '✅ Projetos ASSINATURA com FK preenchida',
  COUNT(*)::text,
  ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM projects WHERE billing_mode = 'assinatura'), 0), 1)::text || '%'
FROM projects
WHERE billing_mode = 'assinatura' AND cliente_assinatura_id IS NOT NULL

UNION ALL

SELECT
  '⚠️ Projetos com pacote_id no snapshot mas sem FK',
  COUNT(*)::text,
  'Inconsistência'
FROM projects
WHERE billing_mode = 'pacote'
  AND billing_snapshot->>'pacote_id' IS NOT NULL
  AND cliente_pacote_id IS NULL;


-- ==========================================
-- DIAGNÓSTICO 2: Pacotes com Contador Errado
-- ==========================================
SELECT
  '🔍 DIAGNÓSTICO: Contadores vs Projetos Vinculados' as titulo,
  '' as separador;

SELECT
  cp.id as pacote_id,
  COALESCE(u.company_name, u.name, 'Cliente sem nome') as cliente,
  pd.nome as pacote_nome,
  cp.projetos_inclusos,
  cp.projetos_usados as contador_no_pacote,
  COUNT(p.id) as projetos_com_fk,
  cp.projetos_usados - COUNT(p.id) as diferenca,
  CASE
    WHEN cp.projetos_usados - COUNT(p.id) > 0 THEN '🔴 BUG! Projetos órfãos'
    WHEN cp.projetos_usados - COUNT(p.id) < 0 THEN '⚠️ Contador menor que vinculações'
    ELSE '✅ OK'
  END as status,
  cp.status as status_pacote,
  cp.data_ativacao::date as ativado_em,
  cp.data_expiracao::date as expira_em
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id AND p.tenant_id = cp.tenant_id
GROUP BY
  cp.id,
  u.company_name,
  u.name,
  pd.nome,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.status,
  cp.data_ativacao,
  cp.data_expiracao
ORDER BY diferenca DESC, cp.data_ativacao DESC;


-- ==========================================
-- DIAGNÓSTICO 3: Projetos Órfãos (modo pacote mas sem FK)
-- ==========================================
SELECT
  '🔍 PROJETOS ÓRFÃOS: billing_mode = pacote mas cliente_pacote_id = NULL' as titulo,
  '' as separador;

SELECT
  p.id,
  p.number as projeto,
  p.nome_cliente_final as cliente_final,
  p.billing_mode,
  p.billing_snapshot->>'mode' as snapshot_mode,
  p.billing_snapshot->>'pacote_id' as pacote_id_no_snapshot,
  p.billing_snapshot->>'pacote_nome' as pacote_nome,
  p.billing_snapshot->>'fallback_reason' as motivo_fallback,
  p.cliente_pacote_id as fk_atual,
  CASE
    WHEN p.cliente_pacote_id IS NULL AND p.billing_snapshot->>'pacote_id' IS NOT NULL THEN '🔴 Precisa correção'
    WHEN p.cliente_pacote_id IS NULL AND p.billing_snapshot->>'fallback_reason' IS NOT NULL THEN '✅ Fallback correto'
    ELSE '❓ Verificar manualmente'
  END as diagnostico,
  p.created_at::date as criado_em,
  u.company_name || ' (' || u.email || ')' as proprietario
FROM projects p
LEFT JOIN users u ON u.id = p.owner_id
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
ORDER BY p.created_at DESC
LIMIT 50;


-- ==========================================
-- DIAGNÓSTICO 4: Verificar Snapshots vs FKs
-- ==========================================
SELECT
  '🔍 COMPARAÇÃO: Snapshot vs FK' as titulo,
  '' as separador;

SELECT
  p.id,
  p.number as projeto,
  p.billing_mode,
  p.billing_snapshot->>'pacote_id' as pacote_no_snapshot,
  p.cliente_pacote_id::text as pacote_na_fk,
  CASE
    WHEN p.billing_snapshot->>'pacote_id' = p.cliente_pacote_id::text THEN '✅ Consistente'
    WHEN p.billing_snapshot->>'pacote_id' IS NOT NULL AND p.cliente_pacote_id IS NULL THEN '🔴 FK faltando'
    WHEN p.billing_snapshot->>'pacote_id' IS NULL AND p.cliente_pacote_id IS NOT NULL THEN '⚠️ FK sem snapshot'
    WHEN p.billing_snapshot->>'pacote_id' != p.cliente_pacote_id::text THEN '❌ CONFLITO!'
    ELSE '❓ Verificar'
  END as status,
  p.created_at::date as criado_em
FROM projects p
WHERE p.billing_mode = 'pacote'
ORDER BY
  CASE
    WHEN p.billing_snapshot->>'pacote_id' IS NOT NULL AND p.cliente_pacote_id IS NULL THEN 1
    WHEN p.billing_snapshot->>'pacote_id' != p.cliente_pacote_id::text THEN 2
    ELSE 3
  END,
  p.created_at DESC
LIMIT 50;


-- ==========================================
-- DIAGNÓSTICO 5: Caso Específico - Catarina Solar
-- ==========================================
SELECT
  '🔍 CASO ESPECÍFICO: Catarina Solar (do screenshot)' as titulo,
  '' as separador;

-- Buscar pacote da Catarina Solar
WITH catarina_pacote AS (
  SELECT cp.id
  FROM cliente_pacotes cp
  LEFT JOIN users u ON u.id = cp.user_id
  WHERE (u.company_name ILIKE '%Catarina Solar%' OR u.name ILIKE '%Catarina%')
    AND cp.status = 'ativo'
  LIMIT 1
)
SELECT
  '📦 Informações do Pacote' as secao,
  cp.id::text as valor,
  'ID do pacote' as descricao
FROM cliente_pacotes cp
WHERE cp.id = (SELECT id FROM catarina_pacote)

UNION ALL

SELECT
  '',
  cp.projetos_usados::text,
  'Contador (projetos_usados)'
FROM cliente_pacotes cp
WHERE cp.id = (SELECT id FROM catarina_pacote)

UNION ALL

SELECT
  '',
  COUNT(p.id)::text,
  'Projetos com FK vinculada'
FROM projects p
WHERE p.cliente_pacote_id = (SELECT id FROM catarina_pacote)

UNION ALL

SELECT
  '',
  (cp.projetos_usados - COUNT(p.id))::text,
  '🔴 Diferença (projetos órfãos)'
FROM cliente_pacotes cp
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
WHERE cp.id = (SELECT id FROM catarina_pacote)
GROUP BY cp.projetos_usados

UNION ALL

SELECT
  '📋 Projetos Visíveis (com FK)',
  p.number,
  p.nome_cliente_final || ' - ' || p.created_at::date::text
FROM projects p
WHERE p.cliente_pacote_id = (SELECT id FROM catarina_pacote)
ORDER BY p.created_at DESC;

-- Buscar projetos órfãos (sem FK mas com snapshot do pacote)
SELECT
  '🔴 Projetos Órfãos (snapshot correto mas FK NULL)' as secao,
  p.number as valor,
  p.nome_cliente_final || ' - ' || p.created_at::date::text as descricao
FROM projects p
WHERE p.owner_id = (SELECT user_id FROM cliente_pacotes WHERE id = (SELECT id FROM catarina_pacote LIMIT 1))
  AND p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
  AND p.billing_snapshot->>'pacote_id' = (SELECT id::text FROM catarina_pacote LIMIT 1)
ORDER BY p.created_at DESC;


-- ==========================================
-- DIAGNÓSTICO 6: Constraint de Exclusividade
-- ==========================================
SELECT
  '🔍 VERIFICAÇÃO: Constraint de Exclusividade' as titulo,
  '' as separador;

SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✅ OK - Nenhum projeto com ambas as FKs'
    ELSE '❌ PROBLEMA - ' || COUNT(*)::text || ' projetos com ambas as FKs!'
  END as resultado,
  COUNT(*) as quantidade
FROM projects
WHERE cliente_pacote_id IS NOT NULL
  AND cliente_assinatura_id IS NOT NULL;


-- ==========================================
-- RESUMO EXECUTIVO
-- ==========================================
SELECT
  '📊 RESUMO EXECUTIVO' as titulo,
  '' as valor1,
  '' as valor2,
  '' as valor3;

SELECT
  'Total de Pacotes Ativos' as metrica,
  COUNT(*)::text as valor1,
  '' as valor2,
  '' as valor3
FROM cliente_pacotes
WHERE status = 'ativo'

UNION ALL

SELECT
  'Pacotes com projetos órfãos',
  COUNT(DISTINCT cp.id)::text,
  '(' || ROUND(COUNT(DISTINCT cp.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM cliente_pacotes WHERE status = 'ativo'), 0), 1)::text || '%)',
  '🔴'
FROM cliente_pacotes cp
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
WHERE cp.status = 'ativo'
  AND cp.projetos_usados > 0
GROUP BY cp.id
HAVING cp.projetos_usados > COUNT(p.id)

UNION ALL

SELECT
  'Total de projetos órfãos estimado',
  SUM(cp.projetos_usados - COALESCE(proj_count.cnt, 0))::text,
  '',
  '🔴'
FROM cliente_pacotes cp
LEFT JOIN (
  SELECT cliente_pacote_id, COUNT(*) as cnt
  FROM projects
  WHERE cliente_pacote_id IS NOT NULL
  GROUP BY cliente_pacote_id
) proj_count ON proj_count.cliente_pacote_id = cp.id
WHERE cp.status = 'ativo'
  AND cp.projetos_usados > COALESCE(proj_count.cnt, 0)

UNION ALL

SELECT
  'Projetos que podem ser corrigidos',
  COUNT(*)::text,
  '(têm pacote_id no snapshot)',
  '✅'
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot->>'pacote_id' IS NOT NULL
  AND billing_snapshot->>'fallback_reason' IS NULL;
