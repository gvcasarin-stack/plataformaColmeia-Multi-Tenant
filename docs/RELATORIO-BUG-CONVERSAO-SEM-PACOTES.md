# 🐛 RELATÓRIO TÉCNICO: Pacotes Disponíveis Não Aparecem no Modal de Conversão

**Data:** 28/01/2025
**Severidade:** 🔴 **ALTA** - Bloqueia funcionalidade de conversão
**Status:** ⚠️ Investigação - Aguardando diagnóstico

---

## 📋 RESUMO EXECUTIVO

O modal de conversão de projetos avulsos mostra **"Nenhuma opção disponível"** mesmo quando existe um **Pacote Ativo com quota disponível (0/5)**.

### Evidências da Screenshot:

✅ **Pacote existe e está visível:**
- Nome: "Catarina Solar - Pacote Ouro"
- Status: **Ativo** (badge verde)
- Quota: **0 de 5 projetos utilizados** (100% disponível)
- Pagamento: Pendente
- Expira em: 61 dias restantes

❌ **Modal mostra erro:**
- "Nenhuma opção disponível"
- "Este cliente não possui pacotes ou assinaturas ativos com quota disponível"

---

## 🔍 HIPÓTESES DE CAUSA RAIZ

### Hipótese #1: 🎯 **Incompatibilidade de `user_id` vs `owner_id`** (MAIS PROVÁVEL)

**Problema:**
```typescript
// API busca pacotes usando:
.eq('user_id', userId)  // userId vem de project.owner_id

// MAS o pacote pode ter sido criado com user_id DIFERENTE
```

**Cenário Problemático:**
```
Projeto:
  - id: "uuid-projeto-377"
  - owner_id: "uuid-usuario-A"  // Quem criou o projeto
  - billing_mode: "avulso"

Pacote:
  - id: "uuid-pacote-ouro"
  - user_id: "uuid-usuario-B"  // Catarina Solar
  - status: "ativo"
  - projetos_usados: 0
  - projetos_inclusos: 5

❌ PROBLEMA: uuid-usuario-A ≠ uuid-usuario-B
```

**Por que isso pode acontecer:**
1. Projeto foi criado por um **admin** em nome do cliente
2. `owner_id` ficou como ID do admin, não do cliente
3. Pacote foi ativado para o cliente real (Catarina Solar)
4. Query não encontra match porque compara IDs diferentes

**Código Afetado:** `available-billing/route.ts` linha 30-44
```typescript
const { data: project } = await supabase
  .from('projects')
  .select('owner_id, billing_mode')  // ❌ owner_id pode ser do admin
  .eq('id', projectId)
  .single();

const userId = project.owner_id;  // ❌ Usa owner_id direto sem validação

const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .eq('user_id', userId)  // ❌ Busca por user_id que não corresponde
```

---

### Hipótese #2: **Campo `owner_id` vs `client_id` Inconsistente**

**Problema:**
O projeto pode ter:
- `owner_id`: ID de quem criou (pode ser admin)
- `client_id` ou campo relacionado: ID do cliente real

**Código Atual:**
```typescript
// Usa apenas owner_id
const userId = project.owner_id;
```

**Deveria ser:**
```typescript
// Buscar cliente real do projeto
const userId = project.client_id || project.owner_id;
```

---

### Hipótese #3: **Projeto Sem `owner_id` (NULL)**

**Problema:**
Se `project.owner_id` for `NULL`, a query retorna vazio.

**Validação Necessária:**
```typescript
if (!project.owner_id) {
  devLog.error('[available-billing] Projeto sem owner_id:', projectId);
  // Buscar de outra forma ou retornar erro explicativo
}
```

---

### Hipótese #4: **Erro Silencioso na Query**

**Problema:**
```typescript
if (pacotesError) {
  devLog.error('[available-billing] Erro ao buscar pacotes:', pacotesError);
  // ❌ NÃO RETORNA ERRO - Continua execução normalmente
}
```

**Consequência:**
- Se a query falhar, usuário vê "Nenhuma opção disponível"
- Mas o verdadeiro problema é um erro SQL/permissão

---

### Hipótese #5: **Tenant ID Inconsistente**

**Problema:**
```typescript
.eq('tenant_id', tenantId)  // Projeto e Pacote devem ter MESMO tenant_id
```

**Cenário:**
- Projeto criado em um tenant
- Pacote ativado em outro tenant (improvável, mas possível se houver bug)

---

## 🔧 DIAGNÓSTICO PROPOSTO

### Passo 1: Adicionar Logs Detalhados na API

**Arquivo:** `available-billing/route.ts`

```typescript
// Após buscar projeto
devLog.log('[available-billing] DIAGNÓSTICO Projeto:', {
  projectId,
  owner_id: project.owner_id,
  billing_mode: project.billing_mode,
  tenant_id: tenantId
});

// Após buscar pacotes (ANTES do filtro)
devLog.log('[available-billing] DIAGNÓSTICO Pacotes RAW:', {
  total: pacotes?.length || 0,
  pacotes: pacotes?.map(p => ({
    id: p.id,
    user_id: p.user_id,  // 🔍 COMPARAR COM owner_id
    status: p.status,
    quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
    tenant_id: p.tenant_id
  })),
  error: pacotesError
});

// Após filtro
devLog.log('[available-billing] DIAGNÓSTICO Pacotes FILTRADOS:', {
  disponiveis: pacotesDisponiveis.length,
  pacotesDisponiveis: pacotesDisponiveis.map(p => ({
    id: p.id,
    nome: p.pacote.nome,
    quota: `${p.projetos_usados}/${p.projetos_inclusos}`
  }))
});
```

---

### Passo 2: SQL Diagnóstico Direto

**Query para validar dados:**

```sql
-- 1. Buscar projeto FV-2025-377
SELECT
  id,
  number,
  owner_id,
  billing_mode,
  tenant_id,
  client_name,
  nome_cliente_final
FROM projects
WHERE number = 'FV-2025-377'
  OR id = 'uuid-do-projeto';

-- 2. Buscar pacotes da Catarina Solar
SELECT
  id,
  user_id,
  status,
  projetos_usados,
  projetos_inclusos,
  tenant_id,
  data_ativacao
FROM cliente_pacotes
WHERE status = 'ativo'
ORDER BY data_ativacao DESC
LIMIT 5;

-- 3. COMPARAR: owner_id do projeto com user_id do pacote
SELECT
  p.id AS project_id,
  p.number AS project_number,
  p.owner_id AS project_owner_id,
  p.billing_mode,
  cp.id AS pacote_id,
  cp.user_id AS pacote_user_id,
  cp.status AS pacote_status,
  cp.projetos_usados,
  cp.projetos_inclusos,
  -- 🔍 MATCH?
  (p.owner_id = cp.user_id) AS ids_match
FROM projects p
CROSS JOIN cliente_pacotes cp
WHERE p.number = 'FV-2025-377'
  AND cp.status = 'ativo'
  AND p.tenant_id = cp.tenant_id;
```

---

### Passo 3: Verificar Tabela `users`

**Validar se `owner_id` aponta para cliente correto:**

```sql
-- Buscar usuário do projeto
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  p.number AS project_number,
  p.owner_id
FROM projects p
LEFT JOIN users u ON u.id = p.owner_id
WHERE p.number = 'FV-2025-377';

-- Buscar usuário do pacote
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  cp.status AS pacote_status,
  cp.projetos_usados
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
WHERE cp.status = 'ativo'
ORDER BY cp.data_ativacao DESC
LIMIT 5;
```

---

## 📊 TABELA COMPARATIVA: POSSÍVEIS CENÁRIOS

| Cenário | owner_id vs user_id | Pacotes Retornados | Resultado Modal |
|---------|---------------------|-------------------|-----------------|
| **A) IDs Iguais** | ✅ Match | Pacote Ouro (0/5) | ✅ Modal mostra pacote |
| **B) IDs Diferentes** | ❌ Não Match | [] (vazio) | ❌ "Nenhuma opção disponível" |
| **C) owner_id NULL** | ❌ NULL | [] (vazio) | ❌ "Nenhuma opção disponível" |
| **D) Erro na Query** | - | Erro silencioso | ❌ "Nenhuma opção disponível" |

**Screenshot indica:** Cenário **B** ou **C** é o mais provável.

---

## 🎯 SOLUÇÕES PROPOSTAS

### Solução #1: **Buscar por `client_id` ao Invés de `owner_id`**

Se projetos têm campo `client_id` separado de `owner_id`:

```typescript
const { data: project } = await supabase
  .from('projects')
  .select('owner_id, client_id, billing_mode')  // 🆕 Adicionar client_id
  .eq('id', projectId)
  .single();

// 🆕 Priorizar client_id se existir
const userId = project.client_id || project.owner_id;
```

---

### Solução #2: **Buscar Pacotes por Nome/Email do Cliente**

Alternativa robusta se IDs não correspondem:

```typescript
// 1. Buscar dados completos do projeto
const { data: project } = await supabase
  .from('projects')
  .select(`
    *,
    users!owner_id(id, email, full_name)
  `)
  .eq('id', projectId)
  .single();

// 2. Buscar pacotes por email do cliente
const clientEmail = project.client_email || project.users?.email;

const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .select(`
    *,
    users!user_id(email)
  `)
  .eq('status', 'ativo')
  .eq('tenant_id', tenantId);

// 3. Filtrar por email
const pacotesDoCliente = pacotes.filter(p =>
  p.users.email === clientEmail
);
```

---

### Solução #3: **Adicionar JOIN para Garantir Correspondência**

```typescript
// Buscar pacotes que pertencem ao MESMO CLIENTE do projeto
const { data: pacotes } = await supabase
  .from('cliente_pacotes')
  .select(`
    *,
    pacote:pacotes_definicoes(*),
    user:users!user_id(id, email, full_name)
  `)
  .eq('status', 'ativo')
  .eq('tenant_id', tenantId);

// Comparar por email ou outro campo confiável
const pacotesDisponiveis = pacotes.filter(p => {
  // Lógica de match mais robusta
  return p.user.email === projectOwnerEmail ||
         p.user.id === projectClientId;
});
```

---

### Solução #4: **Melhorar Mensagem de Erro**

**Atual:**
```
"Este cliente não possui pacotes ou assinaturas ativos com quota disponível."
```

**Melhor:**
```typescript
if (pacotesDisponiveis.length === 0) {
  devLog.warn('[available-billing] DEBUG:', {
    projectId,
    owner_id: project.owner_id,
    pacotes_raw_count: pacotes?.length || 0,
    pacotes_raw: pacotes,
    tenant_id: tenantId
  });

  // Mensagem mais informativa
  return NextResponse.json({
    success: true,
    data: {
      pacotes: [],
      assinaturas: [],
      debug: {
        project_owner_id: project.owner_id,
        pacotes_encontrados: pacotes?.length || 0,
        tenant_id: tenantId
      }
    }
  });
}
```

---

## 📝 CHECKLIST DE VALIDAÇÃO

### Investigação Imediata:

- [ ] 1. **Executar SQL diagnóstico** (queries do Passo 2)
  - [ ] Comparar `project.owner_id` com `pacote.user_id`
  - [ ] Verificar se são iguais ou diferentes

- [ ] 2. **Adicionar logs detalhados** na API (Passo 1)
  - [ ] Ver exatamente quais IDs estão sendo comparados
  - [ ] Verificar se query retorna algum pacote ANTES do filtro

- [ ] 3. **Verificar estrutura da tabela `projects`**
  - [ ] Tem campo `client_id` separado de `owner_id`?
  - [ ] Qual campo representa o cliente real?

- [ ] 4. **Verificar como pacotes são ativados**
  - [ ] API `/admin/cliente-pacotes` usa qual user_id?
  - [ ] É o cliente real ou pode ser admin?

### Após Diagnóstico:

- [ ] 5. Aplicar solução apropriada (1, 2, 3 ou 4)
- [ ] 6. Testar conversão com projeto da Catarina Solar
- [ ] 7. Validar que pacote aparece no modal

---

## 🚨 PRIORIDADE DE IMPLEMENTAÇÃO

**Prioridade:** 🔴 **ALTA** - Funcionalidade bloqueada

**Tempo estimado:**
- 10 min: Executar SQL diagnóstico e identificar causa raiz
- 10 min: Aplicar correção
- 10 min: Testar e validar

**Total:** ~30 minutos

---

## 📎 ARQUIVOS AFETADOS

1. **API de Busca:** `src/app/api/admin/projects/[id]/available-billing/route.ts`
   - **Linha 30-44**: Busca owner_id do projeto
   - **Linha 64**: Query que usa `user_id`
   - **Linha 73-75**: Filtro de quota

2. **Referências:**
   - Tabela `projects` (campo `owner_id`)
   - Tabela `cliente_pacotes` (campo `user_id`)
   - Tabela `users` (relacionamento)

---

## ✍️ AUTOR DO RELATÓRIO

**Sistema:** Claude Code
**Versão:** 4.5
**Data:** 28/01/2025
**Status:** Aguardando diagnóstico SQL

---

## 📌 CONCLUSÃO PRELIMINAR

**Causa Mais Provável:** 🎯 **Incompatibilidade de IDs**
- `project.owner_id` ≠ `pacote.user_id`
- API busca pacotes do usuário errado
- Pacote existe mas não é encontrado pela query

**Próximo Passo:** Executar SQL diagnóstico para confirmar hipótese.

**Após Confirmação:** Aplicar Solução #1, #2 ou #3 conforme estrutura de dados real.

---

**AGUARDANDO APROVAÇÃO PARA EXECUTAR DIAGNÓSTICO E APLICAR CORREÇÃO** ✅
