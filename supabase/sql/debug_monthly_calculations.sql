-- ============================================================================
-- DIAGNÓSTICO: Por que Faturamento Mensal está zerado?
-- ============================================================================
-- Este script verifica filtros de data e lógica mensal

-- ============================================================================
-- 1. VERIFICAR DATAS DOS PROJETOS
-- ============================================================================
SELECT 
    'DATAS DOS PROJETOS' as categoria,
    number,
    created_at,
    EXTRACT(YEAR FROM created_at) as ano_criacao,
    EXTRACT(MONTH FROM created_at) as mes_criacao,
    TO_CHAR(created_at, 'YYYY-MM') as ano_mes_criacao,
    TO_CHAR(NOW(), 'YYYY-MM') as ano_mes_atual,
    CASE 
        WHEN TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NOW(), 'YYYY-MM') 
        THEN 'SIM - Este mês' 
        ELSE 'NÃO - Mês diferente' 
    END as eh_mes_atual
FROM projects
ORDER BY created_at DESC;

-- ============================================================================
-- 2. TESTE LÓGICA DE MÊS ATUAL (COMO NO CÓDIGO)
-- ============================================================================
SELECT 
    'LÓGICA MÊS ATUAL' as categoria,
    number,
    price,
    pagamento,
    created_at,
    EXTRACT(MONTH FROM created_at) as mes_projeto,
    EXTRACT(YEAR FROM created_at) as ano_projeto,
    EXTRACT(MONTH FROM NOW()) as mes_atual,
    EXTRACT(YEAR FROM NOW()) as ano_atual,
    CASE 
        WHEN EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW()) 
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()) 
        THEN 'INCLUÍDO no faturamento mensal'
        ELSE 'EXCLUÍDO do faturamento mensal'
    END as status_mensal
FROM projects
WHERE price > 0;

-- ============================================================================
-- 3. SIMULAR CÁLCULO MENSAL ESTIMADO
-- ============================================================================
SELECT 
    'FATURAMENTO MENSAL ESTIMADO' as categoria,
    COUNT(*) as projetos_deste_mes,
    SUM(price) as faturamento_estimado,
    STRING_AGG(number, ', ') as numeros_projetos
FROM projects
WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW())
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  AND price > 0;

-- ============================================================================
-- 4. SIMULAR CÁLCULO HISTÓRICO
-- ============================================================================
SELECT 
    'HISTÓRICO DE FATURAMENTO' as categoria,
    COUNT(*) FILTER (WHERE pagamento = 'pago') as projetos_pagos,
    COUNT(*) FILTER (WHERE pagamento = 'parcela1') as projetos_parcela1,
    SUM(CASE WHEN pagamento = 'pago' THEN price ELSE 0 END) as valor_pagos,
    SUM(CASE WHEN pagamento = 'parcela1' THEN price/2 ELSE 0 END) as valor_parcelas,
    SUM(CASE WHEN pagamento = 'pago' THEN price ELSE 0 END) + 
    SUM(CASE WHEN pagamento = 'parcela1' THEN price/2 ELSE 0 END) as total_historico
FROM projects
WHERE price > 0;

-- ============================================================================
-- 5. CORRIGIR DATA PARA TESTE (Mover projeto para mês atual)
-- ============================================================================
-- ATENÇÃO: Isso vai alterar a data de criação do projeto para este mês!
-- Descomente apenas se quiser testar:

-- UPDATE projects 
-- SET created_at = NOW()
-- WHERE number = 'FV-2025-001';

-- ============================================================================
-- 6. VERIFICAR DEPOIS DA POSSÍVEL CORREÇÃO DE DATA
-- ============================================================================
SELECT 
    'DEPOIS DE MOVER PARA MÊS ATUAL' as categoria,
    number,
    price,
    created_at,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as data_formatada,
    'Agora deveria aparecer no faturamento mensal' as observacao
FROM projects
WHERE number = 'FV-2025-001'; 