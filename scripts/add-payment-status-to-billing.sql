-- =====================================================
-- Migration: Adicionar Payment Status a Pacotes e Assinaturas
-- =====================================================
-- OBJETIVO: Permitir marcar pacotes/assinaturas como pagos
-- (primeira parcela ou integralmente)
--
-- SEVERIDADE: BAIXA - Nova funcionalidade
-- =====================================================

-- =====================================================
-- PARTE 1: ADICIONAR COLUNA payment_status EM cliente_pacotes
-- =====================================================

-- 1.1. Criar tipo ENUM para payment_status (se não existir)
DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('pendente', 'parcela1', 'pago');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1.2. Adicionar coluna payment_status em cliente_pacotes
ALTER TABLE cliente_pacotes
ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'pendente';

-- 1.3. Preencher payment_status padrão para registros existentes
UPDATE cliente_pacotes
SET payment_status = 'pendente'
WHERE payment_status IS NULL;

-- 1.4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cliente_pacotes_payment_status
ON cliente_pacotes(payment_status);

-- 1.5. Adicionar comentário explicativo
COMMENT ON COLUMN cliente_pacotes.payment_status IS 'Status de pagamento: pendente, parcela1 (primeira parcela paga), pago (integralmente pago)';

-- =====================================================
-- PARTE 2: ADICIONAR COLUNA payment_status EM cliente_assinaturas
-- =====================================================

-- 2.1. Adicionar coluna payment_status em cliente_assinaturas
ALTER TABLE cliente_assinaturas
ADD COLUMN IF NOT EXISTS payment_status payment_status_enum DEFAULT 'pendente';

-- 2.2. Preencher payment_status padrão para registros existentes
UPDATE cliente_assinaturas
SET payment_status = 'pendente'
WHERE payment_status IS NULL;

-- 2.3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_cliente_assinaturas_payment_status
ON cliente_assinaturas(payment_status);

-- 2.4. Adicionar comentário explicativo
COMMENT ON COLUMN cliente_assinaturas.payment_status IS 'Status de pagamento: pendente, parcela1 (primeira parcela paga), pago (integralmente pago)';

-- =====================================================
-- PARTE 3: ADICIONAR COLUNAS DE DATA DE PAGAMENTO (OPCIONAL)
-- =====================================================

-- 3.1. Adicionar datas de pagamento em cliente_pacotes
ALTER TABLE cliente_pacotes
ADD COLUMN IF NOT EXISTS data_pagamento_parcela1 TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_pagamento_integral TIMESTAMP;

COMMENT ON COLUMN cliente_pacotes.data_pagamento_parcela1 IS 'Data em que a primeira parcela foi marcada como paga';
COMMENT ON COLUMN cliente_pacotes.data_pagamento_integral IS 'Data em que o pagamento integral foi marcado como pago';

-- 3.2. Adicionar datas de pagamento em cliente_assinaturas
ALTER TABLE cliente_assinaturas
ADD COLUMN IF NOT EXISTS data_pagamento_parcela1 TIMESTAMP,
ADD COLUMN IF NOT EXISTS data_pagamento_integral TIMESTAMP;

COMMENT ON COLUMN cliente_assinaturas.data_pagamento_parcela1 IS 'Data em que a primeira parcela foi marcada como paga';
COMMENT ON COLUMN cliente_assinaturas.data_pagamento_integral IS 'Data em que o pagamento integral foi marcado como pago';

-- =====================================================
-- PARTE 4: VERIFICAÇÕES DE INTEGRIDADE
-- =====================================================

-- 4.1. Verificar se todos os registros de cliente_pacotes têm payment_status
DO $$
DECLARE
  sem_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO sem_status
  FROM cliente_pacotes
  WHERE payment_status IS NULL;

  IF sem_status > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_pacotes sem payment_status', sem_status;
  ELSE
    RAISE NOTICE 'OK: Todos os registros de cliente_pacotes têm payment_status';
  END IF;
END $$;

-- 4.2. Verificar se todos os registros de cliente_assinaturas têm payment_status
DO $$
DECLARE
  sem_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO sem_status
  FROM cliente_assinaturas
  WHERE payment_status IS NULL;

  IF sem_status > 0 THEN
    RAISE WARNING 'ATENÇÃO: % registros em cliente_assinaturas sem payment_status', sem_status;
  ELSE
    RAISE NOTICE 'OK: Todos os registros de cliente_assinaturas têm payment_status';
  END IF;
END $$;

-- =====================================================
-- PARTE 5: RELATÓRIO FINAL
-- =====================================================

DO $$
DECLARE
  pacotes_total INTEGER;
  pacotes_pendentes INTEGER;
  pacotes_parcela1 INTEGER;
  pacotes_pagos INTEGER;
  assinaturas_total INTEGER;
  assinaturas_pendentes INTEGER;
  assinaturas_parcela1 INTEGER;
  assinaturas_pagos INTEGER;
BEGIN
  -- Estatísticas de pacotes
  SELECT COUNT(*) INTO pacotes_total FROM cliente_pacotes;
  SELECT COUNT(*) INTO pacotes_pendentes FROM cliente_pacotes WHERE payment_status = 'pendente';
  SELECT COUNT(*) INTO pacotes_parcela1 FROM cliente_pacotes WHERE payment_status = 'parcela1';
  SELECT COUNT(*) INTO pacotes_pagos FROM cliente_pacotes WHERE payment_status = 'pago';

  -- Estatísticas de assinaturas
  SELECT COUNT(*) INTO assinaturas_total FROM cliente_assinaturas;
  SELECT COUNT(*) INTO assinaturas_pendentes FROM cliente_assinaturas WHERE payment_status = 'pendente';
  SELECT COUNT(*) INTO assinaturas_parcela1 FROM cliente_assinaturas WHERE payment_status = 'parcela1';
  SELECT COUNT(*) INTO assinaturas_pagos FROM cliente_assinaturas WHERE payment_status = 'pago';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PACOTES:';
  RAISE NOTICE '  Total: %', pacotes_total;
  RAISE NOTICE '  Pendentes: %', pacotes_pendentes;
  RAISE NOTICE '  Parcela 1 paga: %', pacotes_parcela1;
  RAISE NOTICE '  Integralmente pagos: %', pacotes_pagos;
  RAISE NOTICE '';
  RAISE NOTICE 'ASSINATURAS:';
  RAISE NOTICE '  Total: %', assinaturas_total;
  RAISE NOTICE '  Pendentes: %', assinaturas_pendentes;
  RAISE NOTICE '  Parcela 1 paga: %', assinaturas_parcela1;
  RAISE NOTICE '  Integralmente pagos: %', assinaturas_pagos;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRÓXIMOS PASSOS:';
  RAISE NOTICE '- Fazer deploy do código com APIs de payment';
  RAISE NOTICE '- Testar marcação de pagamento na interface';
  RAISE NOTICE '========================================';
END $$;
