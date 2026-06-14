# Sistema Anti-Churn de Pagamentos — Documentação

**Status:** Implementado em 2026-06-12  
**Branch:** `clean-main`

---

## Visão Geral

Sistema completo de recuperação de pagamentos falhos com bloqueio progressivo, notificações por e-mail, redirecionamento para atualização de cartão e painel de controle para o superadmin. Integra Stripe Webhooks, AWS SES e Supabase.

---

## Pré-requisito: Migração SQL

Antes de ativar o sistema, execute no Supabase (Dashboard → SQL Editor):

```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS payment_failure_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failure_at timestamptz;
```

Arquivo de migração: `supabase/migrations/20260612_add_payment_failure_tracking.sql`

---

## Fluxo Completo

```
Stripe tenta cobrança
  └─ Falha
       ├─ 1ª falha → status = past_due, payment_failure_count = 1
       │              E-mail: "Problema no pagamento" → admin da tenant
       │              E-mail: notificação → superadmin
       │
       ├─ 2ª falha → status = past_due, payment_failure_count = 2
       │              E-mail: "Segunda tentativa falhou" → admin da tenant
       │              E-mail: notificação → superadmin
       │
       └─ 3ª falha → status = suspended, payment_failure_count = 3
                      E-mail: "Acesso suspenso" → admin da tenant
                      E-mail: notificação → superadmin
                      Middleware bloqueia acesso → /admin/bloqueio

Admin atualiza cartão no Stripe Customer Portal
  └─ Stripe retenta e aprova
       └─ invoice.payment_succeeded
            ├─ status = active
            ├─ payment_failure_count = 0
            └─ E-mail: "Pagamento confirmado" → admin da tenant (se havia falhas)
```

---

## Arquivos e Responsabilidades

### Backend / API

#### `src/app/api/webhooks/stripe/route.ts` (modificado)

Ponto central do sistema. Processa todos os eventos Stripe.

**Novidades em `handleInvoicePaymentFailed`:**
- Busca o `payment_failure_count` atual da organização
- Incrementa o contador e atualiza `last_payment_failure_at`
- Na 3ª falha: seta `subscription_status = 'suspended'`
- Envia e-mail para o owner/admin da tenant via AWS SES
- Envia notificação paralela para o superadmin (`atendimento.colmeiasolar@gmail.com`)

**Novidades em `handleInvoicePaymentSucceeded`:**
- Zera `payment_failure_count = 0`
- Restaura `subscription_status = 'active'`
- Envia e-mail de confirmação ao admin (somente se havia falhas anteriores)

**Constantes configuráveis no topo do arquivo:**
```typescript
const SUPERADMIN_EMAIL = 'atendimento.colmeiasolar@gmail.com';
const MAX_FAILURES_BEFORE_SUSPEND = 3; // altere aqui para mudar o limite
```

**Funções auxiliares adicionadas:**
- `getSESClient()` — inicializa o cliente AWS SES
- `sendBillingSES(to, subject, bodyHtml)` — envia e-mail via SES (falha silenciosa)
- `getOrgOwnerEmail(supabase, orgId)` — busca e-mail do admin da tenant em `profiles`

---

#### `src/app/api/billing/portal/route.ts` (novo)

Gera um link do Stripe Customer Portal para o tenant atualizar o cartão.

**Método:** `POST`  
**Headers necessários:** `x-tenant-id`  
**Body (opcional):** `{ returnUrl: string }` — URL de retorno após o portal  
**Retorna:** `{ url: string }` — URL do portal Stripe

Uso: chamado por `/admin/bloqueio` e `/admin/assinaturas` ao clicar em "Atualizar forma de pagamento".

---

#### `src/app/api/admin/billing/invoices/route.ts` (novo)

Retorna as últimas 12 faturas do tenant via Stripe.

**Método:** `GET`  
**Headers necessários:** `x-tenant-id`  
**Retorna:** `{ success: true, data: Invoice[] }`

Cada fatura contém: `id`, `number`, `date` (timestamp Unix), `amount` (centavos), `currency`, `status` (`paid`/`open`/`uncollectible`), `pdf` (link para download), `hosted_url` (link web da fatura).

Se o tenant não tiver `stripe_customer_id`, retorna array vazio sem erro.

---

#### `src/app/api/superadmin/tenants-billing/route.ts` (novo)

Retorna dados de billing de **todas** as tenants. Acesso restrito a superadmin.

**Método:** `GET`  
**Headers necessários:** `x-tenant-id` + `authorization` (Bearer token do usuário)  
**Retorna:** `{ success: true, data: TenantBilling[] }`

Campos retornados por tenant: `id`, `name`, `slug`, `status`, `subscription_status`, `payment_failure_count`, `last_payment_failure_at`, `stripe_customer_id`, `stripe_subscription_id`, `is_trial`, `trial_end_date`, `updated_at`, `plans { name, price }`.

Ordenação padrão: inadimplentes e suspensos primeiro, depois por maior número de falhas.

---

### Páginas

#### `src/app/admin/bloqueio/page.tsx` (nova)

Página exibida quando o acesso está suspenso por inadimplência. Não usa o layout admin (sidebar), renderiza tela cheia própria (idêntico ao padrão das páginas `account-suspended` e `account-canceled`).

**Acesso:** qualquer usuário — sem autenticação obrigatória (bypass em `AdminLayout`)  
**Funcionalidade:** botão "Atualizar forma de pagamento" → chama `/api/billing/portal` → redireciona para Stripe Customer Portal

O acesso é restaurado automaticamente quando o Stripe recebe o pagamento e dispara `invoice.payment_succeeded`.

---

#### `src/app/admin/superadmin/assinaturas/page.tsx` (nova)

Painel de controle exclusivo para o superadmin. Exibe todas as tenants e seus status de cobrança em tempo real.

**Acesso:** `role === 'superadmin'` (verificação client-side e server-side)  
**Caminho no menu:** "Controle de Assinaturas" (ícone `ShieldCheck`, visível apenas para superadmin)

**Funcionalidades:**
- Cards de resumo: inadimplentes, suspensos, com falhas
- Tabela completa com: nome, plano, status (badge colorido), nº de falhas, data da última falha, data de atualização, link direto para o cliente no Stripe Dashboard
- Filtros: Todos / Inadimplentes / Suspensos / Ativos / Trial / Com falhas
- Busca por nome ou slug
- Botão de refresh manual

---

### Componentes

#### `src/components/admin/PastDueBanner.tsx` (novo)

Banner amarelo fixo no topo do painel admin, exibido apenas quando `subscription_status === 'past_due'`.

**Comportamento:**
- Faz uma chamada a `/api/tenant/organization` ao montar
- Se o status não for `past_due`, retorna `null` (sem impacto de performance)
- Pode ser dispensado pelo usuário (botão X) — sem persistência
- Botão "Regularizar agora" → abre Stripe Customer Portal via `/api/billing/portal`

---

### Infraestrutura

#### `src/middleware.ts` (modificado)

Dois ajustes:

1. `/admin/bloqueio` adicionado à lista de bypass (não redireciona, não verifica tenant)
2. Antes de verificar `tenantStatus === 'suspended'` (suspensão administrativa), verifica:
   ```typescript
   if (tenantCheck.subscriptionStatus === 'suspended') {
     return NextResponse.redirect(new URL('/admin/bloqueio', request.url));
   }
   ```
   
   Distinção importante:
   - `organization.status === 'suspended'` → suspensão administrativa → `/account-suspended`
   - `organization.subscription_status === 'suspended'` → suspensão por billing → `/admin/bloqueio`

#### `src/app/admin/layout.tsx` (modificado)

- Importa e renderiza `<PastDueBanner />` acima do conteúdo
- `/admin/bloqueio` adicionado ao bypass de autenticação
- Wrapper `flex flex-col h-screen` + inner `flex flex-1 overflow-hidden` para acomodar o banner sem quebrar o layout
- Placeholder de loading do sidebar: `h-full` (era `h-screen`)

#### `src/components/ui/layout-manager.tsx` (modificado)

- Root div: `h-full` (era `h-screen`) — necessário para funcionar dentro do novo wrapper do layout

#### `src/components/layouts/AdminSidebar.tsx` (modificado)

- `aside`: `h-full` (era `h-screen`) — acompanha o wrapper do layout
- Novo item de menu: "Controle de Assinaturas" → `/admin/superadmin/assinaturas`, visível apenas para `isSuperAdmin`

#### `src/app/admin/assinaturas/page.tsx` (modificado)

Três adições:

1. **Alerta `past_due`**: card amarelo com botão "Atualizar forma de pagamento"
2. **Alerta `suspended`**: card vermelho com botão "Regularizar pagamento"
3. **Seção "Histórico de Faturas"**: tabela com as últimas 12 faturas, status colorido, download PDF, link de visualização online, botão "Gerenciar assinatura" (Stripe Portal) para assinaturas ativas

---

## Banco de Dados

### Colunas adicionadas à tabela `organizations`

| Coluna | Tipo | Default | Descrição |
|---|---|---|---|
| `payment_failure_count` | `integer` | `0` | Número de falhas consecutivas de pagamento |
| `last_payment_failure_at` | `timestamptz` | `null` | Data/hora da última falha |

### Colunas existentes utilizadas

| Coluna | Valores relevantes | Gerenciado por |
|---|---|---|
| `subscription_status` | `active`, `past_due`, `suspended`, `cancelled` | Webhook Stripe |
| `status` | `active`, `suspended`, `canceled`, `pending` | Administrativo |
| `stripe_customer_id` | ID do customer no Stripe | Webhook checkout |
| `stripe_subscription_id` | ID da subscription no Stripe | Webhook subscription |

---

## E-mails Disparados

Todos enviados via AWS SES. Remetente: `SES_SENDER_EMAIL` ou `EMAIL_FROM` do `.env`.

| Evento | Destinatário | Assunto |
|---|---|---|
| 1ª falha | Admin da tenant | "Problema no pagamento da sua assinatura" |
| 2ª falha | Admin da tenant | "Segunda tentativa de cobrança falhou — ação necessária" |
| 3ª falha | Admin da tenant | "Acesso suspenso por inadimplência" |
| Pagamento OK (se havia falhas) | Admin da tenant | "Pagamento confirmado — acesso restaurado" |
| Qualquer falha | Superadmin | "[Billing] Falha de pagamento — {tenant} (tentativa N)" |

O e-mail do admin da tenant é buscado na tabela `profiles` filtrando por `organization_id` e `role = 'admin'`.

---

## Variáveis de Ambiente Necessárias

Todas já devem estar configuradas:

```
STRIPE_SECRET_KEY          # Chave secreta do Stripe
STRIPE_WEBHOOK_SECRET      # Secret do webhook (para verificar assinatura)
AWS_REGION                 # Região AWS (ex: sa-east-1)
AWS_ACCESS_KEY_ID          # Credencial AWS
AWS_SECRET_ACCESS_KEY      # Credencial AWS
SES_SENDER_EMAIL           # E-mail remetente verificado no SES
```

---

## Como Testar (Stripe CLI)

```bash
# Simular falha de pagamento
stripe trigger invoice.payment_failed

# Simular pagamento aprovado
stripe trigger invoice.payment_succeeded

# Simular cancelamento
stripe trigger customer.subscription.deleted
```

Para testar o fluxo completo localmente:
1. Inicie o servidor: `npm run dev`
2. Em outro terminal: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. Dispare os eventos com `stripe trigger`

---

## Pontos de Atenção

- **Trial não é afetado**: tenants em trial têm `is_trial = true` e não possuem `stripe_subscription_id`. O webhook não toca nelas.
- **Stripe retenta automaticamente**: ao atualizar o cartão no Customer Portal, o Stripe agenda uma nova tentativa de cobrança. O webhook `invoice.payment_succeeded` restaura o acesso.
- **Idempotência**: o webhook já usa a tabela `stripe_webhook_events` para evitar processar o mesmo evento duas vezes.
- **`payment_failure_count` é zerado apenas em `payment_succeeded`**: se o admin atualizar o cartão mas a cobrança ainda não acontecer, o contador permanece. Isso é correto.
- **E-mails têm falha silenciosa**: se o AWS SES falhar, o webhook continua sem erro. O status no banco já foi atualizado.
- **Superadmin fixo**: o e-mail do superadmin (`atendimento.colmeiasolar@gmail.com`) está hardcoded como constante no topo do webhook. Para mudar, altere `SUPERADMIN_EMAIL` em `route.ts`.
