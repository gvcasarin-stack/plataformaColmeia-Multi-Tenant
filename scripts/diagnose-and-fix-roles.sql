-- ============================================================================
-- SCRIPT: Diagnosticar e Corrigir Roles Inválidos
-- ============================================================================
-- OBJETIVO: Identificar e corrigir valores de role que não estão no padrão
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '🔍 DIAGNÓSTICO: Verificando roles existentes';
  RAISE NOTICE '🔍 ============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 1: Listar todos os valores de role existentes
-- ============================================================================

DO $$
DECLARE
  role_record RECORD;
  total_users INT;
BEGIN
  RAISE NOTICE '📊 Valores atuais de role na tabela users:';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO total_users FROM users;
  RAISE NOTICE '   Total de usuários: %', total_users;
  RAISE NOTICE '';

  FOR role_record IN
    SELECT
      COALESCE(role, 'NULL') as role_value,
      COUNT(*) as total,
      array_agg(id ORDER BY created_at LIMIT 3) as sample_ids
    FROM users
    GROUP BY role
    ORDER BY total DESC
  LOOP
    RAISE NOTICE '   Role: "%" - % usuários', role_record.role_value, role_record.total;
    RAISE NOTICE '      Sample IDs: %', role_record.sample_ids;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 2: Identificar roles que NÃO estão no padrão
-- ============================================================================

DO $$
DECLARE
  invalid_count INT;
  role_record RECORD;
BEGIN
  RAISE NOTICE '⚠️  Identificando roles INVÁLIDOS (fora do padrão):';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO invalid_count
  FROM users
  WHERE role NOT IN ('cliente', 'admin', 'superadmin', 'colaborador')
     OR role IS NULL;

  IF invalid_count > 0 THEN
    RAISE NOTICE '   ❌ Encontrados % usuários com role inválido', invalid_count;
    RAISE NOTICE '';

    FOR role_record IN
      SELECT
        COALESCE(role, 'NULL') as role_value,
        COUNT(*) as total,
        array_agg(email ORDER BY created_at LIMIT 5) as sample_emails
      FROM users
      WHERE role NOT IN ('cliente', 'admin', 'superadmin', 'colaborador')
         OR role IS NULL
      GROUP BY role
      ORDER BY total DESC
    LOOP
      RAISE NOTICE '   Role inválido: "%"', role_record.role_value;
      RAISE NOTICE '      Quantidade: %', role_record.total;
      RAISE NOTICE '      Emails exemplo: %', role_record.sample_emails;
      RAISE NOTICE '';
    END LOOP;
  ELSE
    RAISE NOTICE '   ✅ Todos os roles estão corretos!';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================================================
-- PASSO 3: Sugestão de correção automática
-- ============================================================================

DO $$
DECLARE
  invalid_count INT;
BEGIN
  RAISE NOTICE '🔧 ============================================================================';
  RAISE NOTICE '🔧 SUGESTÕES DE CORREÇÃO';
  RAISE NOTICE '🔧 ============================================================================';
  RAISE NOTICE '';

  SELECT COUNT(*) INTO invalid_count
  FROM users
  WHERE role NOT IN ('cliente', 'admin', 'superadmin', 'colaborador')
     OR role IS NULL;

  IF invalid_count > 0 THEN
    RAISE NOTICE '📋 Escolha UMA das opções abaixo:';
    RAISE NOTICE '';
    RAISE NOTICE '   OPÇÃO 1 - Correção Automática Conservadora:';
    RAISE NOTICE '   ----------------------------------------';
    RAISE NOTICE '   • Converte role NULL → "cliente"';
    RAISE NOTICE '   • Mantém roles válidos existentes';
    RAISE NOTICE '   • Roles desconhecidos → "cliente" (pode revisar depois)';
    RAISE NOTICE '';
    RAISE NOTICE '   Execute a próxima seção deste script (CORREÇÃO AUTOMÁTICA)';
    RAISE NOTICE '';
    RAISE NOTICE '   OPÇÃO 2 - Correção Manual:';
    RAISE NOTICE '   --------------------------';
    RAISE NOTICE '   • Revise cada usuário individualmente';
    RAISE NOTICE '   • Corrija manualmente via UPDATE';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '   ✅ Nenhuma correção necessária!';
    RAISE NOTICE '   ✅ Pode prosseguir com add-colaborador-role.sql';
    RAISE NOTICE '';
  END IF;
END $$;

-- ============================================================================
-- PASSO 4: CORREÇÃO AUTOMÁTICA (DESCOMENTE PARA EXECUTAR)
-- ============================================================================
-- ⚠️  ATENÇÃO: Revise os resultados do diagnóstico acima antes de descomentar!
-- ⚠️  Esta seção corrige automaticamente roles inválidos
-- ============================================================================

/*
DO $$
DECLARE
  updated_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Aplicando correção automática...';
  RAISE NOTICE '';

  -- Corrigir role NULL → cliente
  UPDATE users
  SET role = 'cliente',
      updated_at = NOW()
  WHERE role IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Corrigidos % usuários com role NULL → "cliente"', updated_count;

  -- Corrigir roles desconhecidos → cliente (exceto admin, superadmin, colaborador)
  UPDATE users
  SET role = 'cliente',
      updated_at = NOW()
  WHERE role NOT IN ('cliente', 'admin', 'superadmin', 'colaborador');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Corrigidos % usuários com role desconhecido → "cliente"', updated_count;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Correção concluída!';
  RAISE NOTICE '✅ Agora você pode executar: add-colaborador-role.sql';
  RAISE NOTICE '';
END $$;
*/

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ DIAGNÓSTICO CONCLUÍDO';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Revise os roles inválidos identificados acima';
  RAISE NOTICE '   2. Escolha entre correção automática ou manual';
  RAISE NOTICE '   3. Se automática: descomente PASSO 4 e execute novamente';
  RAISE NOTICE '   4. Se manual: corrija via UPDATE conforme necessário';
  RAISE NOTICE '   5. Execute novamente este script para confirmar';
  RAISE NOTICE '   6. Depois execute: add-colaborador-role.sql';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
END $$;
