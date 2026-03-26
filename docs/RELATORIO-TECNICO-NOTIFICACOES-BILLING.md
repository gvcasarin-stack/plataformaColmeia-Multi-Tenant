# Relatório Técnico: Notificações de Billing Não Enviadas

**Data**: 17/12/2025
**Status**: 🔴 CRÍTICO - Sistema corrigido mas notificações não funcionam
**Prioridade**: ALTA

---

## 1. RESUMO EXECUTIVO

Após correção do bug de importação no `billingNotificationService.ts`, o sistema ainda não está enviando notificações quando:

1. ✅ **Cliente cria o 3º projeto** (último da cota de 3) - **NENHUMA notificação enviada**
2. ✅ **Cliente cria o 4º projeto** (excede cota) - **NENHUMA notificação enviada**

**Impacto**: Cliente e administradores não são alertados sobre esgotamento de quota, comprometendo a gestão financeira.

---

## 2. ANÁLISE DO FLUXO ATUAL

### 2.1. Cenário 1: Criar 3º Projeto (Último da Cota)

**Estado Inicial**:
- `projetos_usados_mes_atual` = 2
- `projetos_mensais` = 3
- `projetosDisponiveis` = 3 - 2 = **1**

**Fluxo Executado** (`multi-tenant-project-actions.ts:205`):
```typescript
if (projetosDisponiveis > 0) {  // ✅ TRUE (1 > 0)
  billingMode = 'assinatura'
  billingSnapshot = { ... }
  // ❌ NENHUM WARNING É GERADO
}
```

**Resultado**:
- ✅ Projeto criado com sucesso
- ✅ Quota decrementada (projetos_usados_mes_atual = 3)
- ❌ `billingWarnings` = **array vazio**
- ❌ `sendBillingNotifications` **NÃO É CHAMADO** (linha 450: `if (billingWarnings.length > 0)`)

**Problema Identificado**:
> A lógica atual só detecta quota **ESGOTADA** (projetosDisponiveis <= 0), mas não notifica quando o **ÚLTIMO PROJETO** está sendo criado.

---

### 2.2. Cenário 2: Criar 4º Projeto (Excede Cota)

**Estado Inicial**:
- `projetos_usados_mes_atual` = 3
- `projetos_mensais` = 3
- `projetosDisponiveis` = 3 - 3 = **0**

**Fluxo Esperado** (`multi-tenant-project-actions.ts:219-227`):
```typescript
if (projetosDisponiveis > 0) {  // ❌ FALSE (0 não é > 0)
  // ...
} else {
  // ✅ Assinatura esgotada - projeto será avulso
  billingMode = 'avulso'
  billingWarnings.push({
    type: 'subscription_exhausted',
    severity: 'high',
    message: 'Cota mensal esgotada - projeto será cobrado como avulso'
  })
}
```

**Fluxo Executado** (`multi-tenant-project-actions.ts:450-477`):
```typescript
try {
  if (billingWarnings.length > 0) {  // ✅ TRUE (1 warning)
    await sendBillingNotifications({
      projectId: newProject.id,
      projectNumber: newProject.number,
      userId: user.id,
      userName: user.name || 'Cliente',
      userEmail: user.email || 'cliente@exemplo.com',
      billingMode,
      warnings: billingWarnings,
      // ...
    });
  }
} catch (billingNotificationError) {
  devLog.error('[createProjectMultiTenant] ❌ ERRO ao enviar notificações de billing:', billingNotificationError);
  // ⚠️ ERRO É SILENCIADO - projeto continua sendo criado
}
```

**Possíveis Causas da Falha**:

#### A. Erro Silencioso no `sendBillingNotifications`
- Erro no `try/catch` que impede execução
- Logs não estão sendo visíveis em produção
- **Necessário**: Verificar logs do servidor

#### B. Falha no `createNotificationDirectly` (Cliente)
Arquivo: `billingNotificationService.ts:64-80`
```typescript
await createNotificationDirectly({
  type: 'warning',
  title: 'Projeto criado fora do pacote',
  message: `Você criou o projeto #${projectNumber}...`,
  userId,  // ⚠️ Verificar se userId é válido
  senderId: 'system',
  senderName: 'Sistema',
  senderType: 'system',
  // ...
});
```

**Possíveis falhas**:
- `userId` inválido ou null
- Erro na inserção no Supabase
- Constraint violation na tabela `notifications`

#### C. Falha no `createNotificationForAllAdmins` (Admins)
Arquivo: `billingNotificationService.ts:197-215`
```typescript
await createNotificationForAllAdmins({
  type: 'info',
  title: 'Cliente criou projeto fora do pacote',
  message: `Cliente ${userName}...`,
  senderId: 'system',
  projectId,  // ⚠️ Usado para obter tenant_id
  // ...
});
```

**Verificação Crítica** (`notificationService/core.ts:193-205`):
```typescript
if (notificationData.projectId) {
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('tenant_id')
    .eq('id', notificationData.projectId)
    .single();

  if (!projectError && projectData) {
    tenantId = projectData.tenant_id;
  }
}

if (!tenantId) {
  logger.error('[createNotificationForAllAdmins] ERRO CRÍTICO: tenant_id é obrigatório...');
  return [];  // ⚠️ FALHA SILENCIOSA - nenhuma notificação criada
}
```

**Possíveis falhas**:
- `projectId` inválido
- Projeto não tem `tenant_id` definido
- Função retorna array vazio sem lançar erro

---

## 3. PROBLEMAS IDENTIFICADOS

### Problema 1: Lógica de Detecção Incompleta ⚠️
**Arquivo**: `multi-tenant-project-actions.ts:205-218`

**Descrição**: Sistema só detecta quota **ESGOTADA**, não quota **ESGOTANDO**.

**Comportamento Atual**:
- ✅ Projeto 1: usa quota (2 disponíveis)
- ✅ Projeto 2: usa quota (1 disponível)
- ❌ Projeto 3: usa quota (0 disponíveis) - **DEVERIA NOTIFICAR**
- ✅ Projeto 4: quota esgotada (avulso) - notifica

**Comportamento Esperado**:
- Projeto 3 deveria gerar warning: `subscription_quota_depleted` (quota foi esgotada agora)
- Projeto 4 deveria gerar warning: `subscription_exhausted` (quota já estava esgotada)

---

### Problema 2: Erros Silenciados 🔴
**Arquivo**: `multi-tenant-project-actions.ts:474-477`

**Descrição**: Erros no `sendBillingNotifications` são capturados mas não impedem a criação do projeto.

```typescript
} catch (billingNotificationError) {
  devLog.error('[createProjectMultiTenant] ❌ ERRO ao enviar notificações de billing:', billingNotificationError);
  // ⚠️ Não falhar a criação por causa das notificações
}
```

**Impacto**: Se houver erro nas notificações, o usuário não saberá.

---

### Problema 3: Falta de Logs Visíveis em Produção 🔍
**Descrição**: Todos os logs usam `devLog` que pode não estar visível em produção.

**Logs Críticos Ausentes**:
1. Confirmação de que `sendBillingNotifications` foi chamado
2. Confirmação de quantas notificações foram criadas
3. Detalhes de erros em `createNotificationDirectly`
4. Detalhes de erros em `createNotificationForAllAdmins`

---

## 4. PROPOSTA DE SOLUÇÃO

### Solução 1: Detectar Último Projeto da Quota ✅
**Arquivo**: `multi-tenant-project-actions.ts`

**Alteração**:
```typescript
// Verificar se assinatura ainda tem quota mensal
if (projetosDisponiveis > 0) {
  billingMode = 'assinatura'
  billingSnapshot = { ... }

  // ✅ NOVO: Verificar se está usando o ÚLTIMO projeto da quota
  if (projetosDisponiveis === 1) {
    billingWarnings.push({
      type: 'subscription_quota_depleted',
      severity: 'medium',
      message: 'Você usou seu último projeto da cota mensal. Próximo projeto será cobrado como avulso.'
    })
    devLog.warn('[createProjectMultiTenant] Último projeto da quota sendo usado')
  }

} else {
  // Assinatura esgotada - projeto será avulso
  billingMode = 'avulso'
  billingWarnings.push({
    type: 'subscription_exhausted',
    severity: 'high',
    message: 'Cota mensal esgotada - projeto será cobrado como avulso'
  })
}
```

**Resultado**: Cliente será notificado ao usar o último projeto.

---

### Solução 2: Adicionar Warning para Quota Esgotada no billingNotificationService ✅
**Arquivo**: `billingNotificationService.ts`

**Alteração**: Adicionar tratamento para o novo tipo `subscription_quota_depleted`:

```typescript
// 3.5. Último projeto da quota usado
if (warnings.some(w => w.type === 'subscription_quota_depleted')) {
  await createNotificationDirectly({
    type: 'warning',
    title: 'Último projeto da cota usado',
    message: `Você criou o projeto #${projectNumber} e usou seu último projeto da cota mensal. Próximo projeto será cobrado como avulso.`,
    userId,
    senderId: 'system',
    senderName: 'Sistema',
    senderType: 'system',
    projectId,
    projectNumber,
    link: `/cliente/projetos/${projectId}`,
    data: {
      billingMode,
      assinaturaNome,
      warningType: 'subscription_quota_depleted'
    }
  });
}

// Notificação para admins
if (warnings.some(w => w.type === 'subscription_quota_depleted')) {
  await createNotificationForAllAdmins({
    type: 'info',
    title: 'Cliente usou último projeto da cota',
    message: `Cliente ${userName} (${userEmail}) criou projeto #${projectNumber} e esgotou sua cota mensal. Próximo projeto será avulso.`,
    senderId: 'system',
    senderName: 'Sistema',
    senderType: 'system',
    projectId,
    projectNumber,
    link: `/admin/clientes`,
    data: {
      userId,
      userName,
      userEmail,
      billingMode,
      assinaturaNome,
      warningType: 'subscription_quota_depleted'
    }
  });
}
```

---

### Solução 3: API de Diagnóstico 🔍
**Arquivo Novo**: `src/app/api/diagnostico/billing-notifications/route.ts`

**Objetivo**: Rastrear execução completa do fluxo de notificações em tempo real.

**Funcionalidades**:
1. Simular criação de projeto com quota esgotada
2. Verificar se warnings são gerados
3. Verificar se `sendBillingNotifications` é chamado
4. Verificar se `createNotificationDirectly` funciona
5. Verificar se `createNotificationForAllAdmins` funciona
6. Retornar logs detalhados de cada etapa

**Endpoint**: `GET /api/diagnostico/billing-notifications?userId=xxx`

**Resposta Esperada**:
```json
{
  "success": true,
  "diagnostico": {
    "usuario": {
      "id": "xxx",
      "nome": "Gabriel Casarin",
      "email": "gabriel@example.com"
    },
    "assinatura": {
      "id": "yyy",
      "projetos_mensais": 3,
      "projetos_usados": 3,
      "projetos_disponiveis": 0,
      "status": "ativa"
    },
    "simulacao_projeto_4": {
      "billing_mode": "avulso",
      "billing_warnings": [
        {
          "type": "subscription_exhausted",
          "severity": "high",
          "message": "Cota mensal esgotada"
        }
      ],
      "warnings_count": 1
    },
    "teste_notificacao_cliente": {
      "success": true,
      "notificationId": "zzz",
      "erro": null
    },
    "teste_notificacao_admins": {
      "success": true,
      "adminsNotificados": 2,
      "notificationIds": ["aaa", "bbb"],
      "erro": null
    }
  }
}
```

---

### Solução 4: Logs Mais Verbosos 📊
**Arquivo**: `billingNotificationService.ts`

**Alteração**: Adicionar logs detalhados em cada etapa:

```typescript
export async function sendBillingNotifications(params: BillingNotificationParams): Promise<void> {
  devLog.log('========================================');
  devLog.log('[BillingNotifications] INÍCIO - Processando notificações');
  devLog.log('[BillingNotifications] Parâmetros:', {
    projectId: params.projectId,
    projectNumber: params.projectNumber,
    userId: params.userId,
    billingMode: params.billingMode,
    warningsCount: params.warnings.length,
    warningTypes: params.warnings.map(w => w.type)
  });

  // ... código existente ...

  // Após cada createNotificationDirectly
  devLog.log('[BillingNotifications] ✅ Notificação CLIENTE criada:', {
    type: warning.type,
    userId: params.userId
  });

  // Após cada createNotificationForAllAdmins
  devLog.log('[BillingNotifications] ✅ Notificação ADMINS criada:', {
    type: warning.type
  });

  devLog.log('[BillingNotifications] FIM - Todas notificações processadas');
  devLog.log('========================================');
}
```

---

## 5. PLANO DE AÇÃO RECOMENDADO

### Fase 1: Diagnóstico (URGENTE) 🔍
1. ✅ **Criar API de diagnóstico** para rastrear o problema em produção
2. ✅ **Executar testes** com o usuário real que está reportando o problema
3. ✅ **Coletar logs** de todas as etapas do fluxo

**Tempo estimado**: 30 minutos
**Responsável**: Developer

---

### Fase 2: Correção (ALTA PRIORIDADE) ⚙️
1. ✅ **Implementar Solução 1**: Detectar último projeto da quota
2. ✅ **Implementar Solução 2**: Adicionar warning `subscription_quota_depleted`
3. ✅ **Implementar Solução 4**: Logs mais verbosos
4. ✅ **Testar** em ambiente de desenvolvimento

**Tempo estimado**: 1 hora
**Responsável**: Developer

---

### Fase 3: Validação (CRÍTICA) ✅
1. ✅ **Deploy** em produção
2. ✅ **Testar** com usuário real
3. ✅ **Verificar** se notificações chegam no app e por email
4. ✅ **Confirmar** com usuário que o problema foi resolvido

**Tempo estimado**: 30 minutos
**Responsável**: Developer + Usuário

---

## 6. RISCOS E MITIGAÇÕES

### Risco 1: Notificações Duplicadas
**Descrição**: Se adicionar nova lógica de warnings, pode gerar notificações duplicadas.

**Mitigação**:
- Garantir que `subscription_quota_depleted` só é gerado quando `projetosDisponiveis === 1`
- Garantir que `subscription_exhausted` só é gerado quando `projetosDisponiveis <= 0`

---

### Risco 2: Performance
**Descrição**: Adicionar mais notificações pode impactar performance.

**Mitigação**:
- Notificações são assíncronas e não bloqueiam criação do projeto
- Erros em notificações não impedem criação do projeto

---

## 7. CONCLUSÃO

O sistema de notificações de billing está **50% funcional**:
- ✅ Código está correto (import corrigido)
- ❌ Lógica de detecção está incompleta (não detecta último projeto)
- ❌ Falta diagnóstico para rastrear erros em produção

**Próximo Passo Recomendado**:
1. **Criar API de diagnóstico** (Solução 3)
2. **Executar com usuário real** para identificar erro exato
3. **Aplicar correções** (Soluções 1, 2, 4) baseado nos resultados

---

**Fim do Relatório**
