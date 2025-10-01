# 🎯 IDs DO STRIPE AGORA VÊM DO BANCO DE DADOS

## ✅ IMPLEMENTAÇÃO COMPLETA

Agora os **IDs do Stripe** (product_id e price_id) são buscados da tabela `plans`, garantindo **fonte única da verdade**.

---

## 📋 PASSO A PASSO PARA USAR

### 1️⃣ Execute o Script SQL

Execute o script para adicionar as colunas e popular os dados:

```bash
# Via psql
psql $DATABASE_URL -f scripts/add-stripe-ids-to-plans.sql

# Ou copie e cole no Supabase SQL Editor
```

**O script faz:**
- ✅ Adiciona colunas `stripe_product_id` e `stripe_price_id`
- ✅ Popula com os IDs atuais do Stripe
- ✅ Cria índices para performance
- ✅ Adiciona comentários nas colunas

### 2️⃣ Faça Deploy do Código

```bash
git add .
git commit -m "feat: buscar IDs do Stripe do banco de dados"
git push
```

### 3️⃣ Verifique se Funcionou

Acesse `/admin/assinaturas` e clique em "Fazer Upgrade". Os valores devem vir do banco!

---

## 🔄 COMO ATUALIZAR PREÇOS NO STRIPE

### Cenário: Você criou um novo preço no Stripe

**ANTES (hardcoded - precisava deploy):**
```typescript
// ❌ Tinha que editar código e fazer deploy
priceId: 'price_ANTIGO'
```

**AGORA (banco de dados - sem deploy!):**
```sql
-- ✅ Apenas atualiza o banco
UPDATE plans
SET
  stripe_price_id = 'price_NOVO_ID_AQUI',
  price = '249.00',
  updated_at = NOW()
WHERE plan_code = 'basico';
```

**Pronto! Mudança instantânea, sem deploy!** 🚀

---

## 📊 ESTRUTURA DA TABELA PLANS

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY,
  plan_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,

  -- ✅ NOVOS CAMPOS
  stripe_product_id TEXT,  -- ID do produto no Stripe
  stripe_price_id TEXT,    -- ID do preço no Stripe

  -- Limites do plano
  max_projects INTEGER,
  max_users INTEGER,
  max_clients INTEGER,
  max_storage_gb INTEGER,
  api_calls_per_day INTEGER,

  -- Metadados
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 ONDE OS IDs SÃO USADOS

### 1. Criação de Checkout Session
`src/app/api/stripe/create-checkout-session/route.ts`

```typescript
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price: plan.priceId,  // ✅ Vem do banco agora
    quantity: 1,
  }],
  // ...
});
```

### 2. Exibição de Planos
`src/app/admin/assinaturas/page.tsx`

```typescript
// ✅ Busca planos do banco via getStripePlans()
const plans = await getStripePlans();
// plans.basico.priceId vem do banco!
```

---

## 🛡️ SISTEMA DE FALLBACK

**Se a API falhar ou o banco não tiver os IDs:**

```typescript
// ✅ Usa valores de fallback hardcoded (segurança)
productId: basicoPlan?.stripe_product_id || STRIPE_IDS.basico.productId
priceId: basicoPlan?.stripe_price_id || STRIPE_IDS.basico.priceId
```

**Garantia de que nunca vai quebrar!**

---

## 💾 CACHE INTELIGENTE

- ⚡ Cache em memória por **5 minutos**
- 🔄 Atualização automática após o tempo
- 📈 Performance mantida
- 🎯 Sempre dados frescos do banco

---

## 📝 EXEMPLO PRÁTICO

### Cenário: Atualizar plano Profissional para R$ 379

**1. Crie novo preço no Stripe Dashboard:**
- Produto: "Plano Profissional"
- Preço: R$ 379,00/mês
- Copie o ID: `price_1XYZ123ABC`

**2. Atualize o banco:**
```sql
UPDATE plans
SET
  stripe_price_id = 'price_1XYZ123ABC',
  price = '379.00',
  updated_at = NOW()
WHERE plan_code = 'profissional';
```

**3. Pronto!** ✅
- Não precisa deploy
- Não precisa restart
- Mudança instantânea
- Cache atualiza em max 5 minutos

---

## ✅ BENEFÍCIOS

| Antes (Hardcoded) | Agora (Banco) |
|-------------------|---------------|
| ❌ Deploy para mudar preços | ✅ UPDATE no banco |
| ❌ Código em múltiplos lugares | ✅ Única fonte da verdade |
| ❌ Risco de dessincronia | ✅ Sempre consistente |
| ❌ Não escalável | ✅ Novos planos sem código |
| ❌ Difícil manutenção | ✅ Fácil atualização |

---

## 🚨 IMPORTANTE

### O que MUDA com frequência:
- ✅ `stripe_price_id` - Muda quando você ajusta preços
- ✅ `price` - O valor em reais do plano

### O que RARAMENTE muda:
- 🔒 `stripe_product_id` - Produto permanece o mesmo
- 🔒 `plan_code` - Código do plano (basico/profissional)

### Regra de ouro:
**Sempre atualize `stripe_price_id` E `price` juntos!**

```sql
-- ✅ CERTO
UPDATE plans SET
  stripe_price_id = 'price_NOVO',
  price = '299.00'
WHERE plan_code = 'basico';

-- ❌ ERRADO (só um campo)
UPDATE plans SET price = '299.00' WHERE plan_code = 'basico';
```

---

## 🎉 RESULTADO

Agora você tem um sistema:
- ✅ Robusto
- ✅ Escalável
- ✅ Fácil de manter
- ✅ Com fallback seguro
- ✅ Sem hardcode
- ✅ Fonte única da verdade

**Atualize preços sem deploy! 🚀**
