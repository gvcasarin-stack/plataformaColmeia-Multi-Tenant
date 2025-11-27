-- ============================================================================
-- Script para adicionar campo de potência máxima (kWp) em pacotes e planos
-- ============================================================================
-- Autor: Claude
-- Data: 2025-11-25
-- Descrição: Adiciona campo potencia_maxima_kwp para limitar a potência máxima
--            dos projetos em pacotes e planos de assinatura.
--            NULL = ilimitado/sem limitação
-- ============================================================================

-- Adicionar campo potencia_maxima_kwp na tabela pacotes_definicoes
ALTER TABLE pacotes_definicoes
ADD COLUMN IF NOT EXISTS potencia_maxima_kwp DECIMAL(10,2);

COMMENT ON COLUMN pacotes_definicoes.potencia_maxima_kwp IS
'Potência máxima em kWp permitida para projetos deste pacote. NULL = ilimitado';

-- Adicionar campo potencia_maxima_kwp na tabela planos_assinatura
ALTER TABLE planos_assinatura
ADD COLUMN IF NOT EXISTS potencia_maxima_kwp DECIMAL(10,2);

COMMENT ON COLUMN planos_assinatura.potencia_maxima_kwp IS
'Potência máxima em kWp permitida para projetos deste plano. NULL = ilimitado';

-- ============================================================================
-- Verificação: Consultar estrutura das tabelas após alteração
-- ============================================================================

-- Verificar pacotes_definicoes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pacotes_definicoes'
  AND column_name = 'potencia_maxima_kwp';

-- Verificar planos_assinatura
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'planos_assinatura'
  AND column_name = 'potencia_maxima_kwp';

-- ============================================================================
-- Dados existentes: Todos os pacotes/planos criados anteriormente ficam como
-- ilimitados (potencia_maxima_kwp = NULL)
-- ============================================================================

-- Verificar pacotes existentes (devem ter potencia_maxima_kwp = NULL)
SELECT
    id,
    nome,
    quantidade_projetos,
    validade_dias,
    valor,
    potencia_maxima_kwp,
    CASE
        WHEN potencia_maxima_kwp IS NULL THEN 'Ilimitado'
        ELSE potencia_maxima_kwp::TEXT || ' kWp'
    END as potencia_display
FROM pacotes_definicoes
ORDER BY tenant_id, nome;

-- Verificar planos existentes (devem ter potencia_maxima_kwp = NULL)
SELECT
    id,
    nome,
    projetos_por_mes,
    valor_mensal,
    dia_renovacao,
    potencia_maxima_kwp,
    CASE
        WHEN potencia_maxima_kwp IS NULL THEN 'Ilimitado'
        ELSE potencia_maxima_kwp::TEXT || ' kWp'
    END as potencia_display
FROM planos_assinatura
ORDER BY tenant_id, nome;
