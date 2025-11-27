-- =====================================================
-- MIGRATION: Criar tabela de Leads (CRM Simples)
-- Data: 2025-11-09
-- Objetivo: Gerenciar leads antes de se tornarem projetos
--           Sistema multi-tenant com isolamento completo
-- =====================================================

-- Criar tabela leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações básicas do lead
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),

  -- Informações do projeto potencial (específico para energia solar)
  estimated_power DECIMAL(10, 2), -- Potência estimada em kWp
  estimated_value DECIMAL(15, 2), -- Valor estimado do projeto em R$
  address TEXT, -- Endereço completo ou localização
  city VARCHAR(100),
  state VARCHAR(2),

  -- Status e classificação
  status VARCHAR(50) NOT NULL DEFAULT 'novo', -- 'novo', 'contatado', 'qualificado', 'proposta_enviada', 'em_negociacao', 'ganho', 'perdido'
  source VARCHAR(100), -- 'Site', 'Indicação', 'Instagram', 'Facebook', 'Google', 'Telefone', etc.

  -- Relacionamentos
  tenant_id UUID NOT NULL, -- ✅ MULTI-TENANT: Isolamento por organização
  responsible_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Colaborador responsável pelo lead
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Quem criou o lead

  -- Controle de interações
  is_new BOOLEAN DEFAULT true, -- Badge "NOVO" na interface
  is_archived BOOLEAN DEFAULT false, -- Lead arquivado (não aparece na lista principal)
  last_interaction_at TIMESTAMP WITH TIME ZONE, -- Data da última interação
  last_interaction_type VARCHAR(100), -- 'email', 'ligacao', 'reuniao', 'whatsapp', etc.
  notes TEXT, -- Observações gerais sobre o lead

  -- Conversão em projeto
  converted_at TIMESTAMP WITH TIME ZONE, -- Quando virou projeto/cliente
  converted_to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Link com projeto criado
  lost_reason TEXT, -- Motivo caso tenha perdido o lead
  lost_at TIMESTAMP WITH TIME ZONE, -- Quando perdeu o lead

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- ✅ CONSTRAINT: Foreign key para organizations (multi-tenant)
  CONSTRAINT fk_leads_tenant FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE,

  -- ✅ CONSTRAINT: Validar status
  CONSTRAINT check_lead_status CHECK (status IN ('novo', 'contatado', 'qualificado', 'proposta_enviada', 'em_negociacao', 'ganho', 'perdido'))
);

-- =====================================================
-- Comentários para documentação
-- =====================================================

COMMENT ON TABLE leads IS 'Gerenciamento de leads do CRM - isolado por tenant';
COMMENT ON COLUMN leads.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento multi-tenant';
COMMENT ON COLUMN leads.responsible_id IS 'Colaborador responsável pelo acompanhamento do lead';
COMMENT ON COLUMN leads.status IS 'Status do lead no funil de vendas';
COMMENT ON COLUMN leads.source IS 'Origem do lead (canal de aquisição)';
COMMENT ON COLUMN leads.estimated_power IS 'Potência estimada do projeto em kWp';
COMMENT ON COLUMN leads.estimated_value IS 'Valor estimado do projeto em R$';
COMMENT ON COLUMN leads.is_new IS 'Flag para exibir badge NOVO na interface';
COMMENT ON COLUMN leads.converted_at IS 'Data de conversão em projeto/oportunidade';
COMMENT ON COLUMN leads.converted_to_project_id IS 'ID do projeto criado após conversão';
COMMENT ON COLUMN leads.lost_reason IS 'Motivo da perda do lead (se aplicável)';

-- =====================================================
-- Índices para performance
-- =====================================================

-- Índice principal: tenant_id (ESSENCIAL para multi-tenant)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);

-- Índice composto: tenant + status (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_status ON leads(tenant_id, status);

-- Índice composto: tenant + responsible (filtro por responsável)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_responsible ON leads(tenant_id, responsible_id);

-- Índice: responsible_id (filtros de leads por colaborador)
CREATE INDEX IF NOT EXISTS idx_leads_responsible ON leads(responsible_id);

-- Índice: status (filtros por status)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Índice: source (análise por origem)
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Índice: created_at (ordenação por data)
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Índice: is_archived (filtrar leads ativos vs arquivados)
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads(is_archived) WHERE is_archived = false;

-- Índice: converted_at (análise de conversão)
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted_at) WHERE converted_at IS NOT NULL;

-- Índice composto: tenant + arquivado (lista principal de leads ativos)
CREATE INDEX IF NOT EXISTS idx_leads_tenant_active ON leads(tenant_id, is_archived) WHERE is_archived = false;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Garantir isolamento multi-tenant rigoroso
-- =====================================================

-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política 1: SELECT - Usuários podem ver apenas leads do seu tenant
CREATE POLICY "Usuários podem ver leads do seu tenant"
  ON leads
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Política 2: INSERT - Usuários podem criar leads apenas no seu tenant
CREATE POLICY "Usuários podem criar leads no seu tenant"
  ON leads
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Política 3: UPDATE - Usuários podem atualizar apenas leads do seu tenant
CREATE POLICY "Usuários podem atualizar leads do seu tenant"
  ON leads
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
    )
  );

-- Política 4: DELETE - Apenas admins podem deletar leads do seu tenant
CREATE POLICY "Admins podem deletar leads do seu tenant"
  ON leads
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT u.tenant_id
      FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- FUNCTION: Atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_leads_updated_at ON leads;
CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- =====================================================
-- FUNCTION: Marcar is_new como false após 7 dias
-- =====================================================

CREATE OR REPLACE FUNCTION update_leads_is_new()
RETURNS void AS $$
BEGIN
  UPDATE leads
  SET is_new = false
  WHERE is_new = true
  AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

-- Verificar se a tabela foi criada com todas as colunas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'leads'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'leads';

-- Verificar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'leads'
ORDER BY indexname;

-- =====================================================
-- MENSAGEM DE SUCESSO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Tabela "leads" criada com sucesso!';
  RAISE NOTICE '✅ Políticas RLS configuradas (isolamento multi-tenant)';
  RAISE NOTICE '✅ Índices de performance criados';
  RAISE NOTICE '✅ Triggers de auditoria configurados';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Segurança: Apenas usuários do mesmo tenant podem acessar os leads';
  RAISE NOTICE '📊 Performance: Índices otimizados para queries comuns';
  RAISE NOTICE '🔄 Auditoria: Campo updated_at atualizado automaticamente';
END $$;
