# 🏢 IMPLEMENTAÇÃO MULTI-TENANT - CHECKLIST COMPLETO

## 📋 **STATUS GERAL**

### ✅ **CONCLUÍDO**
- [x] **PASSO 1: ESTRUTURA DO BANCO DE DADOS**
  - [x] Criação das tabelas multi-tenant (`organizations`, `users`, `projects`, etc.)
  - [x] Implementação de RLS (Row Level Security) para isolamento
  - [x] Funções SQL para controle de limites e trial
  - [x] Sistema de trial de 7 dias implementado
  - [x] Configuração de planos (básico/profissional)

- [x] **PASSO 2: MIDDLEWARE E DETECÇÃO DE TENANT**
  - [x] Middleware configurado para detectar subdomínios
  - [x] Validação de tenant no banco de dados
  - [x] Headers de tenant configurados (`x-tenant-id`, `x-tenant-slug`, etc.)
  - [x] Redirecionamento para `tenant-not-found` quando necessário

- [x] **PASSO 3: APIS DE SUPORTE**
  - [x] `/api/check-slug` - Validação de disponibilidade de slug
  - [x] `/api/tenant/organization` - Informações da organização
  - [x] `/api/tenant/trial-status` - Status do trial
  - [x] `/api/tenant/can-create` - Verificação de limites

- [x] **PASSO 4: FORMULÁRIO DE REGISTRO**
  - [x] Componente `RegistrationForm` completo
  - [x] Validação em tempo real de slug
  - [x] Validação de senha com requisitos
  - [x] Formulário multi-step (3 etapas)
  - [x] Integração com server actions

- [x] **PASSO 5: SERVER ACTIONS E CONTEXTOS**
  - [x] `registration-actions.ts` - Criação de organizações
  - [x] `TenantContext.tsx` - Context React para tenant
  - [x] `TrialBanner.tsx` - Banner de status do trial
  - [x] Página `tenant-not-found` implementada

### ✅ **CONCLUÍDO**
- [x] **PASSO 6: CORREÇÕES CRÍTICAS DE SEGURANÇA**
  - [x] Auditoria completa de segurança multi-tenant
  - [x] Correção de APIs críticas (projects/unified, financial/transactions)
  - [x] Correção de server actions (updateProjectAction, uploadProjectFileAction)
  - [x] Implementação de utilitários de segurança centralizados
  - [x] Criação do component FeatureGuard para bloqueio de funcionalidades
  - [x] Sistema de verificação automática de tenant_id

### 🔄 **EM ANDAMENTO**
- [ ] **PASSO 7: SISTEMA DE EMAIL E REDIRECIONAMENTO**
  - [ ] Configurar envio de email com o link direto para o tenant
  - [ ] Implementar o redirecionamento final pós-registro

### ⏳ **PENDENTE - CRÍTICO PARA PRODUÇÃO**

- [ ] **PASSO 8: INTEGRAÇÃO COM STRIPE (MODAL DE UPGRADE)**
  - [ ] Desenvolver componente `UpgradeModal.tsx` com integração Stripe
  - [ ] Implementar server actions para criação de checkout sessions
  - [ ] Configurar webhooks do Stripe para ativar assinaturas
  - [ ] Implementar fluxo de pagamento e ativação automática
  - [ ] Página `/billing/upgrade` para gerenciamento de assinatura

- [x] **PASSO 8.5: SISTEMA DE BLOQUEIO INTELIGENTE (CONCLUÍDO)**
  - [x] Implementar `FeatureGuard` component para bloquear funcionalidades expiradas
  - [x] Modal de upgrade obrigatório quando trial expira
  - [x] Bloqueio de criação de novos recursos (projetos, clientes, usuários)
  - [x] Hook `useTrialStatus` para verificações programáticas
  - [x] Utilitários de segurança centralizados (`tenant-security.ts`)

- [ ] **PASSO 9: CRON JOB E AUTOMAÇÃO**
  - [ ] Configurar Vercel Cron ou GitHub Actions para `expire_trials()`
  - [ ] Sistema de emails automáticos para lembretes (3, 1, 0 dias)
  - [ ] Função para suspensão automática de organizações inadimplentes

- [ ] **PASSO 10: ATUALIZAR SERVER ACTIONS EXISTENTES**
  - [ ] Auditoria completa de todas as server actions existentes
  - [ ] Integrar verificação de `tenant_id` e limites em todas as operações
  - [ ] Migrar server actions antigas para padrão multi-tenant
  - [ ] Implementar middleware de verificação automática

- [ ] **PASSO 11: SISTEMA DE MÉTRICAS E MONITORAMENTO**
  - [ ] Dashboard de métricas por tenant (uso de recursos)
  - [ ] Alertas automáticos para organizações próximas dos limites
  - [ ] Analytics de conversão de trial para pagante
  - [ ] Monitoramento de performance por tenant

- [ ] **PASSO 12: TESTES DE ISOLAMENTO E FLUXO COMPLETO**
  - [ ] Testes automatizados de isolamento entre tenants
  - [ ] Testes de stress com múltiplos tenants simultâneos
  - [ ] Validação de segurança RLS
  - [ ] Testes de performance com grande volume de dados

---

## 🗂️ **ARQUIVOS IMPLEMENTADOS**

### **📁 Banco de Dados**
- `supabase/sql/complete_multi_tenant_setup.sql` - Setup completo do banco
- `supabase/sql/add_trial_system.sql` - Sistema de trial

### **📁 Middleware e Roteamento**
- `src/middleware.ts` - Detecção de tenant e roteamento
- `src/app/page.tsx` - Página principal com suporte a registro
- `src/app/tenant-not-found/page.tsx` - Página de erro para tenant

### **📁 APIs**
- `src/app/api/check-slug/route.ts` - Validação de slug
- `src/app/api/tenant/organization/route.ts` - Dados da organização
- `src/app/api/tenant/trial-status/route.ts` - Status do trial
- `src/app/api/tenant/can-create/route.ts` - Verificação de limites

### **📁 Componentes**
- `src/components/multi-tenant/RegistrationForm.tsx` - Formulário de registro
- `src/components/multi-tenant/TrialBanner.tsx` - Banner de trial
- `src/components/security/FeatureGuard.tsx` - Bloqueio de funcionalidades ✨ NOVO

### **📁 Server Actions e Contextos**
- `src/lib/actions/registration-actions.ts` - Ações de registro
- `src/lib/actions/multi-tenant-project-actions.ts` - Ações seguras de projetos
- `src/lib/contexts/TenantContext.tsx` - Context do tenant

### **📁 Utilitários de Segurança** ✨ NOVO
- `src/lib/utils/tenant-security.ts` - Helpers centralizados de segurança
- `src/lib/hooks/useTrialStatus.ts` - Hook para verificação de trial

---

## 🌐 **CONFIGURAÇÃO DE DNS E DOMÍNIOS**

### **Configuração Necessária no Vercel:**

1. **Domínio Principal:**
   - `gerenciamentofotovoltaico.com.br` → Projeto Vercel

2. **Wildcard Subdomínio:**
   - `*.gerenciamentofotovoltaico.com.br` → Mesmo projeto Vercel

3. **Subdomínio de Registro:**
   - `registro.gerenciamentofotovoltaico.com.br` → Mesmo projeto Vercel

### **Registros DNS Necessários:**
```
CNAME   www                    gerenciamentofotovoltaico.com.br
CNAME   *                      gerenciamentofotovoltaico.com.br
CNAME   registro               gerenciamentofotovoltaico.com.br
```

---

## 🔄 **FLUXO DE REGISTRO E LOGIN**

### **1. Acesso ao Registro:**
- Usuário acessa: `registro.gerenciamentofotovoltaico.com.br`
- Middleware detecta `isRegistroSite = true`
- Página principal (`src/app/page.tsx`) renderiza `RegistrationForm`

### **2. Processo de Registro:**
1. **Etapa 1:** Informações da empresa (nome, slug)
2. **Etapa 2:** Dados do administrador (nome, email, senha)
3. **Etapa 3:** Seleção de plano e aceite de termos

### **3. Criação da Organização:**
- Server action `registerOrganization` é chamada
- Usuário é criado no Supabase Auth
- Organização é criada com trial de 7 dias
- Usuário é inserido na tabela `users` com `tenant_id`

### **4. Redirecionamento:**
- Após sucesso: `https://{slug}.gerenciamentofotovoltaico.com.br/admin/login?welcome=true&email={email}`

### **5. Login no Tenant:**
- Middleware detecta subdomínio e valida tenant
- Headers são configurados com informações do tenant
- Usuário faz login normalmente

---

## 🛡️ **SEGURANÇA E ISOLAMENTO**

### **Row Level Security (RLS):**
- Todas as tabelas têm políticas RLS baseadas em `tenant_id`
- Usuários só acessam dados da própria organização
- Políticas utilizam `auth.jwt()` para evitar recursão

### **Validações de Slug:**
- Lista de slugs reservados (admin, api, www, etc.)
- Validação de formato (3-30 caracteres, letras/números/hífen)
- Verificação de disponibilidade em tempo real
- Sugestões automáticas para slugs indisponíveis

### **Rate Limiting:**
- API `/api/check-slug` tem rate limiting por IP
- Máximo 10 requests por minuto

---

## 📊 **SISTEMA DE TRIAL E PLANOS**

### **Trial de 7 Dias:**
- ✅ Ativado automaticamente para novas organizações
- ✅ Acesso completo a todas as funcionalidades
- ✅ Banner de status visível na interface (`TrialBanner.tsx`)
- ✅ Bloqueio suave após expiração (read-only)
- ⚠️ **PENDENTE:** Modal obrigatório de upgrade quando trial expira
- ⚠️ **PENDENTE:** Emails automáticos de lembrete (3, 1, 0 dias)

### **Planos Disponíveis:**

#### **Básico - R$ 299/mês:**
- 30 projetos
- 3GB de armazenamento  
- 10 usuários
- 100 clientes
- Suporte por email

#### **Profissional - R$ 399/mês (POPULAR):**
- 100 projetos
- 10GB de armazenamento
- 50 usuários
- 1.000 clientes
- Suporte prioritário
- Relatórios avançados

### **Verificação de Limites:**
- ✅ Função SQL `can_create_resource()` verifica limites antes da criação
- ✅ API `/api/tenant/can-create` expõe a verificação
- ✅ Bloqueio automático quando limites são atingidos
- ✅ Mensagens específicas sobre qual limite foi atingido
- ⚠️ **PENDENTE:** Interceptadores automáticos em todas as server actions antigas

### **Sistema de Bloqueio Inteligente:**
- ✅ **Trial Válido:** Acesso completo a todas as funcionalidades
- ✅ **Trial Expirado:** Modo somente leitura + modal de upgrade
- ✅ **Limites Atingidos:** Bloqueio específico por recurso (projetos, usuários, etc.)
- ✅ **Component `<FeatureGuard>`:** Protege funcionalidades baseado em trial/limites
- ✅ **Modal persistente de upgrade:** Não pode ser fechado quando trial expira
- ✅ **Hook `useTrialStatus`:** Verificação programática de status
- ✅ **Helpers de segurança:** Funções centralizadas para verificação de tenant

---

## 🔐 **CORREÇÕES DE SEGURANÇA IMPLEMENTADAS**

### **🚨 Problemas Críticos Resolvidos:**
- ✅ **Vazamento de dados entre tenants:** APIs agora filtram por `tenant_id`
- ✅ **Server actions inseguras:** Principais actions verificam acesso
- ✅ **Trial sem bloqueio efetivo:** FeatureGuard bloqueia funcionalidades
- ✅ **Falta de verificação de limites:** Sistema verifica antes de criar recursos

### **🛡️ APIs Corrigidas para Multi-Tenant:**
- `src/app/api/projects/unified/route.ts` - Projetos filtrados por tenant
- `src/app/api/financial/transactions/route.ts` - Dados financeiros isolados
- `src/app/api/projects/unified/payment/route.ts` - Pagamentos verificam tenant
- `src/app/api/admin/config/route.ts` - Configurações isoladas por tenant

### **⚡ Server Actions Seguras:**
- `updateProjectAction()` - Usa helpers de segurança + verifica tenant
- `uploadProjectFileAction()` - Verifica acesso ao projeto via tenant
- `deleteFileAction()` - Implementa verificação de acesso

### **🛠️ Ferramentas de Segurança Criadas:**
- `FeatureGuard` - Component para bloquear UI baseado em trial/limites
- `useTrialStatus` - Hook para verificação programática
- `tenant-security.ts` - Utilitários centralizados (`getTenantFromUser`, `canUserAccessResource`)

---

## 🔧 **FUNÇÕES SQL IMPORTANTES**

### **Controle de Trial:**
- `get_trial_status(org_id)` - Status atual do trial
- `expire_trials()` - Expira trials vencidos (para cron job)
- `activate_subscription(org_id, plan)` - Ativa assinatura paga

### **Controle de Limites:**
- `can_create_resource(org_id, resource_type)` - Verifica se pode criar recurso
- `get_default_plan_limits(plan_name)` - Retorna limites padrão do plano

### **Inicialização:**
- `initialize_new_organization()` - Cria nova organização com configurações padrão

---

## 📝 **PRÓXIMOS PASSOS - PLANO DE AÇÃO**

### **✅ CONCLUÍDO - SEGURANÇA CRÍTICA (Semana Atual):**
1. **✅ Auditoria de Segurança Multi-Tenant:**
   - ✅ Verificar isolamento de dados em todas as queries
   - ✅ Atualizar server actions críticas para padrão multi-tenant
   - ✅ Correção de APIs com vazamento de dados

2. **✅ Sistema de Bloqueio Rigoroso:**
   - ✅ Component `<FeatureGuard>` para todas as funcionalidades críticas
   - ✅ Modal obrigatório de upgrade quando trial expira
   - ✅ Helpers de segurança centralizados

### **🚨 CRÍTICO - PRÓXIMOS PASSOS (Semana 1-2):**

#### **1. INTEGRAÇÃO COM STRIPE (PRIORIDADE MÁXIMA)**
**Arquivos a criar/modificar:**
```typescript
// 1.1 Component de Upgrade Modal
src/components/billing/UpgradeModal.tsx
- Modal persistente quando trial expira
- Integração com Stripe Checkout
- Não pode ser fechado até pagamento
- Exibir planos e preços

// 1.2 Server Actions de Pagamento  
src/lib/actions/stripe-actions.ts
- createCheckoutSession(organizationId, planId)
- handleSubscriptionActivation(sessionId)
- cancelSubscription(organizationId)
- updatePaymentMethod(organizationId)

// 1.3 Webhook do Stripe
src/app/api/webhooks/stripe/route.ts  
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

// 1.4 Página de Billing
src/app/billing/upgrade/page.tsx
- Gestão de assinatura
- Histórico de pagamentos  
- Alteração de plano
- Cancelamento de assinatura
```

**Configurações necessárias:**
- Stripe Account configurado
- Webhooks endpoint configurado
- Variáveis de ambiente (.env)
- Produtos e preços criados no Stripe Dashboard

#### **2. AUTOMAÇÃO DE TRIAL E EMAILS**
**Configurações de Cron Job:**
```yaml
# vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-trials",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/trial-reminders", 
      "schedule": "0 10 * * *"
    }
  ]
}
```

**Arquivos a criar:**
```typescript
// 2.1 Cron Jobs
src/app/api/cron/expire-trials/route.ts
- Executa função SQL expire_trials() diariamente
- Log de organizações expiradas
- Notificação para admins

src/app/api/cron/trial-reminders/route.ts  
- Emails 3, 1 dias antes do vencimento
- Email no dia do vencimento
- Templates personalizados por plano

// 2.2 Templates de Email
src/lib/email-templates/trial-reminder.ts
- Template para 3 dias restantes
- Template para 1 dia restante  
- Template para trial expirado
- Template para reativação

// 2.3 Serviços de Email
src/lib/services/email-service.ts
- sendTrialReminder(organization, daysLeft)
- sendTrialExpired(organization)
- sendWelcomeAfterPayment(organization)
```

### **🔥 ALTA PRIORIDADE (Semana 3-4):**

#### **3. AUDITORIA DE SERVER ACTIONS RESTANTES**
**Arquivos pendentes de correção:**
```typescript
// 3.1 Actions de Cliente
src/lib/actions/clientActions.ts
- ❌ createClientAction() - sem verificação tenant_id
- ❌ updateClientAction() - sem verificação tenant_id  
- ❌ deleteClientAction() - sem verificação tenant_id
- ❌ getClientsAction() - sem filtro tenant_id

// 3.2 Actions de Autenticação  
src/lib/actions/auth-actions.ts
- ❌ updateUserProfileAction() - sem verificação tenant_id
- ❌ changePasswordAction() - sem verificação tenant_id
- ❌ getUsersAction() - sem filtro tenant_id

// 3.3 APIs Restantes
src/app/api/billing/update-payment/route.ts
- ❌ POST não verifica tenant_id

src/app/api/financial/dashboard/route.ts  
- ❌ GET não filtra por tenant_id

src/app/api/admin/block-user/route.ts
- ❌ POST bloqueia usuário sem verificar tenant_id
```

#### **4. DASHBOARD DE BILLING E UX**
```typescript
// 4.1 Dashboard de Recursos
src/components/dashboard/ResourceUsageCard.tsx
- Exibir uso atual vs limites do plano
- Progresso visual (barras de progresso)
- Alertas quando próximo do limite

// 4.2 Página de Billing Completa
src/app/billing/page.tsx
- Status da assinatura atual
- Próxima cobrança
- Histórico de faturas
- Botão para alterar plano

// 4.3 Sistema de Notificações
src/components/notifications/TrialNotification.tsx
- Toast quando próximo do limite
- Banner persistente quando trial expira
- Notificações in-app para lembretes
```

### **📈 MÉDIO PRAZO (Mês 2):**

#### **5. ANALYTICS E MÉTRICAS**
```typescript
// 5.1 Dashboard de Conversão
src/components/admin/ConversionDashboard.tsx
- Taxa de conversão trial → pagante
- Métricas por plano (Starter, Pro, Enterprise)
- Churn rate e lifetime value
- Gráficos de crescimento mensal

// 5.2 Métricas por Tenant
src/app/admin/analytics/page.tsx
- Uso de recursos por organização
- Organizações mais ativas
- Relatórios de performance
- Alertas para organizações em risco

// 5.3 APIs de Analytics
src/app/api/admin/analytics/route.ts
- Dados de conversão
- Métricas de uso
- Relatórios customizados
```

#### **6. OTIMIZAÇÕES DE PERFORMANCE**
```typescript
// 6.1 Cache Redis
src/lib/cache/tenant-cache.ts
- Cache de dados de organização
- Cache de limites de plano
- Cache de status de trial
- Invalidação inteligente

// 6.2 Otimização de Queries
src/lib/supabase/optimized-queries.ts
- Queries otimizadas por tenant
- Índices compostos por tenant_id
- Prepared statements
- Connection pooling por tenant
```

### **🎯 LONGO PRAZO (Mês 3+):**

#### **7. RECURSOS AVANÇADOS**
```typescript
// 7.1 API Pública
src/app/api/v1/[tenant]/projects/route.ts
- API REST pública por tenant
- Autenticação via API keys
- Rate limiting por organização
- Documentação OpenAPI

// 7.2 Webhooks
src/lib/webhooks/tenant-webhooks.ts
- Eventos de criação/atualização
- Webhooks configuráveis por tenant
- Retry automático e logs
- Assinatura de eventos

// 7.3 White-label
src/components/branding/TenantBranding.tsx
- Logo personalizado por tenant
- Cores customizadas
- Domínio próprio
- Templates de email personalizados
```

#### **8. ESCALABILIDADE EMPRESARIAL**
```typescript
// 8.1 Sharding de Dados
src/lib/database/tenant-sharding.ts
- Distribuição por região
- Load balancing inteligente
- Migração automática de dados
- Backup distribuído

// 8.2 Monitoramento Avançado
src/lib/monitoring/tenant-monitoring.ts
- Métricas customizadas por tenant
- Alertas proativos
- Health checks automáticos
- Performance tracking
```

---

## 🎯 **RESUMO EXECUTIVO - PRÓXIMOS PASSOS**

### **⚡ AÇÕES IMEDIATAS (Esta Semana)**
1. **🔴 Stripe Integration** - Implementar monetização
2. **🟡 Cron Jobs** - Automação de trial e emails
3. **🟠 Server Actions** - Completar auditoria de segurança

### **📋 CHECKLIST SEMANAL**
```bash
# Semana 1-2: Monetização
□ Configurar Stripe Account e Webhooks
□ Implementar UpgradeModal.tsx
□ Criar server actions de pagamento
□ Configurar cron jobs para trial

# Semana 3-4: Segurança e UX  
□ Corrigir server actions restantes
□ Implementar dashboard de billing
□ Sistema de notificações avançado
□ Testes de isolamento entre tenants

# Mês 2: Analytics e Performance
□ Dashboard de conversão
□ Cache Redis por tenant
□ Otimização de queries
□ Métricas de uso

# Mês 3+: Escalabilidade
□ API pública
□ Sistema de webhooks
□ White-label customizado
□ Sharding de dados
```

### **🚨 ALERTAS IMPORTANTES**
- **Produção Ativa:** Todas as mudanças devem ser testadas em staging
- **Backup:** Sempre fazer backup antes de mudanças críticas
- **Monitoramento:** Acompanhar métricas de erro pós-deploy
- **Rollback:** Ter plano de rollback para cada deploy

---

## ⚠️ **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### **🔴 CRÍTICO - SEGURANÇA:**
1. **Server Actions Não Multi-Tenant:**
   - Muitas server actions antigas não verificam `tenant_id`
   - Risk de vazamento de dados entre organizações
   - **AÇÃO:** Auditoria completa e migração urgente

2. **Falta de Bloqueio Efetivo:**
   - Trial expirado permite criação de novos recursos
   - Modal de upgrade pode ser fechado/ignorado  
   - **AÇÃO:** Implementar bloqueio hard com `<FeatureGuard>`

3. **Queries Não Filtradas:**
   - Algumas queries podem não estar filtrando por `tenant_id`
   - **AÇÃO:** Análise de todas as queries do sistema

### **🟡 ALTA PRIORIDADE - FUNCIONALIDADE (DOCUMENTADO PARA IMPLEMENTAÇÃO POSTERIOR):**

#### **PONTO 2: INTEGRAÇÃO STRIPE E MONETIZAÇÃO**
1. **Stripe Checkout Integration:**
   - Criar `src/components/billing/UpgradeModal.tsx`
   - Implementar `src/lib/actions/stripe-actions.ts`
   - Configurar webhooks: `/api/webhooks/stripe`
   - Server actions: `createCheckoutSession()`, `handleWebhook()`

2. **Modal de Upgrade Obrigatório:**
   - Component `<PersistentUpgradeModal>` que não pode ser fechado
   - Integração com Stripe Checkout
   - Redirecionamento automático após pagamento
   - Estado persistente no localStorage

3. **Ativação Automática de Assinaturas:**
   - Webhook para `subscription.created`
   - Função SQL `activate_subscription(org_id, stripe_data)`
   - Atualização automática de limites do plano
   - Notificação de boas-vindas

#### **PONTO 3: AUTOMAÇÃO E CRON JOBS**
1. **Vercel Cron Configuration:**
   - Arquivo `vercel.json` com cron para `expire_trials()`
   - API route: `/api/cron/expire-trials` 
   - Execução diária às 00:00 UTC
   - Logs e monitoramento de execução

2. **Sistema de Emails Automáticos:**
   - Templates: trial_reminder_3days, trial_reminder_1day, trial_expired
   - Integração AWS SES via `src/lib/services/emailService.ts`
   - Fila de emails com retry automático
   - Personalizacao por tenant

3. **Monitoramento de Recursos:**
   - API `/api/cron/check-limits` para alertas
   - Notificações quando próximo dos limites (90%)
   - Dashboard de métricas em tempo real

### **🟢 BAIXA PRIORIDADE - UX:**
1. **Dashboard de Recursos:**
   - Usuários não veem uso atual vs limites
   - **AÇÃO:** Dashboard de métricas por tenant

2. **Notificações In-App:**
   - Sistema existe mas não está integrado ao trial
   - **AÇÃO:** Expandir notificações para trial/billing

---

## 🚨 **NOTAS IMPORTANTES**

### **Segurança:**
- Nunca expor lista de tenants publicamente
- Sempre validar `tenant_id` em todas as operações
- Usar Service Role apenas em server-side

### **Performance:**
- Índices criados em `tenant_id` para todas as tabelas
- Queries sempre filtradas por tenant
- Cache de informações de tenant quando possível

### **Manutenção:**
- Logs detalhados para debug multi-tenant
- Monitoramento de uso por tenant
- Backup e restore por tenant quando necessário

---

## 📞 **SUPORTE E DEBUG**

### **Logs Importantes:**
- `[Middleware]` - Detecção e validação de tenant
- `[registerOrganization]` - Processo de criação de conta
- `[TenantContext]` - Carregamento de informações do tenant

### **Headers de Debug:**
- `x-tenant-id` - ID da organização
- `x-tenant-slug` - Slug da organização  
- `x-tenant-name` - Nome da organização
- `x-tenant-trial` - Se está em trial (true/false)

### **URLs de Teste:**
- `registro.gerenciamentofotovoltaico.com.br` - Formulário de registro
- `{slug}.gerenciamentofotovoltaico.com.br` - Acesso ao tenant
- `gerenciamentofotovoltaico.com.br` - Site principal

---

**🎯 OBJETIVO:** Sistema multi-tenant completo, seguro e escalável para a plataforma SGF.
