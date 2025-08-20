-- SIMPLIFICAÇÃO: Remover coluna detalhePagamento desnecessária
-- A coluna pagamento já faz todo o controle necessário

-- PRIMEIRO: Verificar se a coluna existe
DO $$
BEGIN
    -- Verificar existência da coluna
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'detalhePagamento'
    ) THEN
        -- Remover a coluna se ela existir
        EXECUTE 'ALTER TABLE public.projects DROP COLUMN "detalhePagamento"';
        RAISE NOTICE 'Coluna detalhePagamento removida com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna detalhePagamento não existe, nada para remover.';
    END IF;
END $$;

-- VERIFICAÇÃO FINAL: Confirmar que a coluna foi removida
SELECT 
    'Verificação pós-remoção' as status,
    COUNT(*) as colunas_detalhe_pagamento_restantes
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects' 
AND column_name = 'detalhePagamento';

-- LISTAR COLUNAS RELACIONADAS A PAGAMENTO QUE PERMANECERAM
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects' 
AND column_name IN ('pagamento', 'price', 'valor_projeto')
ORDER BY column_name; 