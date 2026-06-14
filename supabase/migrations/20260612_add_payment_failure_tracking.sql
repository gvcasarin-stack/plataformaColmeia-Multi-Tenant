-- Adiciona colunas de rastreamento de falhas de pagamento na tabela organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_failure_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failure_at timestamptz;
