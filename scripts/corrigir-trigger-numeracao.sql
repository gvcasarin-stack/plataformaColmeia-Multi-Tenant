-- ============================================================================
-- CORREÇÃO CRÍTICA: Trigger de numeração de projetos por tenant
-- ============================================================================
-- PROBLEMA IDENTIFICADO: O trigger existe mas está gerando números globais
--                        ao invés de isolados por tenant
-- ============================================================================

-- PASSO 1: Remover trigger antigo
DROP TRIGGER IF EXISTS set_project_number_by_tenant ON projects;

-- PASSO 2: Remover função antiga
DROP FUNCTION IF EXISTS generate_project_number_by_tenant();

-- PASSO 3: Criar função CORRIGIDA que gera número isolado por tenant
CREATE OR REPLACE FUNCTION generate_project_number_by_tenant()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  prefix TEXT;
  last_number INT;
  next_number TEXT;
BEGIN
  -- Log de debug
  RAISE NOTICE '🔢 Gerando número para projeto do tenant: %', NEW.tenant_id;

  -- Obter ano atual
  current_year := EXTRACT(YEAR FROM NOW());

  -- Definir prefixo: FV-2025-
  prefix := 'FV-' || current_year || '-';

  -- 🔐 CRÍTICO: Buscar último número APENAS do tenant atual
  -- Filtrar por:
  -- 1. tenant_id = NEW.tenant_id (ISOLAMENTO)
  -- 2. Números que começam com o prefixo do ano atual
  -- 3. Números que terminam com dígitos válidos
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
    AND number ~ (prefix || '[0-9]+$');

  -- Gerar próximo número com padding de 3 dígitos
  next_number := prefix || LPAD((last_number + 1)::TEXT, 3, '0');

  -- Log detalhado
  RAISE NOTICE '  └─ Tenant ID: %', NEW.tenant_id;
  RAISE NOTICE '  └─ Último número deste tenant: %', CASE WHEN last_number > 0 THEN last_number ELSE 'Nenhum' END;
  RAISE NOTICE '  └─ Próximo número: %', next_number;

  -- Atribuir número ao novo registro
  NEW.number := next_number;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao gerar número do projeto: %', SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION generate_project_number_by_tenant() IS
'Gera número sequencial de projeto ISOLADO por tenant_id.
Formato: FV-YYYY-NNN (ex: FV-2025-001, FV-2025-002).
CRÍTICO: Cada tenant tem sua própria sequência numérica independente.
O número continua de onde o tenant parou, não do número global.';

-- PASSO 4: Criar trigger CORRIGIDO
CREATE TRIGGER set_project_number_by_tenant
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.number IS NULL OR NEW.number = '')
  EXECUTE FUNCTION generate_project_number_by_tenant();

-- Comentário do trigger
COMMENT ON TRIGGER set_project_number_by_tenant ON projects IS
'Trigger que gera número automático de projeto ANTES de inserir.
Executa APENAS quando number é NULL ou vazio.
Garante ISOLAMENTO total de numeração por tenant_id.';

-- PASSO 5: Garantir que o índice existe para performance
CREATE INDEX IF NOT EXISTS idx_projects_tenant_number
ON projects(tenant_id, number);

COMMENT ON INDEX idx_projects_tenant_number IS
'Índice composto para otimizar busca de último número por tenant.
Essencial para performance da função generate_project_number_by_tenant().';

-- PASSO 6: Teste rápido
DO $$
DECLARE
  tenant_record RECORD;
  current_year INT;
  prefix TEXT;
  last_num INT;
  next_num TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '✅ CORREÇÃO APLICADA COM SUCESSO!';
  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Próximos números por tenant (simulação):';
  RAISE NOTICE '';

  current_year := EXTRACT(YEAR FROM NOW());
  prefix := 'FV-' || current_year || '-';

  FOR tenant_record IN
    SELECT DISTINCT tenant_id
    FROM projects
    ORDER BY tenant_id
    LIMIT 5
  LOOP
    -- Simular próximo número
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(number FROM LENGTH(prefix) + 1) AS INTEGER)),
      0
    ) INTO last_num
    FROM projects
    WHERE tenant_id = tenant_record.tenant_id
      AND number LIKE prefix || '%'
      AND number ~ (prefix || '[0-9]+$');

    next_num := prefix || LPAD((last_num + 1)::TEXT, 3, '0');

    RAISE NOTICE '   Tenant: %', tenant_record.tenant_id;
    RAISE NOTICE '   └─ Último número: %', CASE WHEN last_num > 0 THEN prefix || LPAD(last_num::TEXT, 3, '0') ELSE 'Nenhum ainda' END;
    RAISE NOTICE '   └─ Próximo será: %', next_num;
    RAISE NOTICE '';
  END LOOP;

  RAISE NOTICE '✅ ============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 O que mudou:';
  RAISE NOTICE '   • Função recriada com lógica CORRETA de isolamento';
  RAISE NOTICE '   • Trigger recriado e vinculado à nova função';
  RAISE NOTICE '   • Cada tenant agora continua sua PRÓPRIA sequência';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Próximo projeto criado:';
  RAISE NOTICE '   • Tenant 1 continuará de onde parou (ex: 098, 099, 100...)';
  RAISE NOTICE '   • Tenant 2 continuará de onde parou (ex: 094, 095, 096...)';
  RAISE NOTICE '   • Tenant 3 continuará de onde parou (ex: 079, 080, 081...)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE:';
  RAISE NOTICE '   • Projetos EXISTENTES não serão alterados';
  RAISE NOTICE '   • Apenas projetos NOVOS terão numeração isolada correta';
  RAISE NOTICE '   • Para renumerar projetos antigos, seria necessário script adicional';
  RAISE NOTICE '';
  RAISE NOTICE '✅ ============================================================================';
END $$;
