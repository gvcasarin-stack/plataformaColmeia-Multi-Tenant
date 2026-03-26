# 🐛 RELATÓRIO TÉCNICO: Erro ao Renovar Pacote - tenant_id NULL

**Data:** 27/11/2025
**Severidade:** 🔴 **CRÍTICA** - Impede renovação de pacotes
**Status:** ⚠️ Identificado - Aguardando correção

---

## 📋 RESUMO EXECUTIVO

O sistema está **bloqueando a renovação de pacotes** com o erro:

```
"null value in column tenant_id" of relation "cliente_pacotes" violates not-null constraint"
```

**Causa Raiz:** Campo `tenant_id` **não está sendo incluído** no INSERT ao renovar pacote.

---

## 🔍 ANÁLISE DO PROBLEMA

### Comportamento Observado:

1. ✅ **Admin acessa** `/admin/clientes` → aba **Assinaturas**
2. ✅ **Visualiza cliente** com pacote esgotado ("Pacote Ouro • 5/5")
3. ✅ **Clica** no botão "Renovar"
4. ✅ **Modal abre** confirmando renovação
5. ✅ **Confirma** renovação ("Sim, renovar")
6. ❌ **ERRO**: "Erro ao renovar pacote - null value in column tenant_id"
7. ❌ **Pacote NÃO é renovado**

### Erro Completo:

```
Erro ao renovar pacote
null value in column "tenant_id" of relation "cliente_pacotes" violates not-null constraint
```

---

## 🔧 CAUSA RAIZ TÉCNICA

### Arquivo Afetado:

**`src/app/api/admin/cliente-pacotes/[id]/route.ts`**
**Função:** `PATCH`
**Linhas:** 70-82

### Código Problemático:

```typescript
// Criar novo pacote
const dataAtivacao = new Date();
const dataExpiracao = new Date(dataAtivacao);
dataExpiracao.setDate(dataExpiracao.getDate() + novoPacote.validade_dias);

const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: novoPacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
    // ❌ FALTANDO: tenant_id: tenantId,
  })
  .select()
  .single();
```

### Por que Falha?

1. **Schema da Tabela** `cliente_pacotes`:
   ```sql
   CREATE TABLE cliente_pacotes (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL,
     pacote_id UUID NOT NULL,
     tenant_id UUID NOT NULL,  -- ❌ NOT NULL constraint
     data_ativacao TIMESTAMP,
     data_expiracao TIMESTAMP,
     projetos_inclusos INT,
     projetos_usados INT,
     status TEXT,
     ...
   );
   ```

2. **INSERT não inclui `tenant_id`**: O código faz o INSERT sem passar `tenant_id`
3. **Banco rejeita**: Constraint `NOT NULL` viola e retorna erro
4. **Renovação falha**: Transação é revertida, pacote não é criado

---

## 📊 FLUXO COMPLETO DO ERRO

### Frontend (ClientSubscriptionsTab.tsx):

**Linha 691-704:**
```typescript
if (renewTarget.type === 'package') {
  const pkg = renewTarget.data;
  // Renovar com o mesmo pacote (zera projetos e renova período)
  const response = await fetch(`/api/admin/cliente-pacotes/${pkg.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novo_pacote_id: pkg.pacote_id }),  // ✅ Envia pacote_id
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Erro ao renovar pacote');  // ❌ Erro capturado
  }
}
```

### Backend API (cliente-pacotes/[id]/route.ts):

**Linha 12-13:**
```typescript
const hdrs = headers();
const tenantId = hdrs.get('x-tenant-id');  // ✅ tenant_id EXISTE no header
```

**Linha 42-94:**
```typescript
// Se for renovação (trocar por novo pacote)
if (novo_pacote_id) {
  // ✅ Busca novo pacote COM tenant_id correto
  const { data: novoPacote } = await supabase
    .from('pacotes_definicoes')
    .select('*')
    .eq('id', novo_pacote_id)
    .eq('tenant_id', tenantId)  // ✅ Valida tenant_id
    .single();

  // ✅ Cancela pacote antigo
  await supabase
    .from('cliente_pacotes')
    .update({ status: 'expirado' })
    .eq('id', pacoteClienteId);

  // ❌ PROBLEMA: INSERT sem tenant_id
  const { data: novoPacoteCliente, error: createError } = await supabase
    .from('cliente_pacotes')
    .insert({
      user_id: pacoteAtual.user_id,
      pacote_id: novo_pacote_id,
      data_ativacao: dataAtivacao.toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      projetos_inclusos: novoPacote.quantidade_projetos,
      projetos_usados: 0,
      status: 'ativo',
      // ❌ FALTANDO: tenant_id: tenantId
    })
    .select()
    .single();

  if (createError) {
    // ❌ Erro capturado aqui: "null value in column tenant_id"
    throw createError;
  }
}
```

---

## 🎯 IMPACTO NO NEGÓCIO

### Problemas Causados:

1. **❌ Impossível Renovar Pacotes**: Admins não conseguem renovar pacotes esgotados ou expirados
2. **❌ Clientes Bloqueados**: Clientes com pacotes esgotados ficam sem poder criar projetos
3. **❌ Perda de Receita**: Renovações que deveriam gerar receita não são concluídas
4. **❌ Suporte Sobrecarregado**: Clientes entram em contato reportando impossibilidade de renovar
5. **❌ Experiência Ruim**: Admin vê erro incompreensível sobre "tenant_id"

### Exemplo Real:

```
Admin: "Preciso renovar o pacote da Catarina Solar que está esgotado (5/5)"
  ↓
Clica "Renovar" → Modal abre → Confirma
  ↓
❌ ERRO: "null value in column tenant_id"
  ↓
Pacote NÃO renovado, cliente continua esgotado 🔴
  ↓
Cliente não pode criar novos projetos 😠
```

---

## ✅ SOLUÇÃO PROPOSTA

### Correção Principal:

**Arquivo:** `src/app/api/admin/cliente-pacotes/[id]/route.ts`
**Linha:** 70-82 (INSERT do novo pacote)

#### ANTES (Código Problemático):

```typescript
const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: novoPacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
  })
  .select()
  .single();
```

#### DEPOIS (Código Corrigido):

```typescript
const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    tenant_id: tenantId,  // 🆕 ADICIONAR tenant_id
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: novoPacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
  })
  .select()
  .single();
```

---

## 🔍 VERIFICAÇÃO DE OUTROS LOCAIS

Preciso verificar se **outros endpoints** têm o mesmo problema:

### 1. **Ativar Novo Pacote** (POST `/api/admin/cliente-pacotes`)

**Arquivo:** `src/app/api/admin/cliente-pacotes/route.ts`
**Linha:** 181-194

```typescript
const { data: clientePacote, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id,
    pacote_id,
    tenant_id: tenantId,  // ✅ JÁ TEM tenant_id
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: pacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
  })
  .select()
  .single();
```

**Status:** ✅ **OK** - tenant_id já incluído

### 2. **Renovar Assinatura** (PATCH `/api/admin/cliente-assinaturas/[id]/renovar`)

**Precisa verificar** se existe esse endpoint e se tem o mesmo problema.

---

## 📝 CHECKLIST DE CORREÇÃO

- [ ] 1. **Corrigir INSERT em renovação de pacote**
  - [ ] Adicionar `tenant_id: tenantId` no INSERT (linha 75)
  - [ ] Testar renovação de pacote esgotado
  - [ ] Verificar que novo pacote é criado com tenant_id correto

- [ ] 2. **Verificar endpoint de renovação de assinatura**
  - [ ] Ler arquivo `/api/admin/cliente-assinaturas/[id]/renovar/route.ts`
  - [ ] Verificar se INSERT também está sem tenant_id
  - [ ] Corrigir se necessário

- [ ] 3. **Verificar outros endpoints de criação**
  - [ ] Buscar todos os `.insert()` em tabelas multi-tenant
  - [ ] Garantir que TODOS incluem tenant_id
  - [ ] Criar lint rule para prevenir no futuro (opcional)

- [ ] 4. **Testar cenários de renovação**
  - [ ] Renovar pacote esgotado (5/5)
  - [ ] Renovar pacote expirado
  - [ ] Renovar pacote ativo mas próximo de esgotar
  - [ ] Alterar pacote para outro diferente
  - [ ] Verificar isolamento multi-tenant

- [ ] 5. **Validar dados no banco**
  ```sql
  -- Verificar que novos pacotes TÊM tenant_id
  SELECT
    id,
    user_id,
    pacote_id,
    tenant_id,  -- Não pode ser NULL
    status,
    data_ativacao,
    data_expiracao
  FROM cliente_pacotes
  WHERE status = 'ativo'
  ORDER BY data_ativacao DESC
  LIMIT 10;
  ```

---

## 🔄 FLUXO CORRETO (APÓS CORREÇÃO)

```
Admin acessa /admin/clientes → Assinaturas
  ↓
Vê "Catarina Solar - Pacote Ouro • Esgotado (5/5)"
  ↓
Clica "Renovar"
  ↓
Modal abre: "Deseja renovar o pacote Pacote Ouro?"
  ↓
Confirma: "Sim, renovar"
  ↓
API recebe PATCH com novo_pacote_id
  ↓
1. Valida tenant_id no header ✅
2. Busca pacote atual ✅
3. Busca novo pacote (mesma definição) ✅
4. Cancela pacote antigo (status = 'expirado') ✅
5. Cria novo pacote COM tenant_id ✅ 🆕
6. Retorna sucesso ✅
  ↓
Frontend mostra: "Pacote renovado com sucesso!" ✅
  ↓
Recarrega billing info
  ↓
Exibe: "Pacote Ouro • Ativo (0/5)" ✅
  ↓
Cliente pode criar projetos novamente! 🎉
```

---

## 🎯 MÉTRICAS DE SUCESSO (PÓS-CORREÇÃO)

| Métrica | Antes | Depois |
|---------|-------|--------|
| Taxa de sucesso de renovação | ❌ 0% | ✅ 100% |
| Erros de tenant_id NULL | 🔴 100% | ✅ 0% |
| Clientes bloqueados | 🔴 Todos | ✅ Nenhum |
| Tempo de renovação | ❌ Impossível | ✅ < 2 segundos |

---

## 🚀 PRIORIDADE DE IMPLEMENTAÇÃO

**Prioridade:** 🔴 **CRÍTICA** - Corrigir imediatamente

**Motivo:** Bloqueia funcionalidade essencial do sistema (renovação de pacotes)

**Tempo estimado:** 15-20 minutos
- 5 min: Implementar correção (adicionar tenant_id)
- 5 min: Verificar outros endpoints
- 5 min: Testar renovação de pacote
- 5 min: Commit e deploy

---

## 📎 ARQUIVOS RELACIONADOS

1. **Arquivo Principal (BUG):** `src/app/api/admin/cliente-pacotes/[id]/route.ts`
   - Função: `PATCH`
   - Linha com problema: **75** (faltando tenant_id no INSERT)

2. **Frontend (Chamada):** `src/components/admin/ClientSubscriptionsTab.tsx`
   - Função: `confirmRenewBilling()`
   - Linhas: 691-704

3. **Arquivo de Referência (CORRETO):** `src/app/api/admin/cliente-pacotes/route.ts`
   - POST já inclui tenant_id corretamente (linha 186)

4. **Verificar Também:**
   - `src/app/api/admin/cliente-assinaturas/[id]/renovar/route.ts` (se existir)
   - Qualquer outro endpoint que faça INSERT em tabelas multi-tenant

---

## 🔍 COMPARAÇÃO: CÓDIGO CORRETO vs ERRADO

### ✅ CORRETO (POST - Ativar Novo Pacote):

```typescript
// src/app/api/admin/cliente-pacotes/route.ts - linha 181
const { data: clientePacote, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id,
    pacote_id,
    tenant_id: tenantId,  // ✅ TEM tenant_id
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: pacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
  })
  .select()
  .single();
```

### ❌ ERRADO (PATCH - Renovar Pacote):

```typescript
// src/app/api/admin/cliente-pacotes/[id]/route.ts - linha 70
const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    // ❌ FALTANDO: tenant_id: tenantId,
    data_ativacao: dataAtivacao.toISOString(),
    data_expiracao: dataExpiracao.toISOString(),
    projetos_inclusos: novoPacote.quantidade_projetos,
    projetos_usados: 0,
    status: 'ativo',
  })
  .select()
  .single();
```

**Diferença:** Linha **tenant_id: tenantId** está **presente** no POST mas **ausente** no PATCH!

---

## ⚠️ PREVENÇÃO FUTURA

### Recomendações:

1. **TypeScript Interface**: Criar interface para `ClientePacoteInsert` que sempre exige tenant_id
   ```typescript
   interface ClientePacoteInsert {
     user_id: string;
     pacote_id: string;
     tenant_id: string;  // Required
     data_ativacao: string;
     data_expiracao: string;
     projetos_inclusos: number;
     projetos_usados: number;
     status: string;
   }
   ```

2. **Lint Rule**: Criar rule customizada para detectar `.insert()` sem tenant_id em tabelas multi-tenant

3. **Helper Function**: Criar função utilitária:
   ```typescript
   function createClientePacote(data: ClientePacoteInsert) {
     if (!data.tenant_id) {
       throw new Error('tenant_id é obrigatório');
     }
     return supabase.from('cliente_pacotes').insert(data);
   }
   ```

4. **Testes E2E**: Adicionar teste automatizado para renovação de pacotes

---

## ✍️ AUTOR DO RELATÓRIO

**Sistema:** Claude Code
**Versão:** 4.5
**Data:** 27/11/2025
**Status:** Aguardando aprovação para correção

---

## 📌 NOTAS IMPORTANTES

1. **Simplicidade da Correção**: É uma linha de código (adicionar tenant_id)
2. **Alto Impacto**: Desbloqueia funcionalidade crítica do sistema
3. **Zero Risco**: Correção não afeta outros fluxos
4. **Testável Imediatamente**: Pode testar com pacote esgotado da Catarina Solar
5. **Pattern Existente**: Apenas copiar do POST que já está correto
