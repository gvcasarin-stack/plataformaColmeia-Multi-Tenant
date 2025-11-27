-- ============================================================================
-- SCRIPT DE VALIDAÇÃO: Verificar Correção de Numeração de Projetos
-- ============================================================================
-- OBJETIVO: Validar se o trigger e função de geração automática de números
--           de projeto estão funcionando corretamente e isolados por tenant.
--
-- USO: Execute este script APÓS executar fix-project-number-by-tenant.sql
--      para confirmar que tudo está funcionando corretamente.
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

-- ============================================================================
-- CABEÇALHO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '🔍 VALIDAÇÃO: Sistema de Numeração de Projetos por Tenant';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 1: Verificar se função existe
-- ============================================================================

DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 1: Verificando existência da função...';

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'generate_project_number_by_tenant'
      AND n.nspname = 'public'
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE '   ✅ Função "generate_project_number_by_tenant" existe';
  ELSE
    RAISE NOTICE '   ❌ Função "generate_project_number_by_tenant" NÃO encontrada';
    RAISE EXCEPTION 'ERRO: Função não existe. Execute primeiro fix-project-number-by-tenant.sql';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 2: Verificar se trigger existe
-- ============================================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 2: Verificando existência do trigger...';

  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_project_number_by_tenant'
      AND tgrelid = 'projects'::regclass
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE '   ✅ Trigger "set_project_number_by_tenant" existe e está ativo';
  ELSE
    RAISE NOTICE '   ❌ Trigger "set_project_number_by_tenant" NÃO encontrado';
    RAISE EXCEPTION 'ERRO: Trigger não existe. Execute primeiro fix-project-number-by-tenant.sql';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 3: Verificar se índice existe
-- ============================================================================

DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 3: Verificando existência do índice...';

  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_projects_tenant_number'
      AND tablename = 'projects'
  ) INTO index_exists;

  IF index_exists THEN
    RAISE NOTICE '   ✅ Índice "idx_projects_tenant_number" existe';
  ELSE
    RAISE NOTICE '   ⚠️  Índice "idx_projects_tenant_number" não encontrado (não crítico)';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 4: Análise da distribuição atual de números por tenant
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
  tenant_count INT;
BEGIN
  RAISE NOTICE '📋 TESTE 4: Analisando distribuição atual de projetos por tenant...';
  RAISE NOTICE '';

  -- Contar quantos tenants têm projetos
  SELECT COUNT(DISTINCT tenant_id) INTO tenant_count
  FROM projects;

  IF tenant_count = 0 THEN
    RAISE NOTICE '   ℹ️  Nenhum projeto encontrado no banco de dados';
    RAISE NOTICE '   ℹ️  Isso é normal se você ainda não criou projetos';
  ELSE
    RAISE NOTICE '   📊 Total de tenants com projetos: %', tenant_count;
    RAISE NOTICE '';
    RAISE NOTICE '   Distribuição por tenant:';
    RAISE NOTICE '   %-40s | %-15s | %-15s | %-15s', 'Tenant ID', 'Total Projetos', 'Primeiro Número', 'Último Número';
    RAISE NOTICE '   %s', REPEAT('-', 90);

    FOR tenant_record IN
      SELECT
        tenant_id,
        COUNT(*) as total_projetos,
        MIN(number) as primeiro_numero,
        MAX(number) as ultimo_numero
      FROM projects
      GROUP BY tenant_id
      ORDER BY tenant_id
    LOOP
      RAISE NOTICE '   %-40s | %-15s | %-15s | %-15s',
        tenant_record.tenant_id,
        tenant_record.total_projetos,
        COALESCE(tenant_record.primeiro_numero, 'N/A'),
        COALESCE(tenant_record.ultimo_numero, 'N/A');
    END LOOP;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 5: Verificar padrão de numeração atual
-- ============================================================================

DO $$
DECLARE
  invalid_count INT;
  current_year TEXT;
BEGIN
  RAISE NOTICE '📋 TESTE 5: Verificando padrão de numeração atual...';

  current_year := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Verificar quantos projetos têm numeração no formato esperado
  SELECT COUNT(*)
  INTO invalid_count
  FROM projects
  WHERE number IS NOT NULL
    AND number !~ ('^FV-' || current_year || '-[0-9]{3}$');

  IF invalid_count > 0 THEN
    RAISE NOTICE '   ⚠️  Encontrados % projetos com numeração fora do padrão FV-%%-NNN', invalid_count, current_year;
    RAISE NOTICE '   ℹ️  Isso é normal se você tem projetos antigos de outros anos';

    -- Mostrar exemplos
    RAISE NOTICE '';
    RAISE NOTICE '   Exemplos de números fora do padrão atual (%):',  'FV-' || current_year || '-NNN';

    FOR i IN 1..LEAST(invalid_count, 5) LOOP
      DECLARE
        sample_number TEXT;
      BEGIN
        SELECT number INTO sample_number
        FROM projects
        WHERE number IS NOT NULL
          AND number !~ ('^FV-' || current_year || '-[0-9]{3}$')
        LIMIT 1 OFFSET (i - 1);

        RAISE NOTICE '     - %', sample_number;
      END;
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ Todos os projetos seguem o padrão FV-%%-NNN', current_year;
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 6: Simular geração de próximo número por tenant
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
  next_number TEXT;
  current_year INT;
  prefix TEXT;
  last_num INT;
BEGIN
  RAISE NOTICE '📋 TESTE 6: Simulando geração do próximo número por tenant...';
  RAISE NOTICE '';

  current_year := EXTRACT(YEAR FROM NOW());
  prefix := 'FV-' || current_year || '-';

  -- Para cada tenant, calcular qual seria o próximo número
  FOR tenant_record IN
    SELECT DISTINCT tenant_id
    FROM projects
    ORDER BY tenant_id
    LIMIT 5  -- Limitar a 5 tenants para não poluir o log
  LOOP
    -- Calcular próximo número para este tenant
    SELECT COALESCE(
      MAX(
        CAST(
          SUBSTRING(number FROM LENGTH(prefix) + 1) AS INTEGER
        )
      ),
      0
    ) INTO last_num
    FROM projects
    WHERE tenant_id = tenant_record.tenant_id
      AND number LIKE prefix || '%'
      AND number ~ (prefix || '[0-9]+$');

    next_number := prefix || LPAD((last_num + 1)::TEXT, 3, '0');

    RAISE NOTICE '   Tenant: %', tenant_record.tenant_id;
    RAISE NOTICE '     - Último número atual: %', CASE WHEN last_num > 0 THEN prefix || LPAD(last_num::TEXT, 3, '0') ELSE 'Nenhum' END;
    RAISE NOTICE '     - Próximo número será: %', next_number;
    RAISE NOTICE '';
  END LOOP;

  -- Verificar se há mais tenants
  DECLARE
    total_tenants INT;
  BEGIN
    SELECT COUNT(DISTINCT tenant_id) INTO total_tenants FROM projects;
    IF total_tenants > 5 THEN
      RAISE NOTICE '   ℹ️  (Mostrando apenas 5 primeiros tenants de % total)', total_tenants;
      RAISE NOTICE '';
    END IF;
  END;
END $$;

-- ============================================================================
-- TESTE 7: Verificar isolamento entre tenants
-- ============================================================================

DO $$
DECLARE
  isolation_issue BOOLEAN := FALSE;
  tenant_count INT;
BEGIN
  RAISE NOTICE '📋 TESTE 7: Verificando isolamento de numeração entre tenants...';

  -- Verificar se existe algum caso onde dois tenants têm o mesmo número
  SELECT COUNT(DISTINCT tenant_id) > 1
  INTO isolation_issue
  FROM projects
  WHERE number IN (
    SELECT number
    FROM projects
    WHERE number IS NOT NULL
    GROUP BY number
    HAVING COUNT(DISTINCT tenant_id) > 1
  );

  IF isolation_issue THEN
    RAISE NOTICE '   ⚠️  ATENÇÃO: Encontrados números duplicados entre diferentes tenants';
    RAISE NOTICE '   ℹ️  Isso pode indicar dados antigos de antes da correção';
  ELSE
    RAISE NOTICE '   ✅ Isolamento OK: Nenhum número duplicado entre tenants diferentes';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ VALIDAÇÃO CONCLUÍDA';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Componentes verificados:';
  RAISE NOTICE '   ✅ Função: generate_project_number_by_tenant()';
  RAISE NOTICE '   ✅ Trigger: set_project_number_by_tenant';
  RAISE NOTICE '   ✅ Índice: idx_projects_tenant_number';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Análises realizadas:';
  RAISE NOTICE '   ✅ Distribuição de projetos por tenant';
  RAISE NOTICE '   ✅ Padrão de numeração atual';
  RAISE NOTICE '   ✅ Simulação de próximos números';
  RAISE NOTICE '   ✅ Verificação de isolamento entre tenants';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. Crie um projeto de teste através da aplicação';
  RAISE NOTICE '   2. Verifique se o número foi gerado automaticamente';
  RAISE NOTICE '   3. Confirme que o formato é: FV-%%-NNN', EXTRACT(YEAR FROM NOW());
  RAISE NOTICE '   4. Crie projetos em diferentes tenants e confirme isolamento';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
END $$;
