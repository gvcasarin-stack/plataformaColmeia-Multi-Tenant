-- =====================================================
-- MIGRATION: Criar tabelas do Funil de Vendas (CRM)
-- Data: 2025-01-19
-- Objetivo: Gerenciar oportunidades de vendas em Kanban
--           Sistema multi-tenant com isolamento completo
-- =====================================================

-- =====================================================
-- TABELA 1: opportunity_statuses
-- Colunas customizáveis do Kanban por tenant
-- =====================================================

CREATE TABLE IF NOT EXISTS opportunity_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações da coluna
  name VARCHAR(100) NOT NULL,              -- Nome da coluna (ex: "Novo Lead", "Qualificação")
  color VARCHAR(50) DEFAULT '#3B82F6',     -- Cor da coluna em hex
  position INTEGER NOT NULL DEFAULT 0,     -- Ordem da coluna no Kanban

  -- Classificação
  is_default BOOLEAN DEFAULT false,        -- Coluna padrão do sistema
  is_final BOOLEAN DEFAULT false,          -- Coluna final (ganho/perdido)
  is_won BOOLEAN DEFAULT false,            -- Coluna de "ganho"
  is_lost BOOLEAN DEFAULT false,           -- Coluna de "perdido"

  -- Multi-tenant
  tenant_id UUID NOT NULL,                 -- ✅ CRÍTICO: ID do tenant

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_opportunity_statuses_tenant FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_status_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT unique_status_position_per_tenant UNIQUE (tenant_id, position)
);

-- =====================================================
-- TABELA 2: opportunities
-- Oportunidades de venda (cards do Kanban)
-- =====================================================

CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas da oportunidade
  title VARCHAR(255) NOT NULL,                    -- Título do negócio
  estimated_value DECIMAL(15, 2),                 -- Valor estimado em R$
  probability INTEGER DEFAULT 50,                 -- Probabilidade de fechamento (0-100%)
  expected_close_date DATE,                       -- Data prevista de fechamento

  -- Relacionamentos
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,              -- Lead associado
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL,       -- Responsável pela oportunidade
  status_id UUID NOT NULL REFERENCES opportunity_statuses(id) ON DELETE RESTRICT,  -- Coluna atual do Kanban
  tenant_id UUID NOT NULL,                        -- ✅ CRÍTICO: ID do tenant
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,           -- Quem criou

  -- Posicionamento no Kanban
  position INTEGER NOT NULL DEFAULT 0,            -- Ordem do card dentro da coluna

  -- Informações complementares
  description TEXT,                               -- Descrição detalhada
  tags TEXT[],                                    -- Tags para filtros (ex: ['urgente', 'vip'])

  -- Controle de conversão
  won_at TIMESTAMP WITH TIME ZONE,               -- Quando ganhou
  lost_at TIMESTAMP WITH TIME ZONE,              -- Quando perdeu
  lost_reason TEXT,                              -- Motivo da perda
  converted_to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,  -- Projeto criado

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_opportunities_tenant FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT check_probability_range CHECK (probability >= 0 AND probability <= 100)
);

-- =====================================================
-- Comentários para documentação
-- =====================================================

COMMENT ON TABLE opportunity_statuses IS 'Colunas customizáveis do Kanban de funil de vendas - isolado por tenant';
COMMENT ON TABLE opportunities IS 'Oportunidades de venda (cards do Kanban) - isolado por tenant';

COMMENT ON COLUMN opportunity_statuses.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento multi-tenant';
COMMENT ON COLUMN opportunity_statuses.is_final IS 'Indica se é uma coluna final (ganho ou perdido)';
COMMENT ON COLUMN opportunity_statuses.position IS 'Ordem de exibição da coluna no Kanban';

COMMENT ON COLUMN opportunities.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento multi-tenant';
COMMENT ON COLUMN opportunities.lead_id IS 'Lead associado à oportunidade (opcional)';
COMMENT ON COLUMN opportunities.status_id IS 'Coluna atual do Kanban onde a oportunidade está';
COMMENT ON COLUMN opportunities.position IS 'Ordem do card dentro da coluna';
COMMENT ON COLUMN opportunities.probability IS 'Probabilidade de fechamento (0-100%)';

-- =====================================================
-- Índices para performance
-- =====================================================

-- OPPORTUNITY_STATUSES
CREATE INDEX IF NOT EXISTS idx_opp_statuses_tenant ON opportunity_statuses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opp_statuses_tenant_position ON opportunity_statuses(tenant_id, position);

-- OPPORTUNITIES
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status ON opportunities(tenant_id, status_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_responsible ON opportunities(responsible_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_at ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_position ON opportunities(status_id, position);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- OPPORTUNITY_STATUSES
ALTER TABLE opportunity_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver status do seu tenant"
  ON opportunity_statuses FOR SELECT
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Usuários podem criar status no seu tenant"
  ON opportunity_statuses FOR INSERT
  WITH CHECK (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Usuários podem atualizar status do seu tenant"
  ON opportunity_statuses FOR UPDATE
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Admins podem deletar status do seu tenant"
  ON opportunity_statuses FOR DELETE
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')));

-- OPPORTUNITIES
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver oportunidades do seu tenant"
  ON opportunities FOR SELECT
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Usuários podem criar oportunidades no seu tenant"
  ON opportunities FOR INSERT
  WITH CHECK (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Usuários podem atualizar oportunidades do seu tenant"
  ON opportunities FOR UPDATE
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid()));

CREATE POLICY "Admins podem deletar oportunidades do seu tenant"
  ON opportunities FOR DELETE
  USING (tenant_id IN (SELECT u.tenant_id FROM users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'superadmin')));

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Trigger: Atualizar updated_at automaticamente (opportunity_statuses)
CREATE OR REPLACE FUNCTION update_opportunity_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_opp_statuses_updated_at ON opportunity_statuses;
CREATE TRIGGER trigger_update_opp_statuses_updated_at
  BEFORE UPDATE ON opportunity_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunity_statuses_updated_at();

-- Trigger: Atualizar updated_at automaticamente (opportunities)
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_opportunities_updated_at ON opportunities;
CREATE TRIGGER trigger_update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunities_updated_at();

-- Function: Reorganizar posições após mover card
CREATE OR REPLACE FUNCTION reorder_opportunities_after_move()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de status, reorganizar a coluna antiga e a nova
  IF OLD.status_id != NEW.status_id THEN
    -- Reorganizar coluna antiga (fechar o gap)
    UPDATE opportunities
    SET position = position - 1
    WHERE status_id = OLD.status_id
      AND position > OLD.position
      AND id != NEW.id;

    -- Abrir espaço na coluna nova
    UPDATE opportunities
    SET position = position + 1
    WHERE status_id = NEW.status_id
      AND position >= NEW.position
      AND id != NEW.id;

  -- Se mudou apenas a posição na mesma coluna
  ELSIF OLD.position != NEW.position THEN
    -- Se moveu para baixo
    IF NEW.position > OLD.position THEN
      UPDATE opportunities
      SET position = position - 1
      WHERE status_id = NEW.status_id
        AND position > OLD.position
        AND position <= NEW.position
        AND id != NEW.id;

    -- Se moveu para cima
    ELSE
      UPDATE opportunities
      SET position = position + 1
      WHERE status_id = NEW.status_id
        AND position >= NEW.position
        AND position < OLD.position
        AND id != NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reorder_opportunities ON opportunities;
CREATE TRIGGER trigger_reorder_opportunities
  AFTER UPDATE OF status_id, position ON opportunities
  FOR EACH ROW
  WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id OR OLD.position IS DISTINCT FROM NEW.position)
  EXECUTE FUNCTION reorder_opportunities_after_move();

-- =====================================================
-- POPULAR COLUNAS PADRÃO DO KANBAN
-- =====================================================

-- Function: Criar colunas padrão para um tenant
CREATE OR REPLACE FUNCTION create_default_opportunity_statuses(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO opportunity_statuses (tenant_id, name, color, position, is_default) VALUES
    (p_tenant_id, 'Novo Lead', '#10B981', 0, true),
    (p_tenant_id, 'Qualificação', '#3B82F6', 1, true),
    (p_tenant_id, 'Proposta Enviada', '#8B5CF6', 2, true),
    (p_tenant_id, 'Negociação', '#F59E0B', 3, true),
    (p_tenant_id, 'Ganho', '#22C55E', 4, true),
    (p_tenant_id, 'Perdido', '#EF4444', 5, true);

  -- Marcar colunas finais
  UPDATE opportunity_statuses
  SET is_final = true, is_won = true
  WHERE tenant_id = p_tenant_id AND name = 'Ganho';

  UPDATE opportunity_statuses
  SET is_final = true, is_lost = true
  WHERE tenant_id = p_tenant_id AND name = 'Perdido';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar tabelas criadas
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_name IN ('opportunity_statuses', 'opportunities')
  AND table_schema = 'public';

-- Verificar políticas RLS
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('opportunity_statuses', 'opportunities')
ORDER BY tablename, policyname;

-- =====================================================
-- MENSAGEM DE SUCESSO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabelas "opportunity_statuses" e "opportunities" criadas com sucesso!';
  RAISE NOTICE '✅ Políticas RLS configuradas (isolamento multi-tenant)';
  RAISE NOTICE '✅ Índices de performance criados';
  RAISE NOTICE '✅ Triggers de auditoria e reordenação configurados';
  RAISE NOTICE '✅ Function create_default_opportunity_statuses() criada';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Para criar colunas padrão em um tenant:';
  RAISE NOTICE '   SELECT create_default_opportunity_statuses(''<tenant_id>'');';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Segurança: Isolamento multi-tenant completo';
  RAISE NOTICE '📊 Performance: Índices otimizados para Kanban';
  RAISE NOTICE '🔄 Auditoria: Campos updated_at automáticos';
END $$;
