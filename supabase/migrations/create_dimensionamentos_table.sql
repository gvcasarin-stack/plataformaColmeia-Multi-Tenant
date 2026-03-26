-- =====================================================
-- TABELA: dimensionamentos
-- Descrição: Armazena histórico de dimensionamentos de sistemas fotovoltaicos
-- Tipos suportados: on-grid, hibrido, off-grid
-- =====================================================

CREATE TABLE IF NOT EXISTS dimensionamentos (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Tipo do sistema
  tipo_sistema VARCHAR(20) NOT NULL CHECK (tipo_sistema IN ('on-grid', 'hibrido', 'off-grid')),
  tipo_consumidor VARCHAR(20) NOT NULL CHECK (tipo_consumidor IN ('residencial', 'comercial')),
  
  -- Configuração do sistema (condicional)
  objetivo_bateria VARCHAR(30) CHECK (objetivo_bateria IN ('backup', 'inversao-fluxo', NULL)),
  backup_com_fv BOOLEAN DEFAULT false,
  tipo_ligacao VARCHAR(20) CHECK (tipo_ligacao IN ('monofasica-127', 'monofasica-220', 'bifasica', 'trifasica', NULL)),
  
  -- Dados de entrada
  consumo_mensal NUMERIC(10, 2) NOT NULL, -- kWh
  estado VARCHAR(2) NOT NULL, -- UF
  irradiacao NUMERIC(4, 2) NOT NULL, -- HSP (horas de sol pico)
  autonomia_desejada INTEGER, -- horas (para sistemas com bateria)
  potencia_modulo NUMERIC(6, 2) DEFAULT 550, -- W
  
  -- Cargas elétricas (JSONB para flexibilidade)
  cargas JSONB DEFAULT '[]'::jsonb,
  -- Estrutura: [{ nome: string, potencia: number, quantidade: number, horasDia: number, consumoDiario: number, prioritaria: boolean }]
  
  -- Resultados do Sistema Fotovoltaico
  sistema_fv JSONB,
  -- Estrutura: { potencia: number, modulos: number, area: number, geracaoDiaria: number }
  
  -- Resultados do Sistema de Baterias (se aplicável)
  sistema_baterias JSONB,
  -- Estrutura: { capacidadeUtil: number, capacidadeTotal: number, modulos: number, tensao: number, correnteMaxima: number, autonomiaReal: number, dod: number }
  
  -- Resultados do Inversor (se aplicável)
  sistema_inversor JSONB,
  -- Estrutura: { potenciaMinima: number, tipo: string, entradaFV: number, entradaBaterias: number }
  
  -- Estimativa financeira
  economia_mensal NUMERIC(10, 2), -- kWh
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- =====================================================
-- ÍNDICES para otimização de queries
-- =====================================================

CREATE INDEX idx_dimensionamentos_user_id ON dimensionamentos(user_id);
CREATE INDEX idx_dimensionamentos_tenant_id ON dimensionamentos(tenant_id);
CREATE INDEX idx_dimensionamentos_created_at ON dimensionamentos(created_at DESC);
CREATE INDEX idx_dimensionamentos_tipo_sistema ON dimensionamentos(tipo_sistema);

-- =====================================================
-- TRIGGER para atualizar updated_at automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dimensionamentos_updated_at
  BEFORE UPDATE ON dimensionamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) - Segurança Multi-Tenant
-- =====================================================

ALTER TABLE dimensionamentos ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios dimensionamentos
CREATE POLICY "Users can view own dimensionamentos"
  ON dimensionamentos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios dimensionamentos
CREATE POLICY "Users can insert own dimensionamentos"
  ON dimensionamentos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios dimensionamentos
CREATE POLICY "Users can update own dimensionamentos"
  ON dimensionamentos
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios dimensionamentos
CREATE POLICY "Users can delete own dimensionamentos"
  ON dimensionamentos
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- COMENTÁRIOS para documentação
-- =====================================================

COMMENT ON TABLE dimensionamentos IS 'Histórico de dimensionamentos de sistemas fotovoltaicos (on-grid, híbrido, off-grid)';
COMMENT ON COLUMN dimensionamentos.tipo_sistema IS 'Tipo do sistema: on-grid, hibrido, off-grid';
COMMENT ON COLUMN dimensionamentos.tipo_consumidor IS 'Tipo de consumidor: residencial, comercial';
COMMENT ON COLUMN dimensionamentos.objetivo_bateria IS 'Objetivo do armazenamento: backup, inversao-fluxo';
COMMENT ON COLUMN dimensionamentos.backup_com_fv IS 'Se o backup inclui sistema fotovoltaico';
COMMENT ON COLUMN dimensionamentos.tipo_ligacao IS 'Tipo de ligação: monofasica-127, monofasica-220, bifasica, trifasica';
COMMENT ON COLUMN dimensionamentos.cargas IS 'Array JSON com cargas elétricas detalhadas';
COMMENT ON COLUMN dimensionamentos.sistema_fv IS 'Resultados do dimensionamento fotovoltaico';
COMMENT ON COLUMN dimensionamentos.sistema_baterias IS 'Resultados do dimensionamento de baterias';
COMMENT ON COLUMN dimensionamentos.sistema_inversor IS 'Especificações do inversor';

