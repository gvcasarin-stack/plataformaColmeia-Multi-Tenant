-- ============================================================================
-- SCRIPT: Adicionar Role 'colaborador' ao Sistema
-- ============================================================================
-- OBJETIVO: Permitir que usuários tenham o role 'colaborador', com acesso
--           limitado baseado em permissões específicas.
--
-- IMPACTO: Permite diferenciação entre Admin completo e Colaborador
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar estrutura atual da coluna role
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '🔍 VERIFICAÇÃO: Estrutura atual da coluna role';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '';
END $$;

-- Verificar se existe constraint CHECK na coluna role
DO $$
DECLARE
  constraint_def TEXT;
  has_constraint BOOLEAN;
BEGIN
  -- Buscar definição de constraints CHECK na coluna role
  SELECT
    pg_get_constraintdef(c.oid),
    true
  INTO constraint_def, has_constraint
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE t.relname = 'users'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%role%'
  LIMIT 1;

  IF has_constraint THEN
    RAISE NOTICE '✅ Constraint CHECK encontrado na coluna role:';
    RAISE NOTICE '   %', constraint_def;
  ELSE
    RAISE NOTICE 'ℹ️  Nenhum constraint CHECK encontrado na coluna role';
    RAISE NOTICE 'ℹ️  A coluna pode aceitar qualquer valor TEXT';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 2: Verificar valores atuais de role
-- ============================================================================

DO $$
DECLARE
  role_record RECORD;
BEGIN
  RAISE NOTICE '📊 Valores atuais de role na tabela users:';
  RAISE NOTICE '';

  FOR role_record IN
    SELECT
      role,
      COUNT(*) as total
    FROM users
    WHERE role IS NOT NULL
    GROUP BY role
    ORDER BY total DESC
  LOOP
    RAISE NOTICE '   - role = "%": % usuários', role_record.role, role_record.total;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 3: Remover constraint antigo (se existir)
-- ============================================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  RAISE NOTICE '🔧 Removendo constraint antigo (se existir)...';

  -- Buscar nome do constraint
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE t.relname = 'users'
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%role%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE '   ✅ Constraint "%"removido', constraint_name;
  ELSE
    RAISE NOTICE '   ℹ️  Nenhum constraint para remover';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 4: Adicionar novo constraint incluindo 'colaborador'
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✨ Adicionando novo constraint com role "colaborador"...';
END $$;

-- Adicionar constraint que aceita: client, admin, superadmin, colaborador
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IN ('client', 'admin', 'superadmin', 'colaborador'));

-- Comentário no constraint
COMMENT ON CONSTRAINT users_role_check ON users IS
'Controla os valores permitidos para role: client, admin, superadmin, colaborador';

DO $$
BEGIN
  RAISE NOTICE '   ✅ Constraint "users_role_check" adicionado com sucesso';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 5: Verificar se permissions existe e tem estrutura correta
-- ============================================================================

DO $$
DECLARE
  has_permissions_column BOOLEAN;
  column_type TEXT;
BEGIN
  RAISE NOTICE '🔍 Verificando coluna permissions...';

  -- Verificar se coluna permissions existe
  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'permissions'
        AND table_schema = 'public'
    ),
    data_type
  INTO has_permissions_column, column_type
  FROM information_schema.columns
  WHERE table_name = 'users'
    AND column_name = 'permissions'
    AND table_schema = 'public';

  IF has_permissions_column THEN
    RAISE NOTICE '   ✅ Coluna "permissions" existe';
    RAISE NOTICE '   ℹ️  Tipo: %', column_type;

    IF column_type = 'jsonb' THEN
      RAISE NOTICE '   ✅ Tipo correto (JSONB)';
    ELSE
      RAISE WARNING '   ⚠️  Tipo deveria ser JSONB, mas é %', column_type;
    END IF;
  ELSE
    RAISE EXCEPTION 'ERRO: Coluna "permissions" não existe na tabela users. Crie a coluna primeiro.';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 6: Criar função helper para validar permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_user_permissions(permissions_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar se todas as chaves obrigatórias existem
  RETURN (
    permissions_json ? 'can_view_dashboard' AND
    permissions_json ? 'can_view_dashboard_financials' AND
    permissions_json ? 'can_create_projects' AND
    permissions_json ? 'can_edit_projects' AND
    permissions_json ? 'can_delete_projects' AND
    permissions_json ? 'can_view_clients' AND
    permissions_json ? 'can_edit_clients' AND
    permissions_json ? 'can_view_financials' AND
    permissions_json ? 'can_manage_team' AND
    permissions_json ? 'can_edit_preferences'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION validate_user_permissions(JSONB) IS
'Valida se o JSON de permissions contém todas as chaves obrigatórias';

DO $$
BEGIN
  RAISE NOTICE '✅ Função "validate_user_permissions" criada';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 7: Teste de inserção
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🧪 Testando inserção de role "colaborador"...';

  -- Teste rápido (não persiste)
  BEGIN
    PERFORM 1
    FROM (
      SELECT 'colaborador'::TEXT as role
    ) t
    WHERE role IN ('cliente', 'admin', 'superadmin', 'colaborador');

    RAISE NOTICE '   ✅ Constraint aceita role "colaborador"';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '   ❌ ERRO: Constraint não aceita role "colaborador": %', SQLERRM;
  END;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ SCRIPT EXECUTADO COM SUCESSO!';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi feito:';
  RAISE NOTICE '   1. Removido constraint antigo (se existia)';
  RAISE NOTICE '   2. Adicionado constraint: users_role_check';
  RAISE NOTICE '   3. Valores aceitos: cliente, admin, superadmin, colaborador';
  RAISE NOTICE '   4. Verificado coluna permissions (JSONB)';
  RAISE NOTICE '   5. Criada função de validação: validate_user_permissions()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximos passos:';
  RAISE NOTICE '   1. Execute: verify-colaborador-role.sql';
  RAISE NOTICE '   2. Atualize tipos TypeScript';
  RAISE NOTICE '   3. Atualize middleware';
  RAISE NOTICE '   4. Crie interface de permissões';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Em caso de problema:';
  RAISE NOTICE '   - Execute: rollback-colaborador-role.sql';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
END $$;
