-- Criar tabela para transações financeiras (receitas e despesas variáveis)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('receita', 'despesa')),
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para custos fixos mensais
CREATE TABLE IF NOT EXISTS fixed_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_month_year ON financial_transactions(month, year);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(date);

CREATE INDEX IF NOT EXISTS idx_fixed_costs_month_year ON fixed_costs(month, year);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_category ON fixed_costs(category);
CREATE INDEX IF NOT EXISTS idx_fixed_costs_active ON fixed_costs(is_active);

-- Configurar RLS (Row Level Security)
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - permitir acesso total para usuários autenticados
CREATE POLICY IF NOT EXISTS "financial_transactions_policy" ON financial_transactions
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "fixed_costs_policy" ON fixed_costs
  FOR ALL USING (true);

-- Inserir dados iniciais de exemplo
INSERT INTO financial_transactions (type, category, description, amount, date, month, year) VALUES
  ('receita', 'Vendas', 'Venda adicional de equipamentos', 500.00, '2025-07-01', 7, 2025),
  ('despesa', 'Marketing', 'Publicidade online', 200.00, '2025-07-02', 7, 2025),
  ('despesa', 'Transporte', 'Combustível para visitas técnicas', 150.00, '2025-07-03', 7, 2025)
ON CONFLICT DO NOTHING;

INSERT INTO fixed_costs (category, description, amount, month, year, is_active) VALUES
  ('Escritório', 'Aluguel do escritório', 1500.00, 7, 2025, true),
  ('Pessoal', 'Salários da equipe', 8000.00, 7, 2025, true),
  ('Infraestrutura', 'Internet e telefone', 300.00, 7, 2025, true),
  ('Contabilidade', 'Serviços contábeis', 800.00, 7, 2025, true)
ON CONFLICT DO NOTHING;

-- Comentários para documentação
COMMENT ON TABLE financial_transactions IS 'Tabela para armazenar transações financeiras variáveis (receitas e despesas)';
COMMENT ON TABLE fixed_costs IS 'Tabela para armazenar custos fixos mensais da empresa';

COMMENT ON COLUMN financial_transactions.type IS 'Tipo da transação: receita ou despesa';
COMMENT ON COLUMN financial_transactions.category IS 'Categoria da transação (ex: Marketing, Vendas, etc.)';
COMMENT ON COLUMN financial_transactions.month IS 'Mês da transação (1-12)';
COMMENT ON COLUMN financial_transactions.year IS 'Ano da transação';

COMMENT ON COLUMN fixed_costs.category IS 'Categoria do custo fixo (ex: Escritório, Pessoal, etc.)';
COMMENT ON COLUMN fixed_costs.month IS 'Mês do custo fixo (1-12)';
COMMENT ON COLUMN fixed_costs.year IS 'Ano do custo fixo';
COMMENT ON COLUMN fixed_costs.is_active IS 'Indica se o custo fixo está ativo (soft delete)'; 