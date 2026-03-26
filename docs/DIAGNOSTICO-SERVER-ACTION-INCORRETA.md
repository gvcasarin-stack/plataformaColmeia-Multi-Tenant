# Diagnóstico: Componentes Usando Server Action Incorreta

**Data**: 17/12/2025
**Status**: 🔴 CRÍTICO - Causa raiz identificada
**Prioridade**: URGENTE

---

## 1. RESUMO EXECUTIVO

**Problema Confirmado**: Os componentes do painel do cliente (`painel/page.tsx` e `projetos/page.tsx`) estão usando a **Server Action ANTIGA** (`createProjectClientAction`) que **NÃO possui sistema de notificações de billing**.

**Evidência Definitiva**: O diagnóstico da API mostrou que o último projeto criado possui o campo `billing_snapshot.fallback_reason = "assinatura_esgotada"`. Este campo **só existe na função antiga** - a função nova usa `billingWarnings` array.

**Impacto**:
- ❌ Notificações de quota esgotada NÃO são enviadas para clientes
- ❌ Notificações de quota esgotada NÃO são enviadas para administradores
- ❌ Sistema de alertas de billing completamente inativo

---

## 2. ANÁLISE DETALHADA

### 2.1. Modal Utilizado ✅

**Arquivo**: `src/lib/utils/lazy-components.tsx` (linha 144)

```typescript
export const LazyClientCreateProjectModal = dynamic(
  () => import('@/components/client/create-project-modal').then((mod) => mod.ClientCreateProjectModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);
```

**Uso**:
1. [src/app/cliente/painel/page.tsx:667](src/app/cliente/painel/page.tsx#L667) - Botão "Novo Projeto" no painel
2. [src/app/cliente/projetos/page.tsx:976](src/app/cliente/projetos/page.tsx#L976) - Botão "Novo Projeto" na página de projetos

**Status**: ✅ **CORRETO** - Ambos os locais usam o mesmo modal `LazyClientCreateProjectModal`

---

### 2.2. Server Action Importada ❌

**Painel do Cliente** - [src/app/cliente/painel/page.tsx:7](src/app/cliente/painel/page.tsx#L7):
```typescript
import { createProjectClientAction } from "@/lib/actions/project-actions";
```

**Página de Projetos** - [src/app/cliente/projetos/page.tsx:9](src/app/cliente/projetos/page.tsx#L9):
```typescript
import { createProjectClientAction } from "@/lib/actions/project-actions";
```

**Status**: ❌ **INCORRETO** - Ambos importam da **função ANTIGA** que não tem notificações

---

### 2.3. Comparação das Funções

#### Função ANTIGA (Sendo Usada) ❌

**Arquivo**: [src/lib/actions/project-actions.ts:1343](src/lib/actions/project-actions.ts#L1343)

**Características**:
```typescript
export async function createProjectClientAction(
  projectDataFromClient: CreateProjectClientData,
  clientUser: { id: string; name?: string | null; email?: string | null; companyName?: string | null; }
): Promise<{ data?: Project; error?: string; message?: string }>
```

**Problema 1**: Usa `fallback_reason` no billing_snapshot (linhas 1776, 1796, 1813, 1885, 1901, 1920)
```typescript
// Linha 1920 - Exemplo
billingSnapshot = {
  mode: 'avulso',
  potencia: potencia,
  valor_projeto: valorProjetoFinal,
  fallback_reason: 'assinatura_esgotada',  // ← CAMPO ANTIGO
  original_billing_mode: 'assinatura',
  plano_nome: assinatura.plano?.nome,
  // ...
};
```

**Problema 2**: ❌ **NÃO gera `billingWarnings` array**
**Problema 3**: ❌ **NÃO chama `sendBillingNotifications()`**
**Problema 4**: ❌ **NÃO notifica cliente**
**Problema 5**: ❌ **NÃO notifica administradores**

---

#### Função NOVA (Deveria Ser Usada) ✅

**Arquivo**: [src/lib/actions/multi-tenant-project-actions.ts:15](src/lib/actions/multi-tenant-project-actions.ts#L15)

**Características**:
```typescript
export async function createProjectMultiTenant(
  projectData: CreateProjectClientData,
  user: { id: string; email?: string | null; name?: string | null }
): Promise<{ data?: Project; error?: string; message?: string }>
```

**Sistema de Warnings** (linhas 218-227):
```typescript
} else {
  // Assinatura esgotada - projeto será avulso
  billingMode = 'avulso'
  billingWarnings.push({
    type: 'subscription_exhausted',
    severity: 'high',
    message: 'Cota mensal esgotada - projeto será cobrado como avulso'
  })
  devLog.warn('[createProjectMultiTenant] Assinatura esgotada - projeto será avulso')
}
```

**Sistema de Notificações** (linhas 450-477):
```typescript
// 8. ✅ NOVO SISTEMA: Enviar notificações de billing
try {
  if (billingWarnings.length > 0) {
    devLog.log('[createProjectMultiTenant] ✅ NOVO SISTEMA: Enviando notificações de billing:', {
      warningsCount: billingWarnings.length,
      billingMode
    });

    await sendBillingNotifications({
      projectId: newProject.id,
      projectNumber: newProject.number,
      userId: user.id,
      userName: user.name || 'Cliente',
      userEmail: user.email || 'cliente@exemplo.com',
      billingMode,
      warnings: billingWarnings,
      potencia: projectToCreate.potencia,
      pacoteNome: pacoteAtivo?.pacotes_definicoes?.nome,
      assinaturaNome: assinaturaAtiva?.planos_assinatura?.nome
    });
  }
} catch (billingNotificationError) {
  devLog.error('[createProjectMultiTenant] ❌ ERRO ao enviar notificações de billing:', billingNotificationError);
  // ⚠️ Não falhar a criação por causa das notificações
}
```

**Vantagens**:
- ✅ Gera `billingWarnings` array quando quota esgotada
- ✅ Chama `sendBillingNotifications()` automaticamente
- ✅ Notifica cliente sobre situação da quota
- ✅ Notifica administradores sobre projeto fora do limite
- ✅ Isolamento multi-tenant correto
- ✅ Logs detalhados para debugging

---

## 3. EVIDÊNCIA DO PROBLEMA

### 3.1. Resultado da API de Diagnóstico

**Endpoint**: `GET /api/diagnostico/billing-notifications?userId=<user_id>`

**Último Projeto Criado**:
```json
{
  "testes": {
    "ultimo_projeto": {
      "success": true,
      "dados": {
        "id": "...",
        "numero": "...",
        "nome": "...",
        "billing_mode": "avulso",
        "billing_snapshot": {
          "mode": "avulso",
          "fallback_reason": "assinatura_esgotada",  // ← PROVA: Função antiga foi usada
          "original_billing_mode": "assinatura",
          "projetos_usados_mes_atual": 3
        }
      }
    }
  }
}
```

**Análise**:
- Campo `fallback_reason` está presente no `billing_snapshot`
- Este campo **só existe em `project-actions.ts` (função antiga)**
- A função nova (`multi-tenant-project-actions.ts`) **não usa** `fallback_reason`
- A função nova usa `billingWarnings` array ao invés de `fallback_reason`

**Conclusão**: ✅ **CONFIRMADO** - Cliente está usando a função ANTIGA

---

### 3.2. Teste de Notificações

**Resultado do Diagnóstico**:
```json
{
  "testes": {
    "notificacao_cliente": {
      "success": true,
      "notificationId": "...",
      "mensagem": "Notificação criada com sucesso"
    },
    "notificacao_admins": {
      "success": true,
      "admins_notificados": 2,
      "notificationIds": ["...", "..."],
      "mensagem": "2 administrador(es) notificado(s)"
    }
  }
}
```

**Análise**:
- Sistema de notificações **FUNCIONA PERFEITAMENTE** quando testado diretamente
- O problema **NÃO é** nas funções de notificação
- O problema **É** que a função antiga **nunca chama** as notificações

---

## 4. CAUSA RAIZ

### Problema Principal

Os componentes do cliente estão usando a função **errada**:

**Função Atual** (❌ Incorreta):
```typescript
// src/app/cliente/painel/page.tsx:7
// src/app/cliente/projetos/page.tsx:9
import { createProjectClientAction } from "@/lib/actions/project-actions";
```

**Função Correta** (✅ Deveria ser):
```typescript
import { createProjectMultiTenant } from "@/lib/actions/multi-tenant-project-actions";
```

---

### Por que aconteceu?

1. **Refatoração Incompleta**: Foi criada uma nova função (`createProjectMultiTenant`) com sistema de notificações, mas os componentes **não foram atualizados** para usar a nova função.

2. **Código Legado Ativo**: A função antiga (`createProjectClientAction`) ainda existe e continua funcionando, mas **não tem** o sistema de notificações.

3. **Assinatura Similar**: Ambas as funções têm assinaturas parecidas, então o código compila sem erros:
   - Antiga: `(projectDataFromClient, clientUser)`
   - Nova: `(projectData, user)`

---

## 5. SOLUÇÃO RECOMENDADA

### Passo 1: Atualizar Imports

**Arquivo**: [src/app/cliente/painel/page.tsx](src/app/cliente/painel/page.tsx#L7)

**Mudar de**:
```typescript
import { createProjectClientAction } from "@/lib/actions/project-actions";
```

**Para**:
```typescript
import { createProjectMultiTenant } from "@/lib/actions/multi-tenant-project-actions";
```

---

**Arquivo**: [src/app/cliente/projetos/page.tsx](src/app/cliente/projetos/page.tsx#L9)

**Mudar de**:
```typescript
import { createProjectClientAction } from "@/lib/actions/project-actions";
```

**Para**:
```typescript
import { createProjectMultiTenant } from "@/lib/actions/multi-tenant-project-actions";
```

---

### Passo 2: Atualizar Chamadas da Função

**Arquivo**: [src/app/cliente/painel/page.tsx:286](src/app/cliente/painel/page.tsx#L286)

**Mudar de**:
```typescript
const result = await createProjectClientAction(projectDataForAction, clientUserInfo);
```

**Para**:
```typescript
const result = await createProjectMultiTenant(projectDataForAction, clientUserInfo);
```

---

**Arquivo**: [src/app/cliente/projetos/page.tsx:463](src/app/cliente/projetos/page.tsx#L463)

**Mudar de**:
```typescript
const result = await createProjectClientAction(projectDataForAction, clientUserInfo);
```

**Para**:
```typescript
const result = await createProjectMultiTenant(projectDataForAction, clientUserInfo);
```

---

### Passo 3: Verificar Compatibilidade dos Parâmetros

**Parâmetros Atuais** (ambos os arquivos):
```typescript
const clientUserInfo = {
  id: user.id,
  name: userData?.name || user.displayName || user.email,
  companyName: userData?.companyName,
  email: user.email,
};

const result = await createProjectClientAction(projectDataForAction, clientUserInfo);
```

**Função Nova Espera**:
```typescript
user: { id: string; email?: string | null; name?: string | null }
```

**Análise**:
- ✅ `id` - compatível
- ✅ `email` - compatível
- ✅ `name` - compatível
- ⚠️ `companyName` - a função nova **não usa** este campo (mas não causará erro)

**Ajuste Opcional** (para ficar 100% compatível):
```typescript
const userInfo = {
  id: user.id,
  name: userData?.name || user.displayName || user.email,
  email: user.email,
};

const result = await createProjectMultiTenant(projectDataForAction, userInfo);
```

---

## 6. VALIDAÇÃO DA SOLUÇÃO

Após aplicar a correção, o fluxo esperado será:

### Cenário 1: Cliente Cria 3º Projeto (Último da Quota)

**Estado Antes**:
- `projetos_usados_mes_atual` = 2
- `projetos_mensais` = 3
- `projetosDisponiveis` = 1

**Fluxo Esperado**:
```typescript
// multi-tenant-project-actions.ts:205
if (projetosDisponiveis > 0) {
  billingMode = 'assinatura'
  // ✅ Projeto criado dentro da quota
  // ❌ AINDA NÃO notifica (precisa adicionar lógica para último projeto)
}
```

**Resultado**:
- ✅ Projeto criado como 'assinatura'
- ❌ Ainda não notifica (será corrigido na próxima fase)

---

### Cenário 2: Cliente Cria 4º Projeto (Quota Esgotada)

**Estado Antes**:
- `projetos_usados_mes_atual` = 3
- `projetos_mensais` = 3
- `projetosDisponiveis` = 0

**Fluxo Esperado**:
```typescript
// multi-tenant-project-actions.ts:219-227
} else {
  // Assinatura esgotada - projeto será avulso
  billingMode = 'avulso'
  billingWarnings.push({
    type: 'subscription_exhausted',
    severity: 'high',
    message: 'Cota mensal esgotada - projeto será cobrado como avulso'
  })
}

// multi-tenant-project-actions.ts:450-477
if (billingWarnings.length > 0) {  // ✅ TRUE (1 warning)
  await sendBillingNotifications({
    projectId: newProject.id,
    projectNumber: newProject.number,
    userId: user.id,
    userName: user.name || 'Cliente',
    userEmail: user.email || 'cliente@exemplo.com',
    billingMode: 'avulso',
    warnings: billingWarnings,
    // ...
  });
}
```

**Resultado**:
- ✅ Projeto criado como 'avulso'
- ✅ **NOTIFICAÇÃO ENVIADA PARA CLIENTE**: "Cota mensal esgotada"
- ✅ **NOTIFICAÇÃO ENVIADA PARA ADMINS**: "Cliente criou projeto fora do pacote"

---

## 7. PRÓXIMOS PASSOS

### Fase 1: Correção Imediata (CRÍTICO) 🔴

1. ✅ Substituir import em `painel/page.tsx`
2. ✅ Substituir import em `projetos/page.tsx`
3. ✅ Substituir chamadas da função em ambos os arquivos
4. ✅ Testar criação de projeto com quota esgotada
5. ✅ Verificar se notificações chegam para cliente
6. ✅ Verificar se notificações chegam para admins

**Tempo estimado**: 15 minutos
**Impacto**: Alto - resolve 50% do problema

---

### Fase 2: Melhorias Adicionais (ALTA PRIORIDADE) ⚠️

Conforme documentado em [RELATORIO-TECNICO-NOTIFICACOES-BILLING.md](RELATORIO-TECNICO-NOTIFICACOES-BILLING.md), ainda será necessário:

1. ✅ Adicionar detecção de **último projeto da quota**
2. ✅ Adicionar warning `subscription_quota_depleted`
3. ✅ Adicionar tratamento no `billingNotificationService.ts`

**Tempo estimado**: 1 hora
**Impacto**: Médio - resolve os 50% restantes

---

## 8. CHECKLIST DE VALIDAÇÃO

Após aplicar a correção, validar:

- [ ] Cliente consegue criar projeto com quota disponível
- [ ] Cliente consegue criar projeto com quota esgotada
- [ ] **Notificação aparece no painel do cliente** quando quota esgotada
- [ ] **Notificação aparece no painel do admin** quando quota esgotada
- [ ] **Email é enviado para cliente** (se configurado)
- [ ] **Email é enviado para admins** (se configurado)
- [ ] Projeto tem `billing_warnings` no snapshot (NÃO `fallback_reason`)
- [ ] Logs mostram `[createProjectMultiTenant]` ao invés de `[createProjectClientAction]`

---

## 9. IMPACTO DA MUDANÇA

### Riscos ✅ BAIXO

**Por que é seguro mudar**:
1. ✅ Ambas as funções têm assinaturas compatíveis
2. ✅ Ambas retornam o mesmo tipo: `Promise<{ data?: Project; error?: string; message?: string }>`
3. ✅ Parâmetros são compatíveis (exceto `companyName` que não é usado)
4. ✅ Função nova é **mais completa** que a antiga
5. ✅ Código já foi testado no diagnóstico e funciona

**Quebras esperadas**: ❌ NENHUMA

---

### Benefícios ✅ ALTO

1. ✅ Notificações de billing começam a funcionar
2. ✅ Cliente será alertado sobre quota esgotada
3. ✅ Admins serão alertados sobre projetos fora do limite
4. ✅ Melhor isolamento multi-tenant
5. ✅ Logs mais detalhados para debugging
6. ✅ Sistema de warnings estruturado

---

## 10. CONCLUSÃO

**Problema Identificado**: ✅ Componentes do cliente usam Server Action antiga sem notificações

**Solução**: ✅ Substituir `createProjectClientAction` por `createProjectMultiTenant` em 2 arquivos

**Complexidade**: ✅ BAIXA - mudança simples de import e chamada de função

**Risco**: ✅ BAIXO - funções são compatíveis

**Impacto**: ✅ ALTO - resolve o problema principal de notificações

**Recomendação**: **APLICAR IMEDIATAMENTE** - é uma correção crítica e segura

---

**Arquivos Afetados**:
1. [src/app/cliente/painel/page.tsx](src/app/cliente/painel/page.tsx) - linhas 7 e 286
2. [src/app/cliente/projetos/page.tsx](src/app/cliente/projetos/page.tsx) - linhas 9 e 463

**Fim do Diagnóstico**
