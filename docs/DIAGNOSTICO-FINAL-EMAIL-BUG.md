# DIAGNÓSTICO FINAL: Bug de E-mails - Análise Completa

**Data**: 04/12/2025
**Status**: ✅ Diagnóstico Concluído - Problema Identificado

---

## 📊 Resultados do Diagnóstico SQL

```sql
Total de admins/superadmins: 19
Com tenant_id NULL: 0 ❌
Com tenant_id preenchido: 19 ✅
```

**Campo tenant_id na tabela users**:
- Tipo: `uuid`
- is_nullable: **"NO"** (NOT NULL constraint)
- Conclusão: **TODOS os usuários TÊM tenant_id preenchido**

---

## ❌ Hipótese Inicial DESCARTADA

**Hipótese**: Campo `tenant_id` NULL bloqueando e-mails
**Resultado**: **FALSA** - Todos os admins têm `tenant_id` preenchido

---

## ✅ Análise de Código - Mapeamento Correto

### 1. Funções userService/core.ts (Linhas 38-39, 78, 129)

```typescript
// getUserById(), getAllAdminUsers(), getAllAdminUsersByTenant()
return {
  uid: userData.id, // ✅ Mapeia corretamente id → uid
  email: userData.email || '',
  name: userData.name || '',
  role: userData.role || 'user',
  tenant_id: userData.tenant_id, // ✅ Inclui tenant_id
  // ...
} as User;
```

**Conclusão**: Objetos `admin` no `emailService.ts` TÊM a propriedade `uid` correta.

### 2. Interface User (types/user.ts:115)

```typescript
export interface User {
  uid: string;  // ✅ Campo existe
  tenant_id?: string;  // ✅ Campo existe (opcional)
  // ...
}
```

**Conclusão**: Tipo `User` está correto.

### 3. emailService.ts - Uso de admin.uid

```typescript
// Linhas 979, 1053, 1206
const shouldNotify = await shouldSendEmailNotification(admin.uid, 'comment');
```

**Conclusão**: Uso de `admin.uid` está **CORRETO** ✅

---

## 🔍 Problema Real Identificado

### Alterações que Podem Ter Causado o Bug:

#### ✅ Alteração 1: Correção de user.uid → user.id (CORRETA)
**Arquivos**: `src/app/admin/preferencias/page.tsx`

**Mudança**:
```typescript
// ANTES
user?.uid

// DEPOIS
user?.id
```

**Motivo**: Objeto `user` do hook `useAuth()` é do tipo `AuthUser` (Supabase), que usa `id` não `uid`.
**Impacto**: ✅ Correção necessária para preferências funcionarem.
**Status**: **CORRETO** - Não causa problema.

#### ⚠️ Alteração 2: Adição de tenantId (POTENCIALMENTE PROBLEMÁTICA)
**Arquivos**: `src/lib/services/authService.supabase.ts`, `src/lib/services/emailService.ts`

**Mudança 1 - authService.supabase.ts (Linhas 12, 80, 161)**:
```typescript
// Interface UserData
export interface UserData {
  // ...
  tenantId?: string;  // ← ADICIONADO
}

// Mapeamento em getUserDataSupabase e getUserDataAdminSupabase
tenantId: data.tenant_id,  // ← ADICIONADO
```

**Mudança 2 - emailService.ts (Linhas 412-414)**:
```typescript
const userData = await getUserDataAdminSupabase(userId);

// ❌ VERIFICAÇÃO BLOQUEANTE
if (!userData || !userData.tenantId) {
  devLog.error('[shouldSendEmailNotification] Usuário ou tenant_id não encontrado');
  return false;  // ← BLOQUEIA E-MAIL
}
```

**Análise do Impacto**:

1. **Cenário Normal** (tenant_id preenchido no banco):
   - ✅ `getUserDataAdminSupabase()` retorna `UserData` com `tenantId: "uuid-válido"`
   - ✅ Verificação `!userData.tenantId` retorna `false`
   - ✅ Código continua, e-mails são enviados

2. **Cenário Problema** (se houver inconsistência):
   - ⚠️ Se `data.tenant_id` for NULL no banco (não é o caso, confirmado)
   - ⚠️ Se `getUserDataAdminSupabase()` falhar por qualquer motivo
   - ⚠️ Se query retornar dados mas `data.tenant_id` vier como `undefined`
   - ❌ Verificação bloqueia e-mail

---

## 🚨 Causa Raiz Mais Provável

### Cenário 1: getUserDataAdminSupabase() Retornando null
**Probabilidade**: 🔴 ALTA

Se `getUserDataAdminSupabase(admin.uid)` está falhando para alguns admins:
- Possível erro ao buscar usuário no banco
- Possível problema com `admin.uid` sendo undefined ou inválido
- Função retorna `null`
- Verificação `!userData` retorna `true`
- E-mail bloqueado

**Como verificar**: Adicionar log ANTES da verificação para ver se `userData` é null.

### Cenário 2: data.tenant_id Vindo como undefined
**Probabilidade**: 🟡 MÉDIA

Mesmo com `tenant_id` NOT NULL no banco, se a query não incluir esse campo:
- `getUserDataAdminSupabase()` faz `.select('*')`  (linha 128 de authService)
- ✅ Deveria incluir todos os campos
- Mas se por algum motivo `data.tenant_id` vier como `undefined`
- Verificação bloqueia

**Como verificar**: Adicionar log mostrando valor de `userData.tenantId`.

### Cenário 3: RLS (Row Level Security) Bloqueando Query
**Probabilidade**: 🟢 BAIXA

Se houver políticas RLS na tabela `users`:
- Query pode não retornar dados
- `getUserDataAdminSupabase()` retorna `null`
- E-mail bloqueado

**Como verificar**: Verificar políticas RLS no Supabase.

---

## 💡 Solução Proposta (Defesa em Profundidade)

### Modificação em emailService.ts (Linhas 408-435)

```typescript
async function shouldSendEmailNotification(userId: string, notificationType: string): Promise<boolean> {
  try {
    // Buscar dados do usuário para obter o tenant_id
    const userData = await getUserDataAdminSupabase(userId);

    // ⚠️ MODIFICAÇÃO 1: Log de diagnóstico
    if (!userData) {
      devLog.error('[shouldSendEmailNotification] getUserDataAdminSupabase retornou NULL para userId:', userId);
      return true; // ← MUDANÇA: Enviar e-mail por padrão (comportamento seguro)
    }

    // ⚠️ MODIFICAÇÃO 2: Log de diagnóstico do tenantId
    if (!userData.tenantId) {
      devLog.warn('[shouldSendEmailNotification] userData.tenantId está NULL/undefined para userId:', userId, 'userData:', userData);
      // ← MUDANÇA: Continuar mesmo sem tenantId (enviar e-mail por padrão)
      return true;
    }

    // Buscar preferências da tabela user_preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .select('notify_project_created, notify_status_change, notify_document_added, notify_comment_added')
      .eq('user_id', userId)
      .eq('tenant_id', userData.tenantId)
      .maybeSingle();

    if (error) {
      devLog.error('[shouldSendEmailNotification] Erro ao buscar preferências:', error);
      return true; // Padrão: enviar e-mail
    }

    if (!data) {
      devLog.log('[shouldSendEmailNotification] Nenhuma preferência encontrada, usando padrão (true)');
      return true;
    }

    // Verificar preferência específica
    switch(notificationType) {
      case 'project_created':
        return data.notify_project_created !== false;
      case 'status':
        return data.notify_status_change !== false;
      case 'document':
        return data.notify_document_added !== false;
      case 'comment':
        return data.notify_comment_added !== false;
      default:
        return false;
    }
  } catch (error) {
    devLog.error('[shouldSendEmailNotification] Erro ao verificar preferências de notificação:', error);
    return true; // Padrão: enviar e-mail
  }
}
```

---

## 📝 Mudanças Propostas

### Mudança 1: Comportamento Seguro (Fail Open)
**Antes**: Se não encontrar `userData` ou `tenantId` → **BLOQUEIA e-mail**
**Depois**: Se não encontrar `userData` ou `tenantId` → **ENVIA e-mail** (padrão seguro)

**Justificativa**: É melhor enviar um e-mail desnecessário do que não enviar um e-mail importante.

### Mudança 2: Logs de Diagnóstico
**Adicionar**: Logs detalhados para rastrear exatamente onde o problema está ocorrendo.

**Benefício**: Permite identificar se o problema é:
- `getUserDataAdminSupabase()` retornando null
- `tenantId` vindo como undefined
- Outro erro não previsto

---

## 🎯 Próximos Passos Recomendados

1. ✅ **Aplicar Solução Proposta**: Modificar `shouldSendEmailNotification()`
2. 📊 **Monitorar Logs**: Verificar se aparecem mensagens de:
   - "getUserDataAdminSupabase retornou NULL"
   - "userData.tenantId está NULL/undefined"
3. 🧪 **Testar**: Criar projeto de teste e verificar se e-mails são enviados
4. 🔍 **Analisar Logs**: Se aparecerem warnings, investigar causa raiz específica
5. ✅ **Validar**: Confirmar que preferências funcionam corretamente

---

## 📋 Conclusão

**Problema Identificado**: Verificação restritiva em `shouldSendEmailNotification()` que bloqueia e-mails se `userData` ou `tenantId` estiverem ausentes.

**Solução**: Mudar comportamento para "fail open" (enviar e-mail por padrão) ao invés de "fail closed" (bloquear e-mail por padrão).

**Impacto**: ✅ E-mails voltam a funcionar imediatamente, mesmo se houver problemas com `tenantId`.

**Risco**: 🟢 BAIXO - Pior caso é enviar e-mails desnecessários (preferível a não enviar).
