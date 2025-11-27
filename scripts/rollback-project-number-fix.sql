-- ============================================================================
-- SCRIPT DE ROLLBACK: Reverter Correção de Numeração de Projetos
-- ============================================================================
-- OBJETIVO: Reverter as alterações feitas pelo script fix-project-number-by-tenant.sql
--           em caso de problemas ou necessidade de voltar ao estado anterior.
--
-- ⚠️ ATENÇÃO: Este script remove o trigger e a função de geração automática
--            de números de projeto. Use apenas se necessário.
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

-- ============================================================================
-- CONFIRMAÇÃO DE SEGURANÇA
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '⚠️  ATENÇÃO: SCRIPT DE ROLLBACK';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '   Este script irá:';
  RAISE NOTICE '   1. Remover o trigger set_project_number_by_tenant';
  RAISE NOTICE '   2. Remover a função generate_project_number_by_tenant()';
  RAISE NOTICE '   3. MANTER o índice idx_projects_tenant_number (pode ser útil)';
  RAISE NOTICE '';
  RAISE NOTICE '   ❌ PROJETOS EXISTENTES NÃO SERÃO AFETADOS';
  RAISE NOTICE '   ⚠️  NOVOS PROJETOS NÃO TERÃO NÚMERO GERADO AUTOMATICAMENTE';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '';

  -- Pequena pausa para leitura
  PERFORM pg_sleep(1);
END $$;

-- ============================================================================
-- PASSO 1: Remover Trigger
-- ============================================================================

DO $$
BEGIN
  -- Verificar se trigger existe
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_project_number_by_tenant'
  ) THEN
    -- Remover trigger
    DROP TRIGGER set_project_number_by_tenant ON projects;
    RAISE NOTICE '✅ Trigger "set_project_number_by_tenant" removido com sucesso';
  ELSE
    RAISE NOTICE 'ℹ️  Trigger "set_project_number_by_tenant" não existe (já foi removido?)';
  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Remover Função
-- ============================================================================

DO $$
BEGIN
  -- Verificar se função existe
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'generate_project_number_by_tenant'
  ) THEN
    -- Remover função
    DROP FUNCTION generate_project_number_by_tenant();
    RAISE NOTICE '✅ Função "generate_project_number_by_tenant()" removida com sucesso';
  ELSE
    RAISE NOTICE 'ℹ️  Função "generate_project_number_by_tenant()" não existe (já foi removida?)';
  END IF;
END $$;

-- ============================================================================
-- PASSO 3: Índice (OPCIONAL - Comentado por padrão)
-- ============================================================================

-- DESCOMENTE as linhas abaixo APENAS se desejar remover o índice também
-- O índice pode ser útil para performance mesmo sem o trigger

/*
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_projects_tenant_number'
  ) THEN
    DROP INDEX idx_projects_tenant_number;
    RAISE NOTICE '✅ Índice "idx_projects_tenant_number" removido';
  ELSE
    RAISE NOTICE 'ℹ️  Índice "idx_projects_tenant_number" não existe';
  END IF;
END $$;
*/

RAISE NOTICE 'ℹ️  Índice "idx_projects_tenant_number" foi mantido (pode ser útil para performance)';
RAISE NOTICE 'ℹ️  Para removê-lo, descomente o bloco no script e execute novamente';

-- ============================================================================
-- PASSO 4: Verificação Final
-- ============================================================================

DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Verificar se trigger ainda existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'set_project_number_by_tenant'
  ) INTO trigger_exists;

  -- Verificar se função ainda existe
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'generate_project_number_by_tenant'
  ) INTO function_exists;

  -- Exibir resultado
  RAISE NOTICE '';
  RAISE NOTICE '📋 Verificação Final:';
  RAISE NOTICE '   - Trigger removido: %', CASE WHEN NOT trigger_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '   - Função removida: %', CASE WHEN NOT function_exists THEN '✅ SIM' ELSE '❌ NÃO' END;
  RAISE NOTICE '';

  IF trigger_exists OR function_exists THEN
    RAISE EXCEPTION 'ERRO: Alguns componentes não foram removidos. Verifique as permissões.';
  END IF;
END $$;

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ ROLLBACK EXECUTADO COM SUCESSO!';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi removido:';
  RAISE NOTICE '   ✅ Trigger: set_project_number_by_tenant';
  RAISE NOTICE '   ✅ Função: generate_project_number_by_tenant()';
  RAISE NOTICE '   ℹ️  Índice: idx_projects_tenant_number (mantido)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Estado atual:';
  RAISE NOTICE '   - Projetos existentes: não afetados';
  RAISE NOTICE '   - Novos projetos: número deve ser fornecido manualmente no código';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. Se necessário, implemente geração de número no código da aplicação';
  RAISE NOTICE '   2. Ou execute novamente fix-project-number-by-tenant.sql para restaurar';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
END $$;
