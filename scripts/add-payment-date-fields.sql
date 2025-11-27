-- ============================================
-- MIGRATION: Adicionar campos de data de pagamento
-- Data: 2025-11-04
-- Objetivo: Registrar quando pagamentos foram efetivamente realizados
--           para corrigir contabilização do faturamento mensal real
-- ============================================

-- Adicionar campos de data de pagamento na tabela projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS data_pagamento_parcela1 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_pagamento_integral TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN projects.data_pagamento_parcela1 IS 'Data em que a primeira parcela foi marcada como paga';
COMMENT ON COLUMN projects.data_pagamento_integral IS 'Data em que o pagamento integral foi marcado como pago';

-- ============================================
-- MIGRAÇÃO DE DADOS HISTÓRICOS
-- Preencher datas de pagamento para projetos já pagos
-- Usa updated_at como estimativa (melhor aproximação disponível)
-- ============================================

-- Atualizar projetos com pagamento integral
UPDATE projects
SET data_pagamento_integral = updated_at
WHERE pagamento = 'pago'
  AND data_pagamento_integral IS NULL;

-- Atualizar projetos com primeira parcela paga
UPDATE projects
SET data_pagamento_parcela1 = updated_at
WHERE pagamento = 'parcela1'
  AND data_pagamento_parcela1 IS NULL;

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar quantos projetos foram atualizados
SELECT
  'Projetos com pagamento integral' AS tipo,
  COUNT(*) AS total
FROM projects
WHERE pagamento = 'pago' AND data_pagamento_integral IS NOT NULL

UNION ALL

SELECT
  'Projetos com primeira parcela' AS tipo,
  COUNT(*) AS total
FROM projects
WHERE pagamento = 'parcela1' AND data_pagamento_parcela1 IS NOT NULL

UNION ALL

SELECT
  'Projetos pendentes' AS tipo,
  COUNT(*) AS total
FROM projects
WHERE pagamento = 'pendente' OR pagamento IS NULL;
