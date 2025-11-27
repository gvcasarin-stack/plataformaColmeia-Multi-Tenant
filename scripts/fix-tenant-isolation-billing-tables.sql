-- =====================================================
-- Migration: Corrigir Isolamento de Tenant nas Tabelas de Billing
-- =====================================================
-- OBJETIVO: Adicionar tenant_id nas tabelas cliente_pacotes e cliente_assinaturas
-- para garantir isolamento correto de dados entre tenants
--
-- SEVERIDADE: CRÍTICA - Previne vazamento de dados entre tenants
-- =====================================================

-- =====================================================
-- PARTE 1: ADICIONAR COLUNA tenant_id EM cliente_pacotes
-- =====================================================

-- 1.1. Adicionar coluna tenant_id (permitindo NULL temporariamente)
ALTER TABLE cliente_pacotes
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 1.2. Preencher tenant_id baseado no user_id (join com users)
UPDATE cliente_pacotes cp
SET tenant_id = u.tenant_id
FROM users u
WHERE cp.user_id = u.id
AND cp.tenant_id IS NULL;

-- 1.3. Tornar tenant_id NOT NULL após preencher
ALTER TABLE cliente_pacotes
ALTER COLUMN tenant_id SET NOT NULL;

-- 1.4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_tenant_id ON cliente_pacotes(tenant_id);

-- 1.5. Criar índice composto para queries que filtram por tenant + status
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_tenant_status ON cliente_pacotes(tenant_id, status);

-- 1.6. Adicionar comentário explicativo
COMMENT ON COLUMN cliente_pacotes.tenant_id IS 'ID do tenant - necessário para isolamento de dados multi-tenant';

-- =====================================================
-- PARTE 2: ADICIONAR COLUNA tenant_id EM cliente_assinaturas
-- =====================================================

-- 2.1. Adicionar coluna tenant_id (permitindo NULL temporariamente)
ALTER TABLE cliente_assinaturas
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 2.2. Preencher tenant_id baseado no user_id (join com users)
UPDATE cliente_assinaturas ca
SET tenant_id = u.tenant_id
FROM users u
WHERE ca.user_id = u.id
AND ca.tenant_id IS NULL;

-- 2.3. Tornar tenant_id NOT NULL após preencher
ALTER TABLE cliente_assinaturas
ALTER COLUMN tenant_id SET NOT NULL;

-- 2.4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_tenant_id ON cliente_assinaturas(tenant_id);

-- 2.5. Criar índice composto para queries que filtram por tenant + status
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_tenant_status ON cliente_assinaturas(tenant_id, status);

-- 2.6. Adicionar comentário explicativo
COMMENT ON COLUMN cliente_assinaturas.tenant_id IS 'ID do tenant - necessário para isolamento de dados multi-tenant';

-- =====================================================
-- PARTE 3: ATUALIZAR RLS (Row Level Security) POLICIES
-- =====================================================

-- 3.1. Remover policies antigas se existirem
DROP POLICY IF EXISTS cliente_pacotes_user_isolation ON cliente_pacotes;
DROP POLICY IF EXISTS cliente_assinaturas_user_isolation ON cliente_assinaturas;

-- 3.2. Criar nova policy para cliente_pacotes com isolamento por tenant
CREATE POLICY cliente_pacotes_tenant_isolation ON cliente_pacotes
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR user_id = auth.uid()
  );

-- 3.3. Criar nova policy para cliente_assinaturas com isolamento por tenant
CREATE POLICY cliente_assinaturas_tenant_isolation ON cliente_assinaturas
  USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
    OR user_id = auth.uid()
  );

-- =====================================================
-- PARTE 4: VERIFICAÇÕES DE INTEGRIDADE
-- =====================================================

-- 4.1. Verificar se todos os registros de cliente_pacotes têm tenant_id válido
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM cliente_pacotes
  WHERE tenant_id IS NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_pacotes sem tenant_id', invalid_count;
  ELSE
    RAISE NOTICE 'OK: Todos os registros de cliente_pacotes têm tenant_id válido';
  END IF;
END $$;

-- 4.2. Verificar se todos os registros de cliente_assinaturas têm tenant_id válido
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM cliente_assinaturas
  WHERE tenant_id IS NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_assinaturas sem tenant_id', invalid_count;
  ELSE
    RAISE NOTICE 'OK: Todos os registros de cliente_assinaturas têm tenant_id válido';
  END IF;
END $$;

-- 4.3. Verificar se tenant_id coincide com tenant_id do user
DO $$
DECLARE
  mismatch_pacotes INTEGER;
  mismatch_assinaturas INTEGER;
BEGIN
  SELECT COUNT(*) INTO mismatch_pacotes
  FROM cliente_pacotes cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.tenant_id != u.tenant_id;

  SELECT COUNT(*) INTO mismatch_assinaturas
  FROM cliente_assinaturas ca
  JOIN users u ON ca.user_id = u.id
  WHERE ca.tenant_id != u.tenant_id;

  IF mismatch_pacotes > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_pacotes com tenant_id inconsistente', mismatch_pacotes;
  END IF;

  IF mismatch_assinaturas > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_assinaturas com tenant_id inconsistente', mismatch_assinaturas;
  END IF;

  IF mismatch_pacotes = 0 AND mismatch_assinaturas = 0 THEN
    RAISE NOTICE 'OK: Todos os tenant_id estão consistentes com os usuários';
  END IF;
END $$;

-- =====================================================
-- PARTE 5: ATUALIZAR TRIGGERS (se existirem)
-- =====================================================

-- 5.1. Trigger para atualizar updated_at em cliente_pacotes
CREATE OR REPLACE FUNCTION update_cliente_pacotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cliente_pacotes_updated_at ON cliente_pacotes;
CREATE TRIGGER trigger_update_cliente_pacotes_updated_at
  BEFORE UPDATE ON cliente_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_pacotes_updated_at();

-- 5.2. Trigger para atualizar updated_at em cliente_assinaturas
CREATE OR REPLACE FUNCTION update_cliente_assinaturas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_cliente_assinaturas_updated_at ON cliente_assinaturas;
CREATE TRIGGER trigger_update_cliente_assinaturas_updated_at
  BEFORE UPDATE ON cliente_assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_cliente_assinaturas_updated_at();

-- =====================================================
-- PARTE 6: RELATÓRIO FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Alterações realizadas:';
  RAISE NOTICE '- Adicionada coluna tenant_id em cliente_pacotes';
  RAISE NOTICE '- Adicionada coluna tenant_id em cliente_assinaturas';
  RAISE NOTICE '- Criados índices para performance';
  RAISE NOTICE '- Atualizadas RLS policies para isolamento de tenant';
  RAISE NOTICE '- Verificações de integridade executadas';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AÇÃO NECESSÁRIA:';
  RAISE NOTICE '- Atualizar código da aplicação para usar tenant_id nos filtros';
  RAISE NOTICE '- Testar isolamento de dados entre tenants';
  RAISE NOTICE '========================================';
END $$;
