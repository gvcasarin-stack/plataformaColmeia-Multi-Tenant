-- ============================================================================
-- DIAGNÓSTICO: Por que os valores dos projetos estão zerados?
-- ============================================================================
-- Este script verifica todos os aspectos relacionados ao cálculo de valores

-- ============================================================================
-- 1. VERIFICAR PROJETOS EXISTENTES
-- ============================================================================
SELECT 
    'PROJETOS EXISTENTES' as categoria,
    id,
    name,
    number,
    potencia,
    price,
    valor_projeto,
    pagamento,
    created_by,
    created_at
FROM projects
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 2. VERIFICAR CONFIGURAÇÕES DE PREÇO
-- ============================================================================
SELECT 
    'CONFIGURAÇÕES PREÇO' as categoria,
    key,
    value,
    description
FROM configs 
WHERE key IN ('faixas_potencia', 'tabela_precos')
  AND is_active = true;

-- ============================================================================
-- 3. ANÁLISE DETALHADA DO PROJETO ESPECÍFICO
-- ============================================================================
SELECT 
    'PROJETO FV-2025-001 DETALHADO' as categoria,
    p.*,
    u.full_name as criador_nome,
    u.email as criador_email,
    u.role as criador_role
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
WHERE p.number = 'FV-2025-001';

-- ============================================================================
-- 4. VERIFICAR SE CÁLCULO AUTOMÁTICO DEVERIA SER APLICADO
-- ============================================================================
SELECT 
    'CÁLCULO AUTOMÁTICO BASEADO EM POTÊNCIA' as categoria,
    id,
    name,
    number,
    potencia,
    CASE 
        WHEN potencia >= 0 AND potencia <= 5 THEN 600
        WHEN potencia > 5 AND potencia <= 10 THEN 700
        WHEN potencia > 10 AND potencia <= 20 THEN 800
        WHEN potencia > 20 AND potencia <= 30 THEN 1000
        WHEN potencia > 30 AND potencia <= 40 THEN 1200
        WHEN potencia > 40 AND potencia <= 50 THEN 1750
        WHEN potencia > 50 AND potencia <= 75 THEN 2500
        WHEN potencia > 75 AND potencia <= 150 THEN 3000
        WHEN potencia > 150 AND potencia <= 300 THEN 4000
        WHEN potencia > 300 THEN 4000
        ELSE 0
    END as valor_calculado_automatico,
    price as valor_atual_price,
    valor_projeto as valor_atual_valor_projeto
FROM projects
WHERE number = 'FV-2025-001';

-- ============================================================================
-- 5. RESUMO PARA DIAGNÓSTICO
-- ============================================================================
SELECT 
    'RESUMO DIAGNÓSTICO' as categoria,
    'Projeto: ' || name || ' (12kWp)' as projeto,
    'Valor esperado: R$ 800 (faixa 10-20kWp)' as valor_esperado,
    'Valor price atual: R$ ' || COALESCE(price::text, 'NULL') as valor_price,
    'Valor valor_projeto atual: R$ ' || COALESCE(valor_projeto::text, 'NULL') as valor_valor_projeto,
    'Status pagamento: ' || COALESCE(pagamento, 'NULL') as status_pagamento
FROM projects
WHERE number = 'FV-2025-001'; 