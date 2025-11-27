-- ============================================================================
-- SCRIPT DE ROLLBACK: Remover Role 'colaborador'
-- ============================================================================
-- OBJETIVO: Reverter alterações do script add-colaborador-role.sql
--
-- ⚠️ ATENÇÃO: Use apenas se necessário reverter as alterações
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '⚠️  ATENÇÃO: SCRIPT DE ROLLBACK';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '   Este script irá:';
  RAISE NOTICE '   1. Remover constraint users_role_check';
  RAISE NOTICE '   2. Recriar constraint SEM "colaborador"';
  RAISE NOTICE '   3. Remover função validate_user_permissions';
  RAISE NOTICE '';
  RAISE NOTICE '   ⚠️  USUÁRIOS COM ROLE "colaborador" FICARÃO INVÁLIDOS';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  ============================================================================';
  RAISE NOTICE '';
END $$;

-- Verificar se existem usuários com role colaborador
DO $$
DECLARE
  colaborador_count INT;
BEGIN
  SELECT COUNT(*) INTO colaborador_count
  FROM users
  WHERE role = 'colaborador';

  IF colaborador_count > 0 THEN
    RAISE WARNING '⚠️  ATENÇÃO: Existem % usuários com role "colaborador"', colaborador_count;
    RAISE WARNING '⚠️  Estes usuários ficarão com role inválido após o rollback';
    RAISE NOTICE '';
  END IF;
END $$;

-- Remover constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
RAISE NOTICE '✅ Constraint users_role_check removido';

-- Recriar constraint SEM colaborador
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('client', 'admin', 'superadmin'));

RAISE NOTICE '✅ Constraint recriado sem "colaborador"';

-- Remover função
DROP FUNCTION IF EXISTS validate_user_permissions(JSONB);
RAISE NOTICE '✅ Função validate_user_permissions removida';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ROLLBACK CONCLUÍDO';
  RAISE NOTICE '';
END $$;
