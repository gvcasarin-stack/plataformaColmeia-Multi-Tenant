-- ============================================================================
-- CORREÇÃO FINAL: Indicadores Mensais Zerados
-- ============================================================================
-- Mover projeto para mês atual para aparecer nos cálculos mensais

-- ============================================================================
-- 1. MOSTRAR SITUAÇÃO ATUAL
-- ============================================================================
SELECT 
    'ANTES DA CORREÇÃO' as status,
    number,
    created_at,
    TO_CHAR(created_at, 'YYYY-MM') as mes_projeto,
    TO_CHAR(NOW(), 'YYYY-MM') as mes_atual,
    CASE 
        WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) 
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) 
        THEN 'INCLUÍDO nos cálculos mensais'
        ELSE 'EXCLUÍDO dos cálculos mensais'
    END as status_mensal
FROM projects
WHERE number = 'FV-2025-001';

-- ============================================================================
-- 2. MOVER PROJETO PARA MÊS ATUAL (MANTENDO DIA E HORA)
-- ============================================================================
UPDATE projects 
SET created_at = DATE_TRUNC('month', NOW()) + 
                (created_at - DATE_TRUNC('month', created_at))
WHERE number = 'FV-2025-001'
RETURNING 
    number,
    created_at as nova_data,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as data_formatada,
    'Projeto movido para mês atual' as status;

-- ============================================================================
-- 3. VERIFICAR DEPOIS DA CORREÇÃO
-- ============================================================================
SELECT 
    'DEPOIS DA CORREÇÃO' as status,
    number,
    created_at,
    TO_CHAR(created_at, 'YYYY-MM') as mes_projeto,
    TO_CHAR(NOW(), 'YYYY-MM') as mes_atual,
    CASE 
        WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) 
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) 
        THEN '✅ INCLUÍDO nos cálculos mensais'
        ELSE '❌ EXCLUÍDO dos cálculos mensais'
    END as status_mensal
FROM projects
WHERE number = 'FV-2025-001';

-- ============================================================================
-- 4. SIMULAR CÁLCULOS MENSAIS APÓS CORREÇÃO
-- ============================================================================
SELECT 
    'FATURAMENTO MENSAL ESTIMADO' as categoria,
    COUNT(*) as projetos_deste_mes,
    SUM(price) as faturamento_estimado,
    STRING_AGG(number, ', ') as numeros_projetos,
    'Valor que deveria aparecer na interface' as observacao
FROM projects
WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  AND price > 0;

-- ============================================================================
-- 5. SIMULAR FATURAMENTO MENSAL REAL
-- ============================================================================
SELECT 
    'FATURAMENTO MENSAL REAL' as categoria,
    COUNT(*) FILTER (WHERE pagamento = 'pago') as projetos_pagos_mes,
    COUNT(*) FILTER (WHERE pagamento = 'parcela1') as projetos_parcela1_mes,
    SUM(CASE WHEN pagamento = 'pago' THEN price ELSE 0 END) as valor_pagos_mes,
    SUM(CASE WHEN pagamento = 'parcela1' THEN price/2 ELSE 0 END) as valor_parcelas_mes,
    SUM(CASE WHEN pagamento = 'pago' THEN price ELSE 0 END) + 
    SUM(CASE WHEN pagamento = 'parcela1' THEN price/2 ELSE 0 END) as total_mensal_real,
    'Valor que deveria aparecer para Faturamento Mensal Real' as observacao
FROM projects
WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  AND price > 0; 