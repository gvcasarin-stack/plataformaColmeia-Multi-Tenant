-- ============================================================================
-- CORREÇÃO IMEDIATA: Projeto FV-2025-001 com valores zerados
-- ============================================================================
-- Este script corrige os valores do projeto baseado na potência e configurações

-- ============================================================================
-- 1. CORRIGIR PROJETO FV-2025-001 (12kWp = R$ 800)
-- ============================================================================
UPDATE projects 
SET 
  price = 800,                    -- Valor baseado na faixa 10-20kWp
  valor_projeto = 800,           -- Mesmo valor para consistência
  pagamento = 'pendente'         -- Status inicial padrão
WHERE number = 'FV-2025-001'
  AND potencia = 12;

-- ============================================================================
-- 2. VERIFICAR SE A CORREÇÃO FOI APLICADA
-- ============================================================================
SELECT 
    'DEPOIS DA CORREÇÃO' as status,
    number,
    potencia,
    price,
    valor_projeto,
    pagamento,
    'Valor esperado para 12kWp: R$ 800' as observacao
FROM projects
WHERE number = 'FV-2025-001';

-- ============================================================================
-- 3. CORRIGIR OUTROS PROJETOS SE EXISTIREM (BASEADO NA POTÊNCIA)
-- ============================================================================
UPDATE projects 
SET 
  price = CASE 
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
    ELSE 800  -- Fallback padrão
  END,
  valor_projeto = CASE 
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
    ELSE 800  -- Fallback padrão
  END,
  pagamento = COALESCE(pagamento, 'pendente')  -- Só altera se for NULL
WHERE (price IS NULL OR price = 0)
  AND potencia > 0;

-- ============================================================================
-- 4. RELATÓRIO FINAL
-- ============================================================================
SELECT 
    'RELATÓRIO FINAL' as categoria,
    COUNT(*) as total_projetos,
    COUNT(*) FILTER (WHERE price > 0) as projetos_com_valor,
    COUNT(*) FILTER (WHERE pagamento = 'pendente') as projetos_pendentes,
    SUM(price) as valor_total_projetos
FROM projects;

-- ============================================================================
-- 5. VERIFICAR CONFIGURAÇÕES FORAM CARREGADAS
-- ============================================================================
SELECT 
    'CONFIGURAÇÕES ATIVAS' as categoria,
    key,
    CASE 
        WHEN key = 'faixas_potencia' THEN 'Faixas de potência configuradas'
        WHEN key = 'tabela_precos' THEN 'Tabela de preços configurada'
        ELSE description
    END as status
FROM configs 
WHERE key IN ('faixas_potencia', 'tabela_precos')
  AND is_active = true;
