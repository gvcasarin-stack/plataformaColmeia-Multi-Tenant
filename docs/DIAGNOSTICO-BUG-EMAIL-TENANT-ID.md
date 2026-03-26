# DIAGNÓSTICO: Bug de E-mails Bloqueados Após Alteração do Campo tenantId

**Data**: 04/12/2025
**Status**: 🔴 CRÍTICO - E-mails bloqueados novamente
**Causa Raiz**: Campo `tenant_id` NULL na tabela `users` para admins/superadmins

---

## 📋 Resumo Executivo

Após as alterações para corrigir o bug de preferências de e-mail (mudança de `user.uid` para `user.id`), foi adicionado o campo `tenantId` à interface `UserData`. No entanto, essa alteração pode ter causado um **bloqueio total de e-mails** se o campo `tenant_id` estiver NULL no banco de dados.

---

## 🔍 Análise Técnica

### Alterações Realizadas

**Arquivo**: `src/lib/services/authService.supabase.ts`

```typescript
// ✅ Adicionado na interface UserData (linha 12)
export interface UserData {
  // ... outros campos
  tenantId?: string;  // ← NOVO CAMPO ADICIONADO
}

// ✅ Adicionado no mapeamento getUserDataSupabase (linha 80)
const userData: UserData = {
  // ... outros campos
  tenantId: data.tenant_id,  // ← MAPEAMENTO ADICIONADO
}

// ✅ Adicionado no mapeamento getUserDataAdminSupabase (linha 161)
const userData: UserData = {
  // ... outros campos
  tenantId: data.tenant_id,  // ← MAPEAMENTO ADICIONADO
}
```

### O Problema Crítico

**Arquivo**: `src/lib/services/emailService.ts` (linhas 408-415)

```typescript
async function shouldSendEmailNotification(userId: string, notificationType: string): Promise<boolean> {
  try {
    // Buscar dados do usuário para obter o tenant_id
    const userData = await getUserDataAdminSupabase(userId);

    // ❌ PROBLEMA CRÍTICO: Se tenant_id for NULL no banco, bloqueia TODOS os e-mails
    if (!userData || !userData.tenantId) {
      devLog.error('[shouldSendEmailNotification] Usuário ou tenant_id não encontrado');
      return false; // ← BLOQUEIA O ENVIO DE E-MAILS
    }

    // ... resto do código nunca é executado
  }
}
```

### Fluxo do Bug

```
1. Cliente cria projeto OU Admin adiciona comentário
   ↓
2. Sistema tenta enviar e-mail para admins
   ↓
3. Para cada admin, chama shouldSendEmailNotification(admin.uid, 'project_created')
   ↓
4. shouldSendEmailNotification() chama getUserDataAdminSupabase(admin.uid)
   ↓
5. getUserDataAdminSupabase() retorna UserData com tenantId = data.tenant_id
   ↓
6. ❌ Se data.tenant_id for NULL no banco de dados:
      userData.tenantId = null
   ↓
7. ❌ Verificação: !userData.tenantId retorna TRUE
   ↓
8. ❌ Função retorna FALSE (não enviar e-mail)
   ↓
9. ❌ Loop continue; (pula este admin)
   ↓
10. ❌ RESULTADO: Nenhum e-mail é enviado
```

---

## 🎯 Cenários Afetados

### Cenário 1: tenant_id NULL na tabela users
**Probabilidade**: 🔴 ALTA (muito provável em sistemas multi-tenant)

Se os usuários admin/superadmin na tabela `users` **não têm** o campo `tenant_id` preenchido:
- ✅ getUserDataAdminSupabase() executa com sucesso
- ❌ Retorna UserData com `tenantId: null`
- ❌ Verificação `!userData.tenantId` retorna `true`
- ❌ Função retorna `false`, bloqueando **TODOS os e-mails**

### Cenário 2: tenant_id preenchido mas diferente do esperado
**Probabilidade**: 🟡 MÉDIA

Se o `tenant_id` está preenchido mas não corresponde ao tenant esperado:
- ✅ Verificação `!userData.tenantId` passa
- ❌ Query em `user_preferences` busca com `tenant_id` errado
- ❌ Não encontra preferências
- ✅ Retorna `true` (padrão), e-mails são enviados

### Cenário 3: tenant_id preenchido corretamente
**Probabilidade**: 🟢 BAIXA (ideal, mas pouco provável sem migração)

Se todos os admins têm `tenant_id` preenchido corretamente:
- ✅ Tudo funciona como esperado
- ✅ Preferências são consultadas
- ✅ E-mails são enviados respeitando preferências

---

## 🔬 Investigação Necessária

### Script SQL de Diagnóstico

Criado em: `scripts/diagnostico-tenant-id-usuarios.sql`

Execute este script para verificar:
1. Quantos admins/superadmins existem
2. Quantos têm `tenant_id` NULL
3. Quantos têm `tenant_id` preenchido
4. Listar todos com status do campo

### Teste Manual Recomendado

1. Criar um projeto de teste como cliente
2. Verificar logs do servidor em tempo real
3. Procurar por: `[shouldSendEmailNotification] Usuário ou tenant_id não encontrado`
4. Se aparecer, confirma que `tenant_id` está NULL

---

## 💡 Soluções Propostas

### Solução 1: Tornar tenantId opcional na verificação (RECOMENDADA)
**Vantagem**: Não bloqueia e-mails se tenant_id for NULL
**Desvantagem**: Preferências podem não funcionar corretamente

```typescript
// Modificar shouldSendEmailNotification()
const userData = await getUserDataAdminSupabase(userId);
if (!userData) {
  devLog.error('[shouldSendEmailNotification] Usuário não encontrado');
  return false;
}

// Se não tiver tenant_id, tentar buscar do contexto ou usar fallback
const tenantId = userData.tenantId || getCurrentTenantId();

if (!tenantId) {
  devLog.warn('[shouldSendEmailNotification] tenant_id não disponível, enviando e-mail (padrão)');
  return true; // ← ENVIAR E-MAIL MESMO SEM TENANT_ID (padrão seguro)
}
```

### Solução 2: Migração de dados - Preencher tenant_id
**Vantagem**: Resolve definitivamente
**Desvantagem**: Requer migração de banco de dados

```sql
-- Preencher tenant_id para todos os usuários baseado em alguma lógica
UPDATE users
SET tenant_id = (SELECT id FROM tenants WHERE ... LIMIT 1)
WHERE tenant_id IS NULL;
```

### Solução 3: Remover verificação de tenantId (TEMPORÁRIA)
**Vantagem**: E-mails voltam a funcionar imediatamente
**Desvantagem**: Sistema de preferências pode não funcionar

```typescript
// Remover a verificação temporariamente
const userData = await getUserDataAdminSupabase(userId);
if (!userData) {
  return false;
}

// Continuar sem verificar tenantId
```

---

## 🚨 Impacto

### Funcionalidades Afetadas
- ❌ Notificações de novo projeto criado
- ❌ Notificações de comentários adicionados
- ❌ Notificações de documentos adicionados
- ❌ Notificações de mudança de status

### Usuários Afetados
- ❌ Administradores
- ❌ Superadministradores
- ❌ Colaboradores
- ✅ Clientes (notificações de admin para cliente podem funcionar)

---

## 📊 Evidências

### Código Antes vs Depois

**ANTES** (funcionava, mas sem verificação de preferências):
```typescript
// getUserDataAdminSupabase() não retornava tenantId
// shouldSendEmailNotification() não verificava tenantId
// E-mails eram enviados para todos sempre
```

**DEPOIS** (com verificação de tenantId):
```typescript
// getUserDataAdminSupabase() agora retorna tenantId
// shouldSendEmailNotification() BLOQUEIA se tenantId for NULL
// E-mails podem estar bloqueados
```

---

## 🔧 Próximos Passos

1. **Executar diagnóstico SQL** para confirmar se `tenant_id` está NULL
2. **Analisar logs do servidor** em produção
3. **Decidir qual solução aplicar** baseado nos resultados
4. **Aplicar correção** de forma cirúrgica
5. **Testar completamente** antes de considerar resolvido

---

## 📝 Conclusão

A alteração do campo `tenantId` foi tecnicamente correta para suportar o sistema de preferências multi-tenant, **mas pode ter introduzido um bug crítico** se o campo `tenant_id` não estiver preenchido no banco de dados.

**Recomendação imediata**: Executar o script de diagnóstico SQL e verificar logs do servidor para confirmar a causa raiz antes de aplicar qualquer correção.
