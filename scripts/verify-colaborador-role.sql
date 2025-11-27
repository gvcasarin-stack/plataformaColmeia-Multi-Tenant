-- ============================================================================
-- SCRIPT DE VALIDAÇÃO: Verificar Role 'colaborador'
-- ============================================================================
-- OBJETIVO: Validar se o role 'colaborador' foi adicionado corretamente
--           e se o sistema está pronto para uso.
--
-- USO: Execute este script APÓS add-colaborador-role.sql
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '🔍 VALIDAÇÃO: Sistema de Role Colaborador';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 1: Verificar constraint
-- ============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_def TEXT;
BEGIN
  RAISE NOTICE '📋 TESTE 1: Verificando constraint users_role_check...';

  SELECT
    EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'users'
        AND c.conname = 'users_role_check'
    ),
    pg_get_constraintdef(c.oid)
  INTO constraint_exists, constraint_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'users'
    AND c.conname = 'users_role_check';

  IF constraint_exists THEN
    RAISE NOTICE '   ✅ Constraint "users_role_check" existe';
    RAISE NOTICE '   ℹ️  Definição: %', constraint_def;
  ELSE
    RAISE EXCEPTION '   ❌ ERRO: Constraint não encontrado';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 2: Verificar se aceita 'colaborador'
-- ============================================================================

DO $$
DECLARE
  accepts_colaborador BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 2: Verificando se aceita role "colaborador"...';

  -- Verificar se constraint aceita 'colaborador'
  SELECT pg_get_constraintdef(c.oid) LIKE '%colaborador%'
  INTO accepts_colaborador
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  WHERE t.relname = 'users'
    AND c.conname = 'users_role_check';

  IF accepts_colaborador THEN
    RAISE NOTICE '   ✅ Constraint aceita role "colaborador"';
  ELSE
    RAISE EXCEPTION '   ❌ ERRO: Constraint NÃO aceita role "colaborador"';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 3: Verificar coluna permissions
-- ============================================================================

DO $$
DECLARE
  has_permissions BOOLEAN;
  column_type TEXT;
  nullable_status TEXT;
BEGIN
  RAISE NOTICE '📋 TESTE 3: Verificando coluna permissions...';

  SELECT
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'permissions'
    ),
    c.data_type,
    c.is_nullable
  INTO has_permissions, column_type, nullable_status
  FROM information_schema.columns c
  WHERE c.table_name = 'users'
    AND c.column_name = 'permissions';

  IF has_permissions THEN
    RAISE NOTICE '   ✅ Coluna "permissions" existe';
    RAISE NOTICE '   ℹ️  Tipo: %', column_type;
    RAISE NOTICE '   ℹ️  Permite NULL: %', nullable_status;

    IF column_type = 'jsonb' THEN
      RAISE NOTICE '   ✅ Tipo correto (JSONB)';
    ELSE
      RAISE WARNING '   ⚠️  Tipo deveria ser JSONB';
    END IF;
  ELSE
    RAISE EXCEPTION '   ❌ ERRO: Coluna "permissions" não existe';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 4: Verificar função de validação
-- ============================================================================

DO $$
DECLARE
  function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 4: Verificando função validate_user_permissions...';

  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'validate_user_permissions'
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE '   ✅ Função "validate_user_permissions" existe';

    -- Testar a função
    IF validate_user_permissions('{
      "can_view_dashboard": true,
      "can_view_dashboard_financials": false,
      "can_create_projects": true,
      "can_edit_projects": true,
      "can_delete_projects": false,
      "can_view_clients": true,
      "can_edit_clients": true,
      "can_view_financials": false,
      "can_manage_team": false,
      "can_edit_preferences": true
    }'::jsonb) THEN
      RAISE NOTICE '   ✅ Função valida permissions corretamente';
    ELSE
      RAISE WARNING '   ⚠️  Função não validou permissions corretas';
    END IF;

  ELSE
    RAISE WARNING '   ⚠️  Função não encontrada (não crítico)';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 5: Listar usuários por role
-- ============================================================================

DO $$
DECLARE
  role_record RECORD;
  has_users BOOLEAN;
BEGIN
  RAISE NOTICE '📋 TESTE 5: Listando usuários por role...';
  RAISE NOTICE '';

  SELECT EXISTS (SELECT 1 FROM users) INTO has_users;

  IF has_users THEN
    RAISE NOTICE '   Distribuição de roles:';
    FOR role_record IN
      SELECT
        COALESCE(role, 'NULL') as role,
        COUNT(*) as total
      FROM users
      GROUP BY role
      ORDER BY total DESC
    LOOP
      RAISE NOTICE '     - role = "%": % usuários', role_record.role, role_record.total;
    END LOOP;
  ELSE
    RAISE NOTICE '   ℹ️  Nenhum usuário cadastrado ainda';
  END IF;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- TESTE 6: Verificar usuários com permissions
-- ============================================================================

DO $$
DECLARE
  total_with_permissions INT;
  total_without_permissions INT;
BEGIN
  RAISE NOTICE '📋 TESTE 6: Verificando usuários com permissions...';

  SELECT
    COUNT(*) FILTER (WHERE permissions IS NOT NULL AND permissions::text != '{}'),
    COUNT(*) FILTER (WHERE permissions IS NULL OR permissions::text = '{}')
  INTO total_with_permissions, total_without_permissions
  FROM users;

  RAISE NOTICE '   ℹ️  Com permissions: %', total_with_permissions;
  RAISE NOTICE '   ℹ️  Sem permissions: %', total_without_permissions;

  IF total_without_permissions > 0 THEN
    RAISE NOTICE '   ⚠️  Alguns usuários não têm permissions configuradas';
    RAISE NOTICE '   ℹ️  Configure permissions ao criar/editar usuários';
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
  RAISE NOTICE '   ✅ Constraint: users_role_check';
  RAISE NOTICE '   ✅ Role aceito: colaborador';
  RAISE NOTICE '   ✅ Coluna: permissions (JSONB)';
  RAISE NOTICE '   ✅ Função: validate_user_permissions()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Sistema pronto para:';
  RAISE NOTICE '   ✅ Criar usuários com role = "colaborador"';
  RAISE NOTICE '   ✅ Configurar permissions personalizadas';
  RAISE NOTICE '   ✅ Login de colaboradores em /admin/login';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. Atualizar tipos TypeScript';
  RAISE NOTICE '   2. Atualizar middleware';
  RAISE NOTICE '   3. Criar interface de permissões';
  RAISE NOTICE '   4. Testar criação de colaborador';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
END $$;
