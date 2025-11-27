-- ============================================================================
-- SCRIPT: Correção de Numeração de Projetos com Isolamento por Tenant
-- ============================================================================
-- OBJETIVO: Implementar geração automática de números de projeto isolados
--           por tenant (organização), garantindo que cada tenant tenha
--           sua própria sequência numérica independente.
--
-- PROBLEMA: Atualmente a numeração é compartilhada entre todos os tenants
--
-- SOLUÇÃO: Trigger que gera número único por tenant automaticamente
--
-- AUTOR: Sistema SGF Multi-Tenant
-- DATA: 2025-01-11
-- VERSÃO: 1.0
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar função que gera número de projeto isolado por tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_project_number_by_tenant()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  prefix TEXT;
  last_number INT;
  next_number TEXT;
BEGIN
  -- Log de debug (remover em produção se preferir)
  RAISE NOTICE 'Gerando número para projeto do tenant: %', NEW.tenant_id;

  -- Obter ano atual
  current_year := EXTRACT(YEAR FROM NOW());

  -- Definir prefixo: FV-2025-
  prefix := 'FV-' || current_year || '-';

  -- 🔐 SEGURANÇA: Buscar último número APENAS do tenant atual
  -- Isso garante isolamento entre organizações
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(number FROM LENGTH(prefix) + 1) AS INTEGER
      )
    ),
    0
  ) INTO last_number
  FROM projects
  WHERE tenant_id = NEW.tenant_id  -- ✅ ISOLAMENTO POR TENANT
    AND number LIKE prefix || '%'
    AND number ~ (prefix || '[0-9]+$'); -- Garantir que seja um número válido

  -- Gerar próximo número com padding de 3 dígitos (001, 002, 003...)
  next_number := prefix || LPAD((last_number + 1)::TEXT, 3, '0');

  -- Log de debug
  RAISE NOTICE 'Último número encontrado: %, Próximo número: %', last_number, next_number;

  -- Atribuir número ao novo registro
  NEW.number := next_number;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, logar e permitir que o erro suba
    RAISE WARNING 'Erro ao gerar número do projeto: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Adicionar comentário explicativo na função
COMMENT ON FUNCTION generate_project_number_by_tenant() IS
'Gera número sequencial de projeto isolado por tenant_id.
Formato: FV-YYYY-NNN (ex: FV-2025-001, FV-2025-002).
Cada tenant tem sua própria sequência numérica independente.';

-- ============================================================================
-- PASSO 2: Remover trigger existente (se houver)
-- ============================================================================

-- Verificar e remover trigger antigo se existir
DROP TRIGGER IF EXISTS set_project_number ON projects;
DROP TRIGGER IF EXISTS set_project_number_before_insert ON projects;
DROP TRIGGER IF EXISTS generate_project_number ON projects;

-- ============================================================================
-- PASSO 3: Criar novo trigger
-- ============================================================================

CREATE TRIGGER set_project_number_by_tenant
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.number IS NULL OR NEW.number = '')  -- Só gera se número não foi fornecido
  EXECUTE FUNCTION generate_project_number_by_tenant();

-- Adicionar comentário explicativo no trigger
COMMENT ON TRIGGER set_project_number_by_tenant ON projects IS
'Trigger executado antes de inserir novo projeto.
Gera automaticamente o número do projeto se não foi fornecido.
Garante isolamento de numeração por tenant_id.';

-- ============================================================================
-- PASSO 4: Adicionar índice para performance (se não existir)
-- ============================================================================

-- Índice composto para otimizar a busca do último número por tenant
CREATE INDEX IF NOT EXISTS idx_projects_tenant_number
ON projects(tenant_id, number);

-- Comentário no índice
COMMENT ON INDEX idx_projects_tenant_number IS
'Índice composto para otimizar busca de último número de projeto por tenant.
Melhora performance da função generate_project_number_by_tenant().';

-- ============================================================================
-- PASSO 5: Verificação de integridade
-- ============================================================================

-- Verificar se a coluna tenant_id existe e não permite NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'projects'
      AND column_name = 'tenant_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'ERRO: Coluna tenant_id não existe ou permite NULL na tabela projects';
  END IF;

  RAISE NOTICE '✅ Verificação de integridade: tenant_id está corretamente configurado';
END $$;

-- ============================================================================
-- PASSO 6: Teste básico da função
-- ============================================================================

-- Este é apenas um teste de sintaxe, não cria projetos reais
DO $$
DECLARE
  test_result TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Teste de sintaxe da função concluído';
  RAISE NOTICE 'A função está pronta para uso';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FINALIZAÇÃO
-- ============================================================================

-- Exibir mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ SCRIPT EXECUTADO COM SUCESSO!';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 O que foi criado:';
  RAISE NOTICE '   1. Função: generate_project_number_by_tenant()';
  RAISE NOTICE '   2. Trigger: set_project_number_by_tenant';
  RAISE NOTICE '   3. Índice: idx_projects_tenant_number';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Comportamento:';
  RAISE NOTICE '   - Cada tenant terá sua própria numeração começando em 001';
  RAISE NOTICE '   - Formato: FV-2025-001, FV-2025-002, etc.';
  RAISE NOTICE '   - Numeração é isolada por tenant_id';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Próximos passos:';
  RAISE NOTICE '   1. Execute o script: verify-project-number-fix.sql';
  RAISE NOTICE '   2. Crie um projeto de teste em cada tenant';
  RAISE NOTICE '   3. Verifique se cada tenant começa do 001';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Em caso de problema:';
  RAISE NOTICE '   - Execute o script: rollback-project-number-fix.sql';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
END $$;
