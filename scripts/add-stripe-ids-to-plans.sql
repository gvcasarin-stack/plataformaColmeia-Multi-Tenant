-- ✅ ADICIONAR COLUNAS DE IDs DO STRIPE NA TABELA PLANS
-- Execute este script para adicionar suporte aos IDs do Stripe
-- Data: Janeiro 2025

-- ========================================
-- ADICIONAR COLUNAS (se não existirem)
-- ========================================

-- Adicionar coluna stripe_product_id
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

-- Adicionar coluna stripe_price_id
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN plans.stripe_product_id IS 'ID do produto no Stripe (ex: prod_XXX)';
COMMENT ON COLUMN plans.stripe_price_id IS 'ID do preço no Stripe (ex: price_XXX) - muda quando preço é atualizado';

-- ========================================
-- POPULAR COM IDs DO STRIPE ATUAIS
-- ========================================

-- Atualizar plano Básico
UPDATE plans
SET
  stripe_product_id = 'prod_SFxl9TpTXNL0YZ',
  stripe_price_id = 'price_1RLRppAkIzZurozaQOxPIBAL',
  updated_at = NOW()
WHERE plan_code = 'basico';

-- Atualizar plano Profissional
UPDATE plans
SET
  stripe_product_id = 'prod_SFyTYFsmWx4aco',
  stripe_price_id = 'price_1RLSWCAkIzZurozaH6jYWzQW',
  updated_at = NOW()
WHERE plan_code = 'profissional';

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Ver os planos atualizados
SELECT
  plan_code,
  name,
  price,
  stripe_product_id,
  stripe_price_id,
  is_active,
  updated_at
FROM plans
WHERE is_active = true
ORDER BY sort_order;

-- ========================================
-- ÍNDICES (OPCIONAL - para performance)
-- ========================================

-- Criar índice para busca por stripe_product_id
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product_id
ON plans(stripe_product_id)
WHERE stripe_product_id IS NOT NULL;

-- Criar índice para busca por stripe_price_id
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id
ON plans(stripe_price_id)
WHERE stripe_price_id IS NOT NULL;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================

/*
🎯 QUANDO ATUALIZAR PREÇOS NO STRIPE:

1. Crie um novo Price no Stripe Dashboard
2. Atualize a tabela plans com o novo price_id:

   UPDATE plans
   SET stripe_price_id = 'price_NOVO_ID_AQUI',
       price = 'NOVO_VALOR',
       updated_at = NOW()
   WHERE plan_code = 'basico';

3. NÃO precisa fazer deploy!
4. As mudanças são instantâneas

⚠️ IMPORTANTE:
- stripe_product_id geralmente NÃO muda
- stripe_price_id muda quando você ajusta preços no Stripe
- Sempre atualize ambos os campos juntos
*/
