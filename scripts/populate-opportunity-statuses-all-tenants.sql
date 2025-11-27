-- =====================================================
-- Script: Popular status do funil de vendas para TODOS
-- os tenants que ainda não possuem status configurados
-- =====================================================
-- IMPORTANTE: Este script cria automaticamente os status
-- padrão do funil de vendas para tenants que não têm
-- nenhum status configurado ainda.
-- =====================================================

DO $$
DECLARE
    tenant_record RECORD;
    v_status_count INTEGER;
BEGIN
    -- Loop por todos os tenants
    FOR tenant_record IN (SELECT id, slug FROM organizations)
    LOOP
        -- Verificar quantos status o tenant já possui
        SELECT COUNT(*) INTO v_status_count
        FROM opportunity_statuses
        WHERE tenant_id = tenant_record.id;

        -- Se o tenant não tem nenhum status, criar os padrões
        IF v_status_count = 0 THEN
            RAISE NOTICE 'Criando status padrão para tenant: % (ID: %)', tenant_record.slug, tenant_record.id;

            -- Criar os 6 status padrão
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
            ) VALUES
            -- 0. Novo Lead
            (
                tenant_record.id,
                'Novo Lead',
                '#10B981', -- Verde
                0,
                false,
                false,
                false,
                false,
                NOW(),
                NOW()
            ),
            -- 1. Qualificação
            (
                tenant_record.id,
                'Qualificação',
                '#3B82F6', -- Azul
                1,
                false,
                false,
                false,
                false,
                NOW(),
                NOW()
            ),
            -- 2. Proposta Enviada
            (
                tenant_record.id,
                'Proposta Enviada',
                '#8B5CF6', -- Roxo
                2,
                false,
                false,
                false,
                false,
                NOW(),
                NOW()
            ),
            -- 3. Negociação
            (
                tenant_record.id,
                'Negociação',
                '#F59E0B', -- Laranja
                3,
                false,
                false,
                false,
                false,
                NOW(),
                NOW()
            ),
            -- 4. Ganho
            (
                tenant_record.id,
                'Ganho',
                '#22C55E', -- Verde escuro
                4,
                false,
                false,
                true, -- ✅ Marca como "ganho"
                false,
                NOW(),
                NOW()
            ),
            -- 5. Perdido
            (
                tenant_record.id,
                'Perdido',
                '#EF4444', -- Vermelho
                5,
                false,
                false,
                false,
                true, -- ✅ Marca como "perdido"
                NOW(),
                NOW()
            );

            RAISE NOTICE 'Status criados com sucesso para tenant: %', tenant_record.slug;
        ELSE
            RAISE NOTICE 'Tenant % já possui % status configurados, pulando...', tenant_record.slug, v_status_count;
        END IF;
    END LOOP;

    RAISE NOTICE 'Processo concluído!';
END $$;

-- Verificar resultado final para todos os tenants
SELECT
    o.slug AS tenant_slug,
    os.name AS status_name,
    os.position,
    os.color,
    os.is_won,
    os.is_lost
FROM opportunity_statuses os
INNER JOIN organizations o ON os.tenant_id = o.id
ORDER BY o.slug, os.position;
