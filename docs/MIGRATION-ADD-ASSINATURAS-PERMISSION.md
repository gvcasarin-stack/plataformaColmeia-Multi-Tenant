# 🔄 Migration: Adicionar Permissão can_view_assinaturas

## 📋 Contexto

A permissão `can_view_assinaturas` foi adicionada ao sistema para controlar acesso à aba de Assinaturas.

**Problema:** Colaboradores criados **antes** dessa mudança não possuem essa permissão no banco de dados, causando:
- Tabs não aparecem na sidebar
- Sistema não reconhece permissões corretamente
- TypeError ao verificar `can_view_assinaturas === true`

## ✅ Solução

### **1. Atualizar Colaboradores Existentes**

Execute o script SQL no Supabase SQL Editor:

```sql
-- Atualizar TODOS os colaboradores em TODOS os tenants
UPDATE users
SET
  permissions = jsonb_set(
    permissions::jsonb,
    '{can_view_assinaturas}',
    'false'::jsonb
  ),
  updated_at = NOW()
WHERE role = 'colaborador'
  AND status = 'active'
  AND NOT (permissions::jsonb ? 'can_view_assinaturas');
```

### **2. Verificar Resultado**

```sql
-- Contar colaboradores atualizados
SELECT
  COUNT(*) as total_colaboradores,
  COUNT(CASE WHEN permissions::jsonb ? 'can_view_assinaturas' THEN 1 END) as com_permissao,
  COUNT(CASE WHEN NOT (permissions::jsonb ? 'can_view_assinaturas') THEN 1 END) as sem_permissao
FROM users
WHERE role = 'colaborador'
  AND status = 'active';
```

**Resultado esperado:**
- `com_permissao` = total de colaboradores
- `sem_permissao` = 0

### **3. Novos Colaboradores**

✅ **Não precisa fazer nada!**

O preset `COLABORADOR_PERMISSIONS` no código já inclui `can_view_assinaturas: false`, então **todos os novos colaboradores** criados já terão essa permissão automaticamente.

## 🎯 Impacto

### **Antes da Migration:**
- ❌ Colaboradores existentes: permissions incompletas
- ❌ Tabs não aparecem na sidebar
- ❌ Sistema quebra ao verificar permissões

### **Depois da Migration:**
- ✅ Todos colaboradores: permissions completas
- ✅ Tabs aparecem conforme configurado
- ✅ Sistema funciona corretamente

## 📊 Tenants Afetados

**TODOS os tenants** com colaboradores ativos serão atualizados automaticamente pelo script.

Não é necessário executar o script separadamente para cada tenant.

## ⚠️ Importante

- **Backup:** O Supabase mantém backups automáticos
- **Rollback:** Se necessário, pode remover a chave com:
  ```sql
  UPDATE users
  SET permissions = permissions::jsonb - 'can_view_assinaturas'
  WHERE role = 'colaborador';
  ```

## 🔍 Monitoramento

Após a migration, verifique os logs do console (F12) ao fazer login como colaborador:

```
[AdminSidebar] ===== DEBUG PERMISSIONS =====
[AdminSidebar] Merged userPermissions: {
  can_view_assinaturas: false,  // ✅ Deve aparecer
  ...
}
```

## 📝 Referências

- Script completo: `/scripts/add-missing-permission-all-colaboradores.sql`
- Preset atualizado: `/src/types/user.ts` (linha 80-93)
- Interface: `/src/lib/contexts/AuthContext.tsx` (linha 72-84)
