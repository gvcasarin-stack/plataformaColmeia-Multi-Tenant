# 📋 Sistema de Modalidades de Faturamento - Plano de Implementação

## 📌 Visão Geral

Implementação de três modalidades de faturamento para projetos:
- **Projetos Avulsos** (padrão) - Cobrado por potência (kWp)
- **Pacotes de Projetos** - Quantidade fixa de projetos com validade
- **Assinatura Mensal de Projetos** - Renovação mensal com aprovação manual

---

## ✅ Decisões Tomadas

### 1. Modalidade Padrão
- ✅ Novos clientes começam com **"Projetos Avulsos"**
- ✅ Admin pode mudar modalidade a qualquer momento

### 2. Pacotes de Projetos
- ✅ **COM validade** (prazo de expiração)
- ✅ Cliente **PERDE** projetos não utilizados após expiração
- ✅ Cliente **NÃO pode** ter múltiplos pacotes ativos simultaneamente
- ✅ Notificação de expiração antes do vencimento

### 3. Assinatura Mensal
- ✅ **Renovação MANUAL** (admin aprova após pagamento)
- ✅ Status: `ativa`, `pendente_renovacao`, `pausada`, `cancelada`
- ✅ Cliente bloqueado se assinatura não for renovada

### 4. Transição entre Modalidades
- ✅ **Mudança instantânea** - Opção A (simplicidade)
- ✅ Próximo projeto já usa nova modalidade
- ✅ Projetos antigos **mantêm** modalidade original (histórico preservado)

### 5. Projetos em Andamento
- ✅ **Opção A** - Projetos mantêm modalidade original
- ✅ Modalidade "congelada" no momento da criação

### 6. Mistura de Modalidades
- ✅ Cliente **NÃO pode** misturar modalidades
- ✅ Uma modalidade por cliente por vez

### 7. Gestão de Pacotes/Assinaturas
- ✅ **Admin cria planos padrão** para o tenant
- ✅ Admin pode criar/editar planos personalizados
- ✅ Localização: `/admin/preferencias` (tab Projetos)

### 8. Visualização para Cliente
- ✅ Cliente **VERÁ** seu status de faturamento (dashboard)
- ⏳ Implementação posterior (não prioritário)

### 9. Contratação de Pacotes/Assinaturas
- ✅ Cliente **solicita**, admin **ativa manualmente**
- ✅ Sem integração de pagamento automático (MVP)

### 10. Precificação de Pacotes
- ✅ **Preço fixo** por pacote (independente da potência)
- ✅ Ex: 10 projetos = R$ 5.000 (qualquer potência)

---

## 🗂️ Estrutura de Banco de Dados

### 1. Tabela: `users` (MODIFICAR)
```sql
ALTER TABLE users
ADD COLUMN billing_mode TEXT DEFAULT 'avulso';
-- Valores: 'avulso' | 'pacote' | 'assinatura'
```

### 2. Tabela: `projects` (MODIFICAR)
```sql
ALTER TABLE projects
ADD COLUMN billing_mode TEXT,
ADD COLUMN billing_snapshot JSONB;

-- billing_mode: Modalidade congelada no momento da criação
-- billing_snapshot: Dados completos de faturamento (JSON)
```

### 3. Tabela: `pacotes_definicoes` (CRIAR)
```sql
CREATE TABLE pacotes_definicoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  nome TEXT NOT NULL, -- "Pacote 10 Projetos"
  quantidade_projetos INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  validade_dias INT NOT NULL, -- 365 dias
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Tabela: `cliente_pacotes` (CRIAR)
```sql
CREATE TABLE cliente_pacotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  pacote_id UUID NOT NULL REFERENCES pacotes_definicoes(id),
  data_ativacao TIMESTAMP NOT NULL DEFAULT NOW(),
  data_expiracao TIMESTAMP NOT NULL,
  projetos_inclusos INT NOT NULL,
  projetos_usados INT DEFAULT 0,
  status TEXT DEFAULT 'ativo', -- 'ativo' | 'expirado' | 'esgotado'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Tabela: `planos_assinatura` (CRIAR)
```sql
CREATE TABLE planos_assinatura (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  nome TEXT NOT NULL, -- "Plano 5 Projetos/mês"
  quantidade_mensal INT NOT NULL,
  valor_mensal DECIMAL(10,2) NOT NULL,
  dia_renovacao INT DEFAULT 1, -- Dia do mês (1-31)
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. Tabela: `cliente_assinaturas` (CRIAR)
```sql
CREATE TABLE cliente_assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  plano_id UUID NOT NULL REFERENCES planos_assinatura(id),
  data_inicio TIMESTAMP NOT NULL DEFAULT NOW(),
  dia_renovacao INT NOT NULL, -- Copia do plano
  projetos_mensais INT NOT NULL,
  projetos_usados_mes_atual INT DEFAULT 0,
  ultimo_reset TIMESTAMP,
  proximo_reset TIMESTAMP,
  status TEXT DEFAULT 'ativa', -- 'ativa' | 'pendente_renovacao' | 'pausada' | 'cancelada'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Checklist de Implementação (Por Ordem)

### **FASE 1: Banco de Dados e Backend** ✅ CONCLUÍDA

#### 1.1. Modificar Tabelas Existentes ✅
- [x] Adicionar coluna `billing_mode` em `users` (default: 'avulso')
- [x] Adicionar coluna `billing_mode` em `projects`
- [x] Adicionar coluna `billing_snapshot` (JSONB) em `projects`
- [x] Criar migration SQL para alterações (`scripts/add-billing-fields-to-projects.sql`)

#### 1.2. Criar Novas Tabelas ✅
- [x] Criar tabela `pacotes_definicoes`
- [x] Criar tabela `cliente_pacotes`
- [x] Criar tabela `planos_assinatura`
- [x] Criar tabela `cliente_assinaturas`
- [x] Adicionar indexes e constraints necessários

#### 1.3. Criar APIs Backend ✅
- [x] `GET /api/admin/pacotes` - Listar pacotes definidos
- [x] `POST /api/admin/pacotes` - Criar novo pacote
- [x] `PATCH /api/admin/pacotes/:id` - Editar pacote
- [x] `DELETE /api/admin/pacotes/:id` - Desativar pacote
- [x] `GET /api/admin/planos-assinatura` - Listar planos
- [x] `POST /api/admin/planos-assinatura` - Criar novo plano
- [x] `PATCH /api/admin/planos-assinatura/:id` - Editar plano
- [x] `DELETE /api/admin/planos-assinatura/:id` - Desativar plano
- [x] `GET /api/admin/clients/[id]/billing` - Obter informações de billing do cliente
- [x] `PATCH /api/admin/clients/[id]/billing` - Atualizar billing_mode do cliente
- [x] `GET /api/admin/clients/[id]/billing-info` - Obter billing_mode simples
- [x] `POST /api/admin/cliente-pacotes` - Ativar pacote para cliente
- [x] `PATCH /api/admin/cliente-pacotes/[id]` - Renovar/alterar pacote
- [x] `POST /api/admin/cliente-assinaturas` - Ativar assinatura
- [x] `PATCH /api/admin/cliente-assinaturas/[id]/renovar` - Renovar/alterar assinatura
- [x] `PATCH /api/admin/cliente-assinaturas/[id]/status` - Pausar/cancelar

#### 1.4. Modificar API de Criação de Projetos ✅ CONCLUÍDA
- [x] Verificar `user.billing_mode` ao criar projeto
- [x] Se 'avulso': manter lógica atual (potência × valor)
- [x] Se 'pacote': validar projetos disponíveis, decrementar contador
- [x] Se 'assinatura': validar status ativa, decrementar contador mensal
- [x] Congelar `billing_mode` e `billing_snapshot` no projeto
- [x] Adicionar logs de auditoria (implementado via devLog)

---

### **FASE 2: Interface Admin - Preferências** ✅ CONCLUÍDA

#### 2.1. Criar Tab "Pacotes de Projetos" em `/admin/preferencias` ✅
- [x] Criar componente `PackagesTab.tsx`
- [x] Listar pacotes em tabela/cards
- [x] Botão [+ Novo Pacote]
- [x] Modal `AddPackageModal.tsx`
- [x] Modal `EditPackageModal.tsx`
- [x] Ações: [Editar] [Desativar]
- [x] Integrar com APIs de pacotes

#### 2.2. Criar Tab "Assinatura Mensal" em `/admin/preferencias` ✅
- [x] Criar componente `SubscriptionPlansTab.tsx`
- [x] Listar planos em tabela/cards
- [x] Botão [+ Novo Plano]
- [x] Modal `AddSubscriptionPlanModal.tsx`
- [x] Modal `EditSubscriptionPlanModal.tsx`
- [x] Ações: [Editar] [Desativar]
- [x] Integrar com APIs de planos

---

### **FASE 3: Interface Admin - Editar Cliente** ✅ CONCLUÍDA

#### 3.1. Modal `EditClientModal.tsx` ✅ COMPLETO
- [x] Adicionar campo "Modalidade de Faturamento" (Select dropdown)
- [x] Renderização condicional baseada na modalidade selecionada
- [x] Carrega informações de billing ativo do cliente
- [x] Exibe informações de pacote/assinatura ativo (read-only)
- [x] Atualizar `user.billing_mode` ao salvar
- [x] **CONVERSÃO AVULSO → PACOTE/ASSINATURA**: Funciona via dropdown no modal
  - Seleciona pacote/plano disponível
  - Salva e ativa automaticamente
  - Cliente convertido com sucesso

---

### **FASE 4: Interface Admin - Gerenciamento de Assinaturas** ✅ CONCLUÍDA

#### 4.1. Tab "Assinaturas" em `/admin/clientes` ✅ COMPLETO
- [x] Adicionar botão/tab ao lado de "Cadastros"
- [x] Criar componente `ClientSubscriptionsTab.tsx`
- [x] Listar TODOS os clientes com informações completas
- [x] **Estatísticas no topo** ✅
- [x] **Visualização detalhada** ✅:
  - [x] Progresso visual de pacotes (barra colorida)
  - [x] Progresso visual de assinaturas (barra colorida)
  - [x] Data de expiração/renovação
  - [x] Badge de status detalhado
- [x] **Ações disponíveis por cliente** ✅:
  - [x] Pacotes: [Renovar] [Alterar] [Cancelar]
  - [x] Assinaturas: [Renovar] [Alterar Plano] [Cancelar]
  - [x] ~~Assinaturas: [Pausar] [Reativar]~~ **REMOVIDO - Sem necessidade**
  - [ ] ~~Avulsos: [Converter]~~ **JÁ EXISTE no Modal Editar Cliente**

#### 4.2. Criar Modais de Ações ✅ COMPLETO
- [x] Modal de Renovação - Renovar pacote/assinatura (mesmo pacote/plano)
- [x] Modal de Alteração - Alterar para outro pacote/plano
- [x] Modal de Cancelamento - Cancelar pacote/assinatura
- [ ] ~~`PauseSubscriptionModal.tsx`~~ **REMOVIDO - Funcionalidade desnecessária**
- [ ] ~~`ResumeSubscriptionModal.tsx`~~ **REMOVIDO - Já existe botão Renovar**
- [ ] ~~`ConvertToPackageModal.tsx`~~ **JÁ EXISTE no Modal Editar Cliente**
- [ ] ~~`ConvertToSubscriptionModal.tsx`~~ **JÁ EXISTE no Modal Editar Cliente**

---

### **FASE 5: Validações e Regras de Negócio** ⏳ EM ANDAMENTO

#### 5.1. Validações ao Criar Projeto ✅ CONCLUÍDA
- [x] Verificar modalidade do cliente
- [x] **Se Pacote**:
  - [x] Verificar se pacote ativo
  - [x] Verificar projetos disponíveis (< projetos_inclusos)
  - [x] Verificar se não expirou
  - [x] Erro amigável se bloqueado ("Pacote expirado em DD/MM/YYYY", "Todos os X projetos foram utilizados")
- [x] **Se Assinatura**:
  - [x] Verificar status = 'ativa'
  - [x] Verificar projetos disponíveis no mês (< projetos_mensais)
  - [x] Erro amigável se bloqueado ("Cota mensal esgotada. Aguarde renovação em DD/MM/YYYY")
- [x] **Interface de Visualização**:
  - [x] Campo billing congelado no projeto (billing_mode + billing_snapshot)
  - [x] Exibição visual diferenciada por modalidade:
    - [x] Pacotes: Card roxo com ícone 📦, mostra "Projeto X de Y do Pacote Z"
    - [x] Assinaturas: Card azul com ícone 📅, mostra "Projeto X de Y do ciclo atual"
    - [x] Avulso: Card amarelo com ícone 💰, mostra valor e potência
  - [x] Datas de ativação/expiração/renovação exibidas

#### 5.2. Notificações e Alertas ⏳

**Sistema de Notificações:** Todas as notificações são enviadas via **IN-APP + EMAIL** (padrão da aplicação)

##### **Notificações para o CLIENTE:**

1. **7 dias antes do pacote expirar** 📅
   - **Título:** "Seu pacote expira em breve"
   - **Mensagem:** "Seu pacote [Nome do Pacote] expira em 7 dias (DD/MM/YYYY). Renove para continuar aproveitando os benefícios!"
   - **Ação:** Botão "Solicitar Renovação"
   - **Tipo:** `warning`

2. **Quando pacote expirar** ⚠️
   - **Título:** "Seu pacote expirou"
   - **Mensagem:** "Seu pacote [Nome do Pacote] expirou em DD/MM/YYYY. Novos projetos serão cobrados como avulsos."
   - **Ação:** Botão "Renovar Pacote"
   - **Tipo:** `alert`

3. **Quando pacote esgotar** 🚫
   - **Título:** "Você utilizou todos os projetos do seu pacote"
   - **Mensagem:** "Você utilizou todos os X projetos do seu pacote [Nome]. Renove ou adquira um novo pacote!"
   - **Ação:** Botão "Renovar Pacote"
   - **Tipo:** `warning`

4. **Quando assinatura precisar renovação** 💳
   - **Título:** "Sua assinatura precisa ser renovada"
   - **Mensagem:** "Sua assinatura [Nome do Plano] renova em 3 dias. Efetue o pagamento para continuar criando projetos."
   - **Ação:** Botão "Solicitar Renovação"
   - **Tipo:** `warning`

5. **Quando cria projeto fora dos limites** 💰
   - **Título:** "Projeto criado fora do pacote/assinatura"
   - **Mensagem:** "Você criou um projeto mas seu pacote está esgotado/expirado. Este projeto será cobrado como avulso."
   - **Ação:** Nenhuma (apenas informativo)
   - **Tipo:** `info`

6. **Quando potência excede limite do pacote** ⚡
   - **Título:** "Potência excede limite do pacote"
   - **Mensagem:** "O projeto criado tem potência de X kWp, mas seu pacote permite até Y kWp. A diferença será cobrada como avulso."
   - **Ação:** Nenhuma (apenas informativo)
   - **Tipo:** `info`

##### **Notificações para o ADMIN:**

1. **Cliente criou projeto com pacote esgotado** 📦
   - **Título:** "Cliente criou projeto fora do pacote"
   - **Mensagem:** "Cliente [Nome] (email) criou projeto #XXX mas o pacote está esgotado. Projeto será cobrado como avulso."
   - **Ação:** Link para o projeto
   - **Tipo:** `info`

2. **Cliente criou projeto com pacote expirado** ⏰
   - **Título:** "Cliente criou projeto com pacote expirado"
   - **Mensagem:** "Cliente [Nome] (email) criou projeto #XXX mas o pacote expirou em DD/MM/YYYY. Projeto será cobrado como avulso."
   - **Ação:** Link para o cliente
   - **Tipo:** `warning`

3. **Cliente criou projeto com assinatura suspensa** 🚫
   - **Título:** "Cliente criou projeto com assinatura suspensa"
   - **Mensagem:** "Cliente [Nome] (email) criou projeto #XXX mas a assinatura está suspensa/pendente de renovação."
   - **Ação:** Link para o cliente
   - **Tipo:** `alert`

4. **Cliente criou projeto excedendo potência** ⚡
   - **Título:** "Cliente excedeu limite de potência"
   - **Mensagem:** "Cliente [Nome] criou projeto #XXX com X kWp, mas o limite do pacote/assinatura é Y kWp."
   - **Ação:** Link para o projeto
   - **Tipo:** `info`

##### **Checklist de Implementação:**
- [ ] Criar endpoint `/api/notifications/billing` para gatilhos de notificação
- [ ] Integrar com sistema de notificações existente (in-app)
- [ ] Integrar com sistema de emails existente
- [ ] Implementar gatilhos no momento da criação do projeto
- [ ] Implementar gatilhos nos jobs automáticos (FASE 5.3)

#### 5.3. Jobs Automáticos (Cron) ⏳
- [ ] Job diário: Verificar pacotes expirados
- [ ] Job diário: Verificar assinaturas pendentes de renovação
- [ ] Job diário: Atualizar status de assinaturas
- [ ] Job diário: Enviar lembretes de expiração

---

### **FASE 6: Dashboard do Cliente (FUTURO)** ⏳

#### 6.1. Adicionar Card no Dashboard do Cliente
- [ ] Mostrar modalidade atual
- [ ] **Se Pacote**: Progresso visual + data de expiração
- [ ] **Se Assinatura**: Progresso mensal + próxima renovação
- [ ] Botão "Solicitar Renovação" (envia email para admin)

---

### **FASE 7: Histórico e Auditoria (FUTURO)** ⏳

#### 7.1. Logs de Mudanças
- [ ] Criar tabela `billing_mode_history`
- [ ] Registrar todas as mudanças de modalidade
- [ ] Registrar ativações/renovações/cancelamentos
- [ ] Admin pode ver histórico completo

---

## ✅ Status Atual e Próximos Passos

### ✅ O QUE JÁ FOI CONCLUÍDO:

1. ✅ **FASE 1**: Backend e Banco de Dados (100% APIs criadas)
2. ✅ **FASE 2**: Interface Admin - Preferências (100% completa)
3. ✅ **FASE 3**: Modal Editar Cliente (100% completo - conversão funciona!)
4. ✅ **FASE 4**: Tab "Assinaturas" em clientes (100% completa!)
5. ✅ **FASE 5.1**: Validações ao Criar Projeto (100% completa!)
   - ✅ Validação de quota em pacotes e assinaturas
   - ✅ Mensagens de erro amigáveis
   - ✅ Decremento automático de contadores
   - ✅ Snapshot de billing congelado no projeto
   - ✅ Interface visual diferenciada por modalidade
6. ✅ **Modais de Ações Implementados**:
   - ✅ Modal de Cancelamento (AlertDialog elegante)
   - ✅ Modal de Renovação (mantém mesmo pacote/plano, zera projetos)
   - ✅ Modal de Alteração (troca para outro pacote/plano, zera projetos)
7. ✅ **APIs de Renovação/Alteração**:
   - ✅ `PATCH /api/admin/cliente-assinaturas/[id]/renovar` suporta ambos casos

### 🎯 PRÓXIMOS PASSOS (EM ORDEM DE PRIORIDADE):

#### **PASSO 1: Executar Migration SQL** ⚠️ BLOQUEANTE
**Por quê é bloqueante?** O banco precisa das colunas billing_mode e billing_snapshot na tabela projects.

1. Executar migration: `scripts/add-billing-fields-to-projects.sql` no Supabase
2. Verificar se colunas foram criadas corretamente
3. Testar criação de projetos com as três modalidades

#### **PASSO 2: Refatorar Dashboard Financeiro do Admin** (DEFER - Solicitado pelo usuário)
**Status:** Deixado para implementação posterior

1. Separar receita por modalidade:
   - Card "Receita Avulsa" (projetos avulsos)
   - Card "Receita de Pacotes" (vendas de pacotes)
   - Card "Receita Recorrente (MRR)" (assinaturas mensais)
2. Gráficos e métricas por modalidade
3. Filtros por período e modalidade

#### **PASSO 3: Sistema de Notificações** (FASE 5.2 - Importante mas não bloqueante)
1. Notificações de expiração de pacotes
2. Notificações de renovação de assinaturas
3. Jobs automáticos para verificar status (FASE 5.3)

#### **PASSO 4: Dashboard do Cliente** (FASE 6 - Futuro)
1. Exibir informações de billing para o cliente
2. Botão para solicitar renovação

---

## 📊 Análise: Pausar/Reativar Assinatura

### ❓ Questionamento sobre a funcionalidade

**Cenário atual:**
- Botão [Renovar] já existe e faz o trabalho de "reativar"
- Pausar uma assinatura manteria o prazo "congelado"

**Possíveis casos de uso para Pausar:**
1. Cliente pediu para pausar temporariamente (férias, problemas financeiros)
2. Admin quer suspender sem cancelar definitivamente
3. Preservar histórico e configurações para reativação futura

**Alternativas:**
- **Opção A**: Remover funcionalidade Pausar/Reativar completamente
  - Usar apenas: Renovar e Cancelar
  - Mais simples, menos confusão

- **Opção B**: Manter Pausar/Reativar com casos de uso claros
  - Pausar = status 'pausada', não pode criar projetos
  - Reativar = volta para 'ativa', mantém contador e prazo
  - Renovar = zera contador, novo prazo

### 💡 Recomendação:
**REMOVER funcionalidade Pausar/Reativar** (Opção A)
- Simplifica o sistema
- Menos estados para gerenciar
- Renovar já cumpre o papel de "reativar"
- Cancelar é definitivo (volta para avulso)

---

## 📝 Notas Adicionais

- Implementação incremental: Uma fase por vez
- Testes em cada fase antes de prosseguir
- Feedback do usuário entre fases
- Possibilidade de ajustes durante implementação
- Foco em simplicidade e usabilidade

---

**Documento atualizado em:** 22/01/2025
**Versão:** 2.2
**Status:** ✅ Fases 1-4 Concluídas | ✅ FASE 5.1 COMPLETA (Server Action + Billing Validation) | ⏳ Próximo: Testar fluxo completo
