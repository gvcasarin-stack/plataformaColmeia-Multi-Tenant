-- ========================================
-- VERIFICAÇÃO PROFUNDA: Estrutura da tabela cliente_pacotes
-- ========================================

-- 1. Ver estrutura completa da tabela cliente_pacotes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'cliente_pacotes'
ORDER BY ordinal_position;

-- 2. Buscar o pacote do Gabriel Casarin (todos os campos)
SELECT *
FROM cliente_pacotes
WHERE user_id = 'b772107b-bfa8-48e7-81ac-995331e66623';

-- 3. Verificar se existe tenant_id na tabela cliente_pacotes
SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'cliente_pacotes'
    AND column_name = 'tenant_id'
) as tem_tenant_id;

-- 4. Buscar pacote do Gabriel COM JOIN (simulando a query da API)
SELECT
    cp.*,
    pd.nome,
    pd.quantidade_projetos,
    pd.validade_dias,
    pd.valor
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
  AND cp.status = 'ativo';

-- 5. Se a tabela NÃO tiver tenant_id, buscar sem filtro de tenant
SELECT
    cp.*,
    pd.nome,
    pd.quantidade_projetos,
    pd.validade_dias,
    pd.valor
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
  AND cp.status = 'ativo';
