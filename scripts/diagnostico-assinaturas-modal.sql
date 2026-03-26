-- ========================================
-- DIAGNÓSTICO: Por Que Assinaturas Não Aparecem no Modal de Conversão
-- Data: 2025-12-03
-- ========================================

-- 🎯 INSTRUÇÕES:
-- 1. Execute cada query sequencialmente no Supabase SQL Editor
-- 2. Anote os resultados
-- 3. Identifique qual query falha ou retorna 0 linhas

-- ========================================
-- QUERY 1: Verificar se existem PLANOS de assinatura cadastrados
-- ========================================
SELECT 
  'PLANOS_ASSINATURA' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
FROM planos_assinatura;

-- ✅ ESPERADO: total > 0 e ativos > 0
-- ❌ SE FALHAR: Não há planos cadastrados - precisa criar planos primeiro

-- ========================================
-- QUERY 2: Verificar ESTRUTURA da tabela planos_assinatura
-- ========================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'planos_assinatura'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ ESPERADO: Deve ter coluna 'quantidade_mensal' (NÃO 'projetos_por_mes')

-- ========================================
-- QUERY 3: Verificar se existem ASSINATURAS de clientes
-- ========================================
SELECT 
  'CLIENTE_ASSINATURAS' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'ativa' THEN 1 END) as ativas,
  COUNT(CASE WHEN status = 'pendente_renovacao' THEN 1 END) as pendentes,
  COUNT(CASE WHEN status = 'cancelada' THEN 1 END) as canceladas
FROM cliente_assinaturas;

-- ✅ ESPERADO: ativas > 0
-- ❌ SE FALHAR: Não há assinaturas ativas - precisa ativar assinatura para algum cliente

-- ========================================
-- QUERY 4: Listar TODAS as assinaturas com detalhes
-- ========================================
SELECT 
  ca.id,
  ca.user_id,
  ca.plano_id,
  ca.tenant_id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.projetos_mensais,
  ca.proximo_reset,
  u.name as cliente_nome,
  u.email as cliente_email,
  pa.nome as plano_nome,
  pa.quantidade_mensal as plano_quantidade_mensal
FROM cliente_assinaturas ca
LEFT JOIN users u ON u.id = ca.user_id
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
ORDER BY ca.created_at DESC
LIMIT 20;

-- ✅ ESPERADO: Deve retornar linhas com status = 'ativa'
-- ❌ VERIFICAR: 
--    - plano_nome deve ser NOT NULL
--    - plano_quantidade_mensal deve ser NOT NULL e > 0
--    - tenant_id deve estar preenchido

-- ========================================
-- QUERY 5: Simular EXATAMENTE a query da API available-billing
-- ========================================
-- Substitua o tenant_id pelo seu tenant real
-- Para descobrir seu tenant_id, execute: SELECT tenant_id FROM users WHERE role = 'admin' LIMIT 1;

SELECT 
  ca.id,
  ca.plano_id,
  ca.user_id,
  ca.status,
  ca.projetos_usados_mes_atual,
  ca.data_inicio,
  ca.proximo_reset,
  -- Simular o JOIN com planos_assinatura
  pa.id as "plano.id",
  pa.nome as "plano.nome",
  pa.quantidade_mensal as "plano.quantidade_mensal",
  pa.potencia_maxima_kwp as "plano.potencia_maxima_kwp",
  -- Simular o JOIN com users
  u.id as "user.id",
  u.email as "user.email",
  u.name as "user.name",
  -- Verificações
  (pa.id IS NOT NULL) as "TEM_PLANO",
  (u.id IS NOT NULL) as "TEM_USER",
  (ca.projetos_usados_mes_atual < pa.quantidade_mensal) as "TEM_QUOTA_DISPONIVEL"
FROM cliente_assinaturas ca
LEFT JOIN planos_assinatura pa ON pa.id = ca.plano_id
LEFT JOIN users u ON u.id = ca.user_id
WHERE ca.status = 'ativa';
-- Adicione esta linha após descobrir seu tenant_id:
-- AND ca.tenant_id = 'SEU-TENANT-ID-AQUI';

-- ✅ ESPERADO:
--    - TEM_PLANO = true
--    - TEM_USER = true
--    - TEM_QUOTA_DISPONIVEL = true
--    - plano.quantidade_mensal > 0

-- ========================================
-- QUERY 6: Verificar se tenant_id está preenchido nas assinaturas
-- ========================================
SELECT 
  ca.id,
  ca.tenant_id,
  ca.status,
  CASE 
    WHEN ca.tenant_id IS NULL THEN '❌ TENANT_ID NULL - PROBLEMA!'
    ELSE '✅ OK'
  END as status_tenant
FROM cliente_assinaturas ca
WHERE ca.status = 'ativa';

-- ❌ SE tenant_id for NULL: A assinatura não será encontrada pela API

-- ========================================
-- QUERY 7: Verificar tenant_id do admin logado
-- ========================================
-- Use este para descobrir qual tenant_id filtrar
SELECT 
  id,
  name,
  email,
  role,
  tenant_id
FROM users
WHERE role IN ('admin', 'superadmin')
LIMIT 5;

-- ========================================
-- QUERY 8: Verificar se há assinaturas para o tenant específico
-- ========================================
-- Substitua pelo tenant_id encontrado na query 7
-- SELECT * FROM cliente_assinaturas WHERE tenant_id = 'SEU-TENANT-ID';

-- ========================================
-- 📊 RESUMO DO DIAGNÓSTICO
-- ========================================
/*
CHECKLIST:

□ QUERY 1: Existem planos cadastrados?
  → Se NÃO: Criar planos em Admin > Planos de Assinatura

□ QUERY 2: Tabela tem coluna 'quantidade_mensal'?
  → Se NÃO: Estrutura do banco está diferente do esperado

□ QUERY 3: Existem assinaturas ativas?
  → Se NÃO: Ativar assinatura para algum cliente

□ QUERY 4: Assinaturas têm plano_id e user_id válidos?
  → Se NULL: Dados corrompidos

□ QUERY 5: Query simulada retorna dados?
  → Se NÃO: Problema no JOIN ou filtro

□ QUERY 6: tenant_id está preenchido?
  → Se NULL: Precisa rodar migration para preencher tenant_id

POSSÍVEIS CAUSAS:
1. Não há assinaturas cadastradas (precisa ativar para um cliente)
2. tenant_id está NULL nas assinaturas
3. Status não é 'ativa' (pode ser 'pendente_renovacao', etc.)
4. plano_id inválido (FK quebrada)
*/

-- ========================================
-- FIM DO DIAGNÓSTICO
-- ========================================

