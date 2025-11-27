-- =====================================================
-- Script: Corrigir ordem e adicionar status faltantes
-- no funil de vendas (opportunity_statuses)
-- =====================================================
-- IMPORTANTE: Este script atualiza os status do funil
-- de vendas para incluir "Novo Lead" e "Qualificação"
-- e corrige a ordem para:
-- 0. Novo Lead
-- 1. Qualificação
-- 2. Proposta Enviada
-- 3. Negociação
-- 4. Ganho
-- 5. Perdido
-- =====================================================

-- PASSO 1: Verificar tenant_id atual (substitua pelo seu tenant_id)
-- SELECT id, slug FROM organizations LIMIT 5;

-- IMPORTANTE: Substitua 'SEU_TENANT_ID_AQUI' pelo tenant_id correto
DO $$
DECLARE
    v_tenant_id UUID := '061ff77b-8b3a-4732-9158-a574c1f1690a'; -- ⚠️ AJUSTE AQUI
    v_novo_lead_exists BOOLEAN;
    v_qualificacao_exists BOOLEAN;
    v_novo_lead_id UUID;
    v_qualificacao_id UUID;
BEGIN
    -- Verificar se "Novo Lead" já existe
    SELECT id INTO v_novo_lead_id
    FROM opportunity_statuses
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'novo lead';

    v_novo_lead_exists := v_novo_lead_id IS NOT NULL;

    -- Verificar se "Qualificação" já existe
    SELECT id INTO v_qualificacao_id
    FROM opportunity_statuses
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'qualificação';

    v_qualificacao_exists := v_qualificacao_id IS NOT NULL;

    -- PASSO 1: Mover todos os status existentes para posições temporárias (1000+)
    -- Isso evita conflitos com a constraint unique_status_position_per_tenant
    UPDATE opportunity_statuses
    SET position = position + 1000, updated_at = NOW()
    WHERE tenant_id = v_tenant_id;

    RAISE NOTICE 'Status movidos para posições temporárias';

    -- PASSO 2: Inserir "Novo Lead" se não existir
    IF NOT v_novo_lead_exists THEN
        INSERT INTO opportunity_statuses (
            tenant_id,
            name,
            color,
            position,
            is_default,
            is_final,
            is_won,
            is_lost,
            created_at,
            updated_at
        ) VALUES (
            v_tenant_id,
            'Novo Lead',
            '#10B981', -- Verde
            0,
            false,
            false,
            false,
            false,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_novo_lead_id;

        RAISE NOTICE 'Status "Novo Lead" criado com sucesso';
    ELSE
        RAISE NOTICE 'Status "Novo Lead" já existe, pulando criação';
    END IF;

    -- PASSO 3: Inserir "Qualificação" se não existir
    IF NOT v_qualificacao_exists THEN
        INSERT INTO opportunity_statuses (
            tenant_id,
            name,
            color,
            position,
            is_default,
            is_final,
            is_won,
            is_lost,
            created_at,
            updated_at
        ) VALUES (
            v_tenant_id,
            'Qualificação',
            '#3B82F6', -- Azul
            1,
            false,
            false,
            false,
            false,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_qualificacao_id;

        RAISE NOTICE 'Status "Qualificação" criado com sucesso';
    ELSE
        RAISE NOTICE 'Status "Qualificação" já existe, pulando criação';
    END IF;

    -- PASSO 4: Atualizar posições dos status existentes na ordem correta
    -- Ordem correta: Novo Lead (0), Qualificação (1), Proposta Enviada (2),
    --                Negociação (3), Ganho (4), Perdido (5)

    -- Novo Lead -> position 0
    UPDATE opportunity_statuses
    SET position = 0, updated_at = NOW()
    WHERE id = v_novo_lead_id;

    -- Qualificação -> position 1
    UPDATE opportunity_statuses
    SET position = 1, updated_at = NOW()
    WHERE id = v_qualificacao_id;

    -- Proposta Enviada -> position 2
    UPDATE opportunity_statuses
    SET position = 2, updated_at = NOW()
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'proposta enviada';

    -- Negociação -> position 3
    UPDATE opportunity_statuses
    SET position = 3, updated_at = NOW()
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'negociação';

    -- Ganho -> position 4
    UPDATE opportunity_statuses
    SET position = 4, updated_at = NOW()
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'ganho';

    -- Perdido -> position 5
    UPDATE opportunity_statuses
    SET position = 5, updated_at = NOW()
    WHERE tenant_id = v_tenant_id
    AND LOWER(name) = 'perdido';

    RAISE NOTICE 'Posições atualizadas com sucesso';

END $$;

-- PASSO 5: Verificar resultado final
SELECT
    name,
    color,
    position,
    is_won,
    is_lost,
    created_at
FROM opportunity_statuses
WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY position ASC;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- position | name              | color
-- ---------+-------------------+---------
--    0     | Novo Lead         | #10B981
--    1     | Qualificação      | #3B82F6
--    2     | Proposta Enviada  | #8B5CF6
--    3     | Negociação        | #F59E0B
--    4     | Ganho             | #22C55E
--    5     | Perdido           | #EF4444
-- =====================================================
