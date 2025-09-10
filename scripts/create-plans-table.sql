-- ✅ TABELA DE PLANOS GLOBAIS - APENAS 2 PLANOS
-- Baseado nos dados do registro: Básico (R$ 299) e Profissional (R$ 399)

-- 1. Criar tabela plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_code VARCHAR(50) UNIQUE NOT NULL,  -- 'basico', 'profissional'
  name VARCHAR(100) NOT NULL,             -- 'Básico', 'Profissional' 
  price DECIMAL(10,2) NOT NULL,           -- 299.00, 399.00
  currency VARCHAR(3) DEFAULT 'BRL',      -- 'BRL'
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly'
  
  -- Limites do plano
  max_projects INTEGER,                   -- 30, 100
  max_users INTEGER,                      -- 10, 50  
  max_clients INTEGER,                    -- 100, 1000
  max_storage_gb INTEGER,                 -- 3, 10
  api_calls_per_day INTEGER,             -- 2000, 10000
  max_transactions_per_month INTEGER,    -- 500, 2000
  
  -- Features (JSONB)
  features JSONB,                        -- ["basic_support"] vs ["priority_support"]
  
  -- Metadados
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,          -- Para ordenação na UI
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Inserir ou atualizar os 2 planos (UPSERT para evitar duplicação)
INSERT INTO plans (
  plan_code, 
  name, 
  price, 
  max_projects, 
  max_users, 
  max_clients, 
  max_storage_gb, 
  api_calls_per_day,
  max_transactions_per_month,
  features, 
  description,
  sort_order
) VALUES 
(
  'basico',
  'Básico', 
  299.00,
  30,      -- 30 projetos
  10,      -- 10 usuários  
  100,     -- 100 clientes
  3,       -- 3GB de armazenamento
  2000,    -- 2000 API calls/dia
  500,     -- 500 transações/mês
  '["basic_support", "project_management", "client_management", "basic_reports", "email_notifications"]',
  'Plano básico com recursos essenciais para pequenas empresas',
  1
),
(
  'profissional',
  'Profissional',
  399.00,
  100,     -- 100 projetos  
  50,      -- 50 usuários
  1000,    -- 1000 clientes
  10,      -- 10GB de armazenamento
  10000,   -- 10000 API calls/dia
  2000,    -- 2000 transações/mês
  '["priority_support", "advanced_reports", "api_access", "bulk_operations", "integrations", "custom_fields"]',
  'Plano profissional com recursos avançados para empresas em crescimento',
  2
)
ON CONFLICT (plan_code) 
DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  max_projects = EXCLUDED.max_projects,
  max_users = EXCLUDED.max_users,
  max_clients = EXCLUDED.max_clients,
  max_storage_gb = EXCLUDED.max_storage_gb,
  api_calls_per_day = EXCLUDED.api_calls_per_day,
  max_transactions_per_month = EXCLUDED.max_transactions_per_month,
  features = EXCLUDED.features,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 3. ✅ REGRAS DE SEGURANÇA RLS (Row Level Security)

-- Habilitar RLS na tabela plans (apenas se não estiver habilitado)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'plans' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Política: Todos podem ler os planos (são globais)
DROP POLICY IF EXISTS "plans_read_all" ON plans;
CREATE POLICY "plans_read_all" ON plans 
  FOR SELECT 
  USING (true);

-- Política: Apenas superadmins podem modificar planos  
DROP POLICY IF EXISTS "plans_write_superadmin_only" ON plans;
CREATE POLICY "plans_write_superadmin_only" ON plans 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

-- 4. Índices para performance (apenas se não existirem)
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(plan_code);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_sort ON plans(sort_order);

-- 5. Comentários para documentação
COMMENT ON TABLE plans IS 'Planos globais disponíveis para todas as organizações - apenas 2 planos: Básico (R$ 299) e Profissional (R$ 399)';
COMMENT ON COLUMN plans.plan_code IS 'Código único do plano (basico, profissional)';
COMMENT ON COLUMN plans.price IS 'Preço mensal em reais (BRL) - valores baseados no registro.gerenciamento...';
COMMENT ON COLUMN plans.max_projects IS 'Limite máximo de projetos por organização';
COMMENT ON COLUMN plans.features IS 'Array JSON das funcionalidades incluídas no plano';

-- 6. Verificar dados inseridos
SELECT 
  plan_code,
  name, 
  price,
  max_projects,
  max_users,
  max_clients,
  max_storage_gb
FROM plans 
ORDER BY sort_order;
