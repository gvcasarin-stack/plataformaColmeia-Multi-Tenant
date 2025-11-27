-- =====================================================
-- Migration: Adicionar Sistema de Modalidades de Faturamento
-- =====================================================
-- IMPORTANTE: Este script cria as estruturas necessárias
-- para implementar três modalidades de faturamento:
-- 1. Projetos Avulsos (padrão)
-- 2. Pacotes de Projetos
-- 3. Assinatura Mensal de Projetos
-- =====================================================

-- =====================================================
-- PARTE 1: MODIFICAR TABELAS EXISTENTES
-- =====================================================

-- 1.1. Adicionar coluna billing_mode na tabela users
-- Modalidade padrão de faturamento do cliente
ALTER TABLE users
ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'avulso';

-- Adicionar comentário explicativo
COMMENT ON COLUMN users.billing_mode IS 'Modalidade de faturamento do cliente: avulso, pacote, assinatura';

-- Adicionar constraint para validar valores
ALTER TABLE users
ADD CONSTRAINT users_billing_mode_check
CHECK (billing_mode IN ('avulso', 'pacote', 'assinatura'));

-- 1.2. Adicionar colunas billing_mode e billing_snapshot na tabela projects
-- billing_mode: Modalidade "congelada" no momento da criação do projeto
-- billing_snapshot: Dados completos de faturamento em formato JSON
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS billing_mode TEXT,
ADD COLUMN IF NOT EXISTS billing_snapshot JSONB;

-- Adicionar comentários explicativos
COMMENT ON COLUMN projects.billing_mode IS 'Modalidade de faturamento congelada no momento da criação do projeto';
COMMENT ON COLUMN projects.billing_snapshot IS 'Snapshot dos dados de faturamento em formato JSON';

-- Adicionar constraint para validar valores
ALTER TABLE projects
ADD CONSTRAINT projects_billing_mode_check
CHECK (billing_mode IN ('avulso', 'pacote', 'assinatura'));

-- =====================================================
-- PARTE 2: CRIAR NOVAS TABELAS
-- =====================================================

-- 2.1. Tabela: pacotes_definicoes
-- Catálogo de pacotes disponíveis para o tenant
CREATE TABLE IF NOT EXISTS pacotes_definicoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade_projetos INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  validade_dias INT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT pacotes_definicoes_quantidade_projetos_positive CHECK (quantidade_projetos > 0),
  CONSTRAINT pacotes_definicoes_valor_positive CHECK (valor >= 0),
  CONSTRAINT pacotes_definicoes_validade_dias_positive CHECK (validade_dias > 0)
);

-- Comentários explicativos
COMMENT ON TABLE pacotes_definicoes IS 'Catálogo de pacotes de projetos disponíveis para contratação';
COMMENT ON COLUMN pacotes_definicoes.nome IS 'Nome do pacote (ex: Pacote 10 Projetos)';
COMMENT ON COLUMN pacotes_definicoes.quantidade_projetos IS 'Quantidade de projetos inclusos no pacote';
COMMENT ON COLUMN pacotes_definicoes.valor IS 'Valor total do pacote em reais';
COMMENT ON COLUMN pacotes_definicoes.validade_dias IS 'Validade do pacote em dias após ativação';
COMMENT ON COLUMN pacotes_definicoes.ativo IS 'Se o pacote está disponível para contratação';

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_pacotes_definicoes_tenant_id ON pacotes_definicoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pacotes_definicoes_ativo ON pacotes_definicoes(ativo);

-- RLS (Row Level Security)
ALTER TABLE pacotes_definicoes ENABLE ROW LEVEL SECURITY;

-- Policy: Admin pode gerenciar pacotes do seu tenant
CREATE POLICY pacotes_definicoes_tenant_isolation ON pacotes_definicoes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 2.2. Tabela: cliente_pacotes
-- Pacotes ativos/inativos contratados por clientes
CREATE TABLE IF NOT EXISTS cliente_pacotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pacote_id UUID NOT NULL REFERENCES pacotes_definicoes(id) ON DELETE RESTRICT,
  data_ativacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_expiracao TIMESTAMP NOT NULL,
  projetos_inclusos INT NOT NULL,
  projetos_usados INT DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cliente_pacotes_projetos_inclusos_positive CHECK (projetos_inclusos > 0),
  CONSTRAINT cliente_pacotes_projetos_usados_non_negative CHECK (projetos_usados >= 0),
  CONSTRAINT cliente_pacotes_projetos_usados_lte_inclusos CHECK (projetos_usados <= projetos_inclusos),
  CONSTRAINT cliente_pacotes_status_check CHECK (status IN ('ativo', 'expirado', 'esgotado', 'cancelado')),
  CONSTRAINT cliente_pacotes_data_expiracao_after_ativacao CHECK (data_expiracao > data_ativacao)
);

-- Comentários explicativos
COMMENT ON TABLE cliente_pacotes IS 'Pacotes contratados por clientes';
COMMENT ON COLUMN cliente_pacotes.data_ativacao IS 'Data de ativação do pacote';
COMMENT ON COLUMN cliente_pacotes.data_expiracao IS 'Data de expiração do pacote';
COMMENT ON COLUMN cliente_pacotes.projetos_inclusos IS 'Quantidade de projetos inclusos no pacote';
COMMENT ON COLUMN cliente_pacotes.projetos_usados IS 'Quantidade de projetos já utilizados';
COMMENT ON COLUMN cliente_pacotes.status IS 'Status do pacote: ativo, expirado, esgotado, cancelado';

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_user_id ON cliente_pacotes(user_id);
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_status ON cliente_pacotes(status);
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_data_expiracao ON cliente_pacotes(data_expiracao);

-- RLS (Row Level Security)
ALTER TABLE cliente_pacotes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode ver apenas seus próprios pacotes
CREATE POLICY cliente_pacotes_user_isolation ON cliente_pacotes
  USING (user_id = auth.uid());

-- 2.3. Tabela: planos_assinatura
-- Catálogo de planos de assinatura mensal disponíveis
CREATE TABLE IF NOT EXISTS planos_assinatura (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade_mensal INT NOT NULL,
  valor_mensal DECIMAL(10,2) NOT NULL,
  dia_renovacao INT DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT planos_assinatura_quantidade_mensal_positive CHECK (quantidade_mensal > 0),
  CONSTRAINT planos_assinatura_valor_mensal_positive CHECK (valor_mensal >= 0),
  CONSTRAINT planos_assinatura_dia_renovacao_range CHECK (dia_renovacao >= 1 AND dia_renovacao <= 31)
);

-- Comentários explicativos
COMMENT ON TABLE planos_assinatura IS 'Catálogo de planos de assinatura mensal disponíveis';
COMMENT ON COLUMN planos_assinatura.nome IS 'Nome do plano (ex: Plano 5 Projetos/mês)';
COMMENT ON COLUMN planos_assinatura.quantidade_mensal IS 'Quantidade de projetos por mês';
COMMENT ON COLUMN planos_assinatura.valor_mensal IS 'Valor mensal da assinatura em reais';
COMMENT ON COLUMN planos_assinatura.dia_renovacao IS 'Dia do mês para renovação (1-31)';
COMMENT ON COLUMN planos_assinatura.ativo IS 'Se o plano está disponível para contratação';

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_planos_assinatura_tenant_id ON planos_assinatura(tenant_id);
CREATE INDEX IF NOT EXISTS idx_planos_assinatura_ativo ON planos_assinatura(ativo);

-- RLS (Row Level Security)
ALTER TABLE planos_assinatura ENABLE ROW LEVEL SECURITY;

-- Policy: Admin pode gerenciar planos do seu tenant
CREATE POLICY planos_assinatura_tenant_isolation ON planos_assinatura
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- 2.4. Tabela: cliente_assinaturas
-- Assinaturas mensais ativas/inativas de clientes
CREATE TABLE IF NOT EXISTS cliente_assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plano_id UUID NOT NULL REFERENCES planos_assinatura(id) ON DELETE RESTRICT,
  data_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
  dia_renovacao INT NOT NULL,
  projetos_mensais INT NOT NULL,
  projetos_usados_mes_atual INT DEFAULT 0,
  ultimo_reset TIMESTAMP,
  proximo_reset TIMESTAMP,
  status TEXT DEFAULT 'ativa',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cliente_assinaturas_projetos_mensais_positive CHECK (projetos_mensais > 0),
  CONSTRAINT cliente_assinaturas_projetos_usados_non_negative CHECK (projetos_usados_mes_atual >= 0),
  CONSTRAINT cliente_assinaturas_projetos_usados_lte_mensais CHECK (projetos_usados_mes_atual <= projetos_mensais),
  CONSTRAINT cliente_assinaturas_status_check CHECK (status IN ('ativa', 'pendente_renovacao', 'pausada', 'cancelada')),
  CONSTRAINT cliente_assinaturas_dia_renovacao_range CHECK (dia_renovacao >= 1 AND dia_renovacao <= 31)
);

-- Comentários explicativos
COMMENT ON TABLE cliente_assinaturas IS 'Assinaturas mensais contratadas por clientes';
COMMENT ON COLUMN cliente_assinaturas.data_inicio IS 'Data de início da assinatura';
COMMENT ON COLUMN cliente_assinaturas.dia_renovacao IS 'Dia do mês para renovação (copiado do plano)';
COMMENT ON COLUMN cliente_assinaturas.projetos_mensais IS 'Quantidade de projetos por mês';
COMMENT ON COLUMN cliente_assinaturas.projetos_usados_mes_atual IS 'Projetos usados no mês atual';
COMMENT ON COLUMN cliente_assinaturas.ultimo_reset IS 'Data do último reset mensal do contador';
COMMENT ON COLUMN cliente_assinaturas.proximo_reset IS 'Data prevista para próximo reset';
COMMENT ON COLUMN cliente_assinaturas.status IS 'Status: ativa, pendente_renovacao, pausada, cancelada';

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_user_id ON cliente_assinaturas(user_id);
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_status ON cliente_assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_proximo_reset ON cliente_assinaturas(proximo_reset);

-- RLS (Row Level Security)
ALTER TABLE cliente_assinaturas ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário pode ver apenas suas próprias assinaturas
CREATE POLICY cliente_assinaturas_user_isolation ON cliente_assinaturas
  USING (user_id = auth.uid());

-- =====================================================
-- PARTE 3: CRIAR TRIGGERS E FUNCTIONS
-- =====================================================

-- 3.1. Function: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2. Triggers para atualizar updated_at
CREATE TRIGGER update_pacotes_definicoes_updated_at
  BEFORE UPDATE ON pacotes_definicoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cliente_pacotes_updated_at
  BEFORE UPDATE ON cliente_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planos_assinatura_updated_at
  BEFORE UPDATE ON planos_assinatura
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cliente_assinaturas_updated_at
  BEFORE UPDATE ON cliente_assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3.3. Function: Verificar se cliente já tem pacote ativo
CREATE OR REPLACE FUNCTION check_existing_active_package()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Contar pacotes ativos do usuário
  SELECT COUNT(*)
  INTO v_active_count
  FROM cliente_pacotes
  WHERE user_id = NEW.user_id
    AND status = 'ativo'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Se já existe um pacote ativo, impedir inserção/update
  IF v_active_count > 0 AND NEW.status = 'ativo' THEN
    RAISE EXCEPTION 'Cliente já possui um pacote ativo. Apenas um pacote ativo é permitido por vez.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar pacote único ativo
CREATE TRIGGER validate_single_active_package
  BEFORE INSERT OR UPDATE ON cliente_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION check_existing_active_package();

-- 3.4. Function: Verificar se cliente já tem assinatura ativa
CREATE OR REPLACE FUNCTION check_existing_active_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Contar assinaturas ativas do usuário
  SELECT COUNT(*)
  INTO v_active_count
  FROM cliente_assinaturas
  WHERE user_id = NEW.user_id
    AND status = 'ativa'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  -- Se já existe uma assinatura ativa, impedir inserção/update
  IF v_active_count > 0 AND NEW.status = 'ativa' THEN
    RAISE EXCEPTION 'Cliente já possui uma assinatura ativa. Apenas uma assinatura ativa é permitida por vez.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar assinatura única ativa
CREATE TRIGGER validate_single_active_subscription
  BEFORE INSERT OR UPDATE ON cliente_assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION check_existing_active_subscription();

-- 3.5. Function: Atualizar status do pacote automaticamente
CREATE OR REPLACE FUNCTION update_package_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se projetos esgotados, marcar como esgotado
  IF NEW.projetos_usados >= NEW.projetos_inclusos THEN
    NEW.status := 'esgotado';
  END IF;

  -- Se expirado, marcar como expirado
  IF NEW.data_expiracao < NOW() AND NEW.status = 'ativo' THEN
    NEW.status := 'expirado';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status do pacote
CREATE TRIGGER auto_update_package_status
  BEFORE UPDATE ON cliente_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION update_package_status();

-- =====================================================
-- PARTE 4: POPULAR DADOS INICIAIS (OPCIONAL)
-- =====================================================

-- 4.1. Atualizar billing_mode de usuários existentes para 'avulso'
-- Todos os usuários existentes começam com modalidade avulso
UPDATE users
SET billing_mode = 'avulso'
WHERE billing_mode IS NULL;

-- =====================================================
-- PARTE 5: VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as tabelas foram criadas
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICAÇÃO FINAL DE TABELAS';
  RAISE NOTICE '==============================================';

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pacotes_definicoes') THEN
    RAISE NOTICE '✅ Tabela pacotes_definicoes criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Tabela pacotes_definicoes NÃO foi criada';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cliente_pacotes') THEN
    RAISE NOTICE '✅ Tabela cliente_pacotes criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Tabela cliente_pacotes NÃO foi criada';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'planos_assinatura') THEN
    RAISE NOTICE '✅ Tabela planos_assinatura criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Tabela planos_assinatura NÃO foi criada';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cliente_assinaturas') THEN
    RAISE NOTICE '✅ Tabela cliente_assinaturas criada com sucesso';
  ELSE
    RAISE EXCEPTION '❌ Tabela cliente_assinaturas NÃO foi criada';
  END IF;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'MIGRATION CONCLUÍDA COM SUCESSO! ✅';
  RAISE NOTICE '==============================================';
END $$;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
