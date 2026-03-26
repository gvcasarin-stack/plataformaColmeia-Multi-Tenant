-- ========================================
-- DIAGNÓSTICO: Por Que Pacotes Não Aparecem no Modal de Conversão
-- Data: 2025-01-28
-- Referência: RELATORIO-TECNICO-FLUXO-RENOVACAO.md
-- ========================================

-- 🎯 INSTRUÇÕES:
-- 1. Execute cada query sequencialmente
-- 2. Anote os resultados
-- 3. Compare com resultados esperados
-- 4. Identifique qual query falha

-- 📊 DADOS DO TESTE:
-- tenant_id: 061ff77b-8b3a-4732-9158-a574c1f1690a (Colmeia Solar)
-- Empresa: Catarina Solar
-- Pacote esperado: "Pacote Ouro" - 0/5 projetos

-- ========================================
-- QUERY 1: Verificar Pacote Criado pela Renovação
-- ========================================
-- Objetivo: Confirmar que pacote existe e foi criado corretamente

SELECT
  cp.id AS cliente_pacote_id,
  cp.user_id,
  cp.pacote_id,
  cp.tenant_id,
  cp.status,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.data_ativacao,
  cp.data_expiracao,
  cp.created_at,
  -- Verificar se JOINs funcionam
  u.id AS user_exists,
  u.name AS user_name,
  u.email AS user_email,
  pd.id AS pacote_def_exists,
  pd.nome AS pacote_nome,
  pd.quantidade_projetos AS pacote_quantidade
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.status = 'ativo'
  AND cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY cp.created_at DESC
LIMIT 10;

-- ✅ RESULTADO ESPERADO:
-- - Deve retornar pelo menos 1 linha (Pacote Ouro da Catarina Solar)
-- - user_exists: NOT NULL (UUID válido)
-- - user_name: "Catarina Solar" ou similar
-- - pacote_def_exists: NOT NULL (UUID válido)
-- - pacote_nome: "Pacote Ouro" ou similar
-- - projetos_inclusos: 5
-- - projetos_usados: 0
-- - status: 'ativo'

-- ❌ SE FALHAR:
-- - 0 linhas retornadas → Pacote não foi criado ou tenant_id diferente
-- - user_exists NULL → user_id inválido (FK quebrada)
-- - pacote_def_exists NULL → pacote_id inválido (FK quebrada)
-- - projetos_inclusos NULL → INSERT com valor NULL

-- ========================================
-- QUERY 2: Simular Exatamente a Query do available-billing
-- ========================================
-- Objetivo: Reproduzir a query que o endpoint executa

SELECT
  cp.id,
  cp.pacote_id,
  cp.user_id,
  cp.status,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.data_ativacao,
  cp.data_expiracao,
  -- Simular JSON retornado pela API Supabase
  jsonb_build_object(
    'id', pd.id,
    'nome', pd.nome,
    'quantidade_projetos', pd.quantidade_projetos,
    'potencia_maxima', pd.potencia_maxima_kwp
  ) AS pacote,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', u.name
  ) AS user,
  -- Verificações críticas
  (pd.id IS NOT NULL) AS "TEM_PACOTE_DEFINICAO",
  (u.id IS NOT NULL) AS "TEM_USER",
  (cp.projetos_usados < cp.projetos_inclusos) AS "PASSA_FILTRO_QUOTA"
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN users u ON u.id = cp.user_id
WHERE cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND cp.status = 'ativo';

-- ✅ RESULTADO ESPERADO:
-- - Deve retornar linhas com "TEM_PACOTE_DEFINICAO" = true
-- - Deve retornar linhas com "TEM_USER" = true
-- - Deve retornar linhas com "PASSA_FILTRO_QUOTA" = true
-- - Campo "pacote" deve ter JSON com 'nome', 'quantidade_projetos', etc.
-- - Campo "user" deve ter JSON com 'name', 'email', etc.

-- ❌ SE FALHAR:
-- - TEM_PACOTE_DEFINICAO = false → pacote_id inválido
-- - TEM_USER = false → user_id inválido
-- - PASSA_FILTRO_QUOTA = false → Pacote esgotado ou campos NULL
-- - pacote ou user com valores NULL nos campos → JOIN falhou

-- ========================================
-- QUERY 3: Diagnóstico Detalhado do Filtro de Quota
-- ========================================
-- Objetivo: Entender por que filtro pode estar eliminando pacotes

SELECT
  cp.id,
  cp.status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  -- Teste da condição de filtro
  (cp.projetos_usados < cp.projetos_inclusos) AS "PASSA_NO_FILTRO",
  -- Diagnóstico detalhado
  CASE
    WHEN cp.projetos_usados IS NULL THEN '❌ projetos_usados é NULL'
    WHEN cp.projetos_inclusos IS NULL THEN '❌ projetos_inclusos é NULL'
    WHEN cp.projetos_usados >= cp.projetos_inclusos THEN '⚠️ Pacote esgotado (sem vagas)'
    WHEN cp.projetos_usados < 0 THEN '❌ projetos_usados negativo (dados inválidos)'
    WHEN cp.projetos_inclusos <= 0 THEN '❌ projetos_inclusos inválido'
    ELSE '✅ OK - Tem vagas disponíveis'
  END AS "MOTIVO"
FROM cliente_pacotes cp
WHERE cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND cp.status = 'ativo'
ORDER BY cp.created_at DESC;

-- ✅ RESULTADO ESPERADO:
-- - PASSA_NO_FILTRO = true
-- - MOTIVO = '✅ OK - Tem vagas disponíveis'

-- ❌ SE FALHAR:
-- - Ver campo "MOTIVO" para entender o problema exato

-- ========================================
-- QUERY 4: Buscar Pacotes da Catarina Solar Especificamente
-- ========================================
-- Objetivo: Focar apenas nos pacotes da empresa que está testando

SELECT
  cp.id,
  cp.status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  u.name AS empresa,
  u.email,
  pd.nome AS pacote_nome,
  cp.created_at,
  -- Verificações
  (u.name ILIKE '%catarina%') AS "É_CATARINA",
  (cp.projetos_usados < cp.projetos_inclusos) AS "TEM_VAGA"
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND cp.status = 'ativo'
  AND u.name ILIKE '%catarina%'
ORDER BY cp.created_at DESC;

-- ✅ RESULTADO ESPERADO:
-- - Pelo menos 1 linha retornada
-- - empresa = "Catarina Solar"
-- - pacote_nome = "Pacote Ouro" (ou similar)
-- - É_CATARINA = true
-- - TEM_VAGA = true

-- ========================================
-- QUERY 5: Comparar tenant_id entre Pacote e Projeto
-- ========================================
-- Objetivo: Verificar se tenant_id está consistente

SELECT
  -- Dados do projeto
  'PROJETO' AS tipo,
  p.id,
  p.number,
  p.tenant_id,
  p.billing_mode,
  p.nome_cliente_final
FROM projects p
WHERE p.number LIKE '%377%'
  OR p.nome_cliente_final ILIKE '%pacote%'

UNION ALL

SELECT
  -- Dados do pacote
  'PACOTE' AS tipo,
  cp.id,
  'N/A' AS number,
  cp.tenant_id,
  cp.status AS billing_mode,
  u.name AS nome_cliente_final
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
WHERE cp.status = 'ativo'
  AND cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY tipo, id;

-- ✅ RESULTADO ESPERADO:
-- - PROJETO e PACOTE devem ter MESMO tenant_id
-- - Se tenant_id diferente → PROBLEMA CRÍTICO

-- ========================================
-- QUERY 6: Verificar se Existe Problema de Foreign Key
-- ========================================
-- Objetivo: Encontrar pacotes órfãos (sem user ou sem pacote_definicao)

SELECT
  cp.id,
  cp.user_id,
  cp.pacote_id,
  cp.status,
  CASE
    WHEN u.id IS NULL THEN '❌ USER NÃO EXISTE (FK quebrada)'
    ELSE '✅ User OK'
  END AS "STATUS_USER",
  CASE
    WHEN pd.id IS NULL THEN '❌ PACOTE_DEFINICAO NÃO EXISTE (FK quebrada)'
    ELSE '✅ Pacote Definição OK'
  END AS "STATUS_PACOTE_DEF"
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND cp.status = 'ativo'
  AND (u.id IS NULL OR pd.id IS NULL);  -- Apenas pacotes com FK quebrada

-- ✅ RESULTADO ESPERADO:
-- - 0 linhas retornadas (nenhum pacote órfão)

-- ❌ SE RETORNAR LINHAS:
-- - STATUS_USER = "❌ USER NÃO EXISTE" → user_id inválido
-- - STATUS_PACOTE_DEF = "❌ PACOTE_DEFINICAO NÃO EXISTE" → pacote_id inválido
-- - AÇÃO: Corrigir dados ou investigar por que FK está quebrada

-- ========================================
-- QUERY 7: Verificar Schema de cliente_pacotes
-- ========================================
-- Objetivo: Confirmar estrutura da tabela

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'cliente_pacotes'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ RESULTADO ESPERADO:
-- - user_id: uuid, NOT NULL (ou nullable)
-- - pacote_id: uuid, NOT NULL (ou nullable)
-- - tenant_id: uuid, NOT NULL
-- - projetos_inclusos: integer, NOT NULL (ou nullable)
-- - projetos_usados: integer, NOT NULL (ou nullable)
-- - status: text, NOT NULL

-- ========================================
-- QUERY 8: Testar JSON Build (Como Supabase PostgREST Faz)
-- ========================================
-- Objetivo: Simular exatamente como PostgREST monta o JSON

WITH pacotes_raw AS (
  SELECT
    cp.id,
    cp.pacote_id,
    cp.user_id,
    cp.status,
    cp.projetos_inclusos,
    cp.projetos_usados,
    cp.data_ativacao,
    cp.data_expiracao,
    -- Simular exatamente o select aninhado do Supabase
    to_jsonb(pd.*) AS pacote,
    to_jsonb(u.*) AS user
  FROM cliente_pacotes cp
  LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
  LEFT JOIN users u ON u.id = cp.user_id
  WHERE cp.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND cp.status = 'ativo'
)
SELECT
  id,
  pacote->>'nome' AS pacote_nome,
  user->>'name' AS user_name,
  projetos_usados,
  projetos_inclusos,
  -- Simulação do filtro
  (projetos_usados < projetos_inclusos) AS passa_filtro,
  -- Simulação do mapeamento
  CASE
    WHEN pacote->>'nome' IS NULL THEN '❌ ERRO: pacote.nome é NULL'
    WHEN user->>'name' IS NULL THEN '⚠️ AVISO: user.name é NULL (vai usar N/A)'
    ELSE '✅ Mapeamento OK'
  END AS "STATUS_MAPEAMENTO"
FROM pacotes_raw;

-- ✅ RESULTADO ESPERADO:
-- - pacote_nome: "Pacote Ouro" (não NULL)
-- - user_name: "Catarina Solar" (não NULL)
-- - passa_filtro: true
-- - STATUS_MAPEAMENTO: "✅ Mapeamento OK"

-- ❌ SE FALHAR:
-- - pacote_nome NULL → JOIN com pacotes_definicoes falhou
-- - user_name NULL → JOIN com users falhou (mas aceito se usar N/A)
-- - passa_filtro false → Problema de quota

-- ========================================
-- 📊 RESUMO DOS TESTES
-- ========================================

/*
CHECKLIST DE DIAGNÓSTICO:

□ QUERY 1: Pacote existe e foi criado corretamente?
  → Se FALHOU: Pacote não foi criado ou tenant_id diferente

□ QUERY 2: JOINs retornam dados válidos?
  → Se FALHOU: Foreign Keys quebradas (user_id ou pacote_id inválidos)

□ QUERY 3: Filtro de quota está correto?
  → Se FALHOU: campos NULL ou pacote esgotado

□ QUERY 4: Pacote da Catarina Solar existe?
  → Se FALHOU: Problema específico com este cliente

□ QUERY 5: tenant_id é consistente?
  → Se FALHOU: Projeto e pacote em tenants diferentes

□ QUERY 6: Existem FKs quebradas?
  → Se FALHOU: Dados corrompidos precisam ser corrigidos

□ QUERY 7: Schema está correto?
  → Se FALHOU: Estrutura da tabela diferente do esperado

□ QUERY 8: Mapeamento JSON funciona?
  → Se FALHOU: PostgREST não consegue montar JSON corretamente

APÓS EXECUTAR TODAS AS QUERIES:
- Anote qual query FALHOU primeiro
- Consulte o RELATORIO-TECNICO-FLUXO-RENOVACAO.md
- Identifique o "PONTO DE FALHA" correspondente
- Aplique a correção apropriada
*/

-- ========================================
-- FIM DO DIAGNÓSTICO
-- ========================================
