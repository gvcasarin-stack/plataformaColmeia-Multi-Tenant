# 🔬 RELATÓRIO TÉCNICO: Análise Profunda do Fluxo de Renovação de Pacotes

**Data:** 28/01/2025
**Analista:** Claude Code 4.5
**Objetivo:** Entender por que pacotes criados via botão "Renovar" não aparecem no modal de conversão
**Status:** 🔍 **INVESTIGAÇÃO COMPLETA**

---

## 📊 SUMÁRIO EXECUTIVO

Após análise detalhada do fluxo completo de renovação de pacotes, identificamos **INCONSISTÊNCIAS CRÍTICAS** entre:
1. Como pacotes são criados (via botão "Renovar")
2. Como pacotes são exibidos (via API billing-info)
3. Como pacotes são buscados (via API available-billing para conversão)

Este relatório documenta todo o fluxo de dados, identificando 5 possíveis pontos de falha.

---

## 🔄 FLUXO COMPLETO: DO CLIQUE À QUERY

### ETAPA 1: Interface - Botão "Renovar" 🖱️

**Arquivo:** `src/components/admin/ClientSubscriptionsTab.tsx`

**Linha 403-407:**
```typescript
<Button
  size="sm"
  variant="outline"
  className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
  onClick={() => handleRenewPackage(client)}
  disabled={isCanceling}
>
  <RefreshCw className="w-4 h-4" />
  Renovar
</Button>
```

**Linha 522-531 - Handler:**
```typescript
const handleRenewPackage = (client: ClientWithBilling) => {
  if (!client.billingInfo?.package) return;

  setRenewTarget({
    type: 'package',
    client,
    data: client.billingInfo.package  // 🔍 Dados do pacote ATUAL
  });
  setRenewModalOpen(true);
};
```

**Dados enviados para modal:**
- `client.billingInfo.package.id` (ID do pacote atual)
- `client.billingInfo.package.pacote_id` (ID da definição do pacote)
- Outros campos como quota, status, etc.

---

### ETAPA 2: Modal de Confirmação 💬

**Linha 1180-1252 - Modal de Renovação:**
```typescript
<AlertDialog open={renewModalOpen} onOpenChange={setRenewModalOpen}>
  <AlertDialogContent>
    {/* ... UI explicando o que acontecerá ... */}
    <AlertDialogAction
      onClick={confirmRenewBilling}
      disabled={isRenewing}
    >
      Sim, renovar
    </AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

**Linha 684-746 - Confirmação de Renovação:**
```typescript
const confirmRenewBilling = async () => {
  if (!renewTarget) return;
  setIsRenewing(true);

  try {
    if (renewTarget.type === 'package') {
      const pkg = renewTarget.data;

      // 🔍 CRÍTICO: Envia novo_pacote_id = pkg.pacote_id (MESMO pacote)
      const response = await fetch(`/api/admin/cliente-pacotes/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novo_pacote_id: pkg.pacote_id }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao renovar pacote');
      }

      toast({ title: 'Pacote renovado com sucesso', /* ... */ });
    }

    // 🔍 CRÍTICO: Recarrega billing info
    await loadBillingInfo();

    // Fechar modal
    setRenewModalOpen(false);
    setRenewTarget(null);

  } catch (error: any) {
    // ... error handling ...
  } finally {
    setIsRenewing(false);
  }
};
```

**Payload enviado:**
```json
{
  "novo_pacote_id": "uuid-da-definicao-do-pacote"
}
```

**Endpoint chamado:**
```
PATCH /api/admin/cliente-pacotes/{id}
```

---

### ETAPA 3: API de Renovação 🔧

**Arquivo:** `src/app/api/admin/cliente-pacotes/[id]/route.ts`

**Linhas 42-96 - Lógica de Renovação:**
```typescript
// Se for renovação (trocar por novo pacote)
if (novo_pacote_id) {
  // 1. Buscar novo pacote da tabela de DEFINIÇÕES
  const { data: novoPacote, error: novoPacoteError } = await supabase
    .from('pacotes_definicoes')
    .select('*')
    .eq('id', novo_pacote_id)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .single();

  if (novoPacoteError || !novoPacote) {
    return NextResponse.json(
      { success: false, error: 'Novo pacote não encontrado ou inativo' },
      { status: 404 }
    );
  }

  // 2. Cancelar pacote atual
  await supabase
    .from('cliente_pacotes')
    .update({ status: 'expirado' })
    .eq('id', pacoteClienteId);

  // 3. ⭐ CRIAR NOVO PACOTE - LINHA 70-83
  const dataAtivacao = new Date();
  const dataExpiracao = new Date(dataAtivacao);
  dataExpiracao.setDate(dataExpiracao.getDate() + novoPacote.validade_dias);

  const { data: novoPacoteCliente, error: createError } = await supabase
    .from('cliente_pacotes')
    .insert({
      user_id: pacoteAtual.user_id,        // 🔍 user_id do pacote anterior
      pacote_id: novo_pacote_id,           // 🔍 ID da definição (pacotes_definicoes)
      tenant_id: tenantId,                 // ✅ CORRIGIDO anteriormente
      data_ativacao: dataAtivacao.toISOString(),
      data_expiracao: dataExpiracao.toISOString(),
      projetos_inclusos: novoPacote.quantidade_projetos,
      projetos_usados: 0,
      status: 'ativo',
    })
    .select()
    .single();

  if (createError) {
    devLog.error('[API] Erro ao renovar:', createError);
    throw createError;
  }

  return NextResponse.json({
    success: true,
    data: novoPacoteCliente,
  });
}
```

**Registro criado na tabela `cliente_pacotes`:**
```sql
INSERT INTO cliente_pacotes (
  user_id,              -- UUID do usuário (do pacote anterior)
  pacote_id,            -- UUID da definição (pacotes_definicoes)
  tenant_id,            -- UUID do tenant (x-tenant-id header)
  data_ativacao,        -- NOW()
  data_expiracao,       -- NOW() + validade_dias
  projetos_inclusos,    -- Quantidade do pacote
  projetos_usados,      -- 0 (zerado)
  status                -- 'ativo'
) VALUES (...);
```

---

### ETAPA 4: Recarregamento de Dados 🔄

**Linha 104-142 - loadBillingInfo:**
```typescript
const loadBillingInfo = async () => {
  if (clients.length === 0) return;

  setIsLoadingBilling(true);
  try {
    const clientsData = await Promise.all(
      clients.map(async (client) => {
        try {
          // 🔍 CHAMA API DE BILLING INFO
          const response = await fetch(`/api/admin/clients/${client.id}/billing-info`);
          const result = await response.json();

          if (result.success) {
            return {
              ...client,
              billingMode: result.data?.billing_mode || 'avulso',
              billingInfo: result.data
            };
          }
          return {
            ...client,
            billingMode: 'avulso' as const,
            billingInfo: null
          };
        } catch (error) {
          return {
            ...client,
            billingMode: 'avulso' as const,
            billingInfo: null
          };
        }
      })
    );

    setClientsWithBilling(clientsData);
  } finally {
    setIsLoadingBilling(false);
  }
};
```

**Endpoint chamado para CADA cliente:**
```
GET /api/admin/clients/{id}/billing-info
```

---

### ETAPA 5: API de Billing Info 📊

**Arquivo:** `src/app/api/admin/clients/[id]/billing-info/route.ts`

**Linhas 48-137 - Busca de Pacote:**
```typescript
// Se for pacote, buscar informações do pacote
if (billingMode === 'pacote') {
  // 🔍 TENTATIVA 1: Buscar pacote ATIVO com user_id
  let { data: pacoteAtivo, error: erroAtivo } = await supabase
    .from('cliente_pacotes')
    .select(`
      *,
      pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, valor)
    `)
    .eq('user_id', clientId)       // 🔍 Busca por user_id
    .eq('status', 'ativo')          // 🔍 Apenas ativos
    .single();

  // 🔍 TENTATIVA 2: Se não encontrou, buscar com cliente_id
  if (erroAtivo && erroAtivo.code === 'PGRST116') {
    const { data: pacoteComClienteId, error: erroClienteId } = await supabase
      .from('cliente_pacotes')
      .select(`
        *,
        pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, valor)
      `)
      .eq('cliente_id', clientId)   // 🔍 Busca por cliente_id
      .eq('status', 'ativo')
      .single();

    if (!erroClienteId) {
      pacoteAtivo = pacoteComClienteId;
      erroAtivo = null;
    }
  }

  devLog.log('[API billing-info] Busca pacote ATIVO:', {
    clientId,
    found: !!pacoteAtivo,
    error: erroAtivo?.message || null
  });

  if (pacoteAtivo) {
    packageInfo = {
      id: pacoteAtivo.id,
      pacote_id: pacoteAtivo.pacote_id,
      nome_pacote: pacoteAtivo.pacote?.nome || 'Pacote',
      projetos_inclusos: pacoteAtivo.projetos_inclusos,
      projetos_usados: pacoteAtivo.projetos_usados,
      data_ativacao: pacoteAtivo.data_ativacao,
      data_expiracao: pacoteAtivo.data_expiracao,
      status: pacoteAtivo.status,
      preco: pacoteAtivo.pacote?.valor || null
    };
  } else {
    // 🔍 FALLBACK: Se não encontrou ativo, buscar QUALQUER pacote
    const { data: todosPacotes, error: erroTodos } = await supabase
      .from('cliente_pacotes')
      .select(`
        *,
        pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, valor)
      `)
      .eq('user_id', clientId)
      .order('created_at', { ascending: false });

    devLog.warn('[API billing-info] Cliente tem billing_mode=pacote mas sem pacote ativo!', {
      clientId,
      totalPacotes: todosPacotes?.length || 0,
      // ... logs detalhados ...
    });

    // Se encontrou algum pacote, usar o mais recente
    if (todosPacotes && todosPacotes.length > 0) {
      const ultimoPacote = todosPacotes[0];
      packageInfo = { /* ... */ };
    }
  }
}
```

**Queries executadas:**
```sql
-- Query 1: Buscar pacote ativo por user_id
SELECT *, pacotes_definicoes.*
FROM cliente_pacotes
LEFT JOIN pacotes_definicoes ON pacotes_definicoes.id = cliente_pacotes.pacote_id
WHERE cliente_pacotes.user_id = '{clientId}'
  AND cliente_pacotes.status = 'ativo'
LIMIT 1;

-- Query 2 (se Query 1 falhar): Buscar por cliente_id
SELECT *, pacotes_definicoes.*
FROM cliente_pacotes
LEFT JOIN pacotes_definicoes ON pacotes_definicoes.id = cliente_pacotes.pacote_id
WHERE cliente_pacotes.cliente_id = '{clientId}'
  AND cliente_pacotes.status = 'ativo'
LIMIT 1;

-- Query 3 (fallback): Buscar QUALQUER pacote do user
SELECT *, pacotes_definicoes.*
FROM cliente_pacotes
LEFT JOIN pacotes_definicoes ON pacotes_definicoes.id = cliente_pacotes.pacote_id
WHERE cliente_pacotes.user_id = '{clientId}'
ORDER BY cliente_pacotes.created_at DESC;
```

**Resultado esperado:**
Se pacote foi criado corretamente na ETAPA 3, Query 1 deve encontrá-lo e retornar para UI.

---

### ETAPA 6: Modal de Conversão - Busca de Pacotes Disponíveis 🔍

**Arquivo:** `src/app/admin/financeiro/page.tsx` (ou similar)

**Quando admin clica em "Converter para Pacote/Assinatura":**
```typescript
const loadAvailableBillingOptions = async (projectId: string) => {
  const response = await fetch(`/api/admin/projects/${projectId}/available-billing`);
  const result = await response.json();

  if (result.success) {
    setAvailableBillingOptions(result.data);
  }
};
```

**Endpoint chamado:**
```
GET /api/admin/projects/{id}/available-billing
```

---

### ETAPA 7: API Available Billing (MODIFICADA) 🆕

**Arquivo:** `src/app/api/admin/projects/[id]/available-billing/route.ts`

**Linhas 44-78 - Busca de Pacotes (APÓS CORREÇÃO):**
```typescript
// 2. Buscar TODOS os pacotes ativos do tenant (empresa)
const { data: pacotes, error: pacotesError } = await supabase
  .from('cliente_pacotes')
  .select(`
    id,
    pacote_id,
    user_id,
    status,
    projetos_inclusos,
    projetos_usados,
    data_ativacao,
    data_expiracao,
    pacote:pacotes_definicoes(
      id,
      nome,
      quantidade_projetos,
      potencia_maxima
    ),
    user:users!user_id(     // 🚨 POSSÍVEL PONTO DE FALHA
      id,
      email,
      name
    )
  `)
  .eq('tenant_id', tenantId)     // ✅ Busca por tenant
  .eq('status', 'ativo');         // ✅ Apenas ativos

if (pacotesError) {
  devLog.error('[available-billing] Erro ao buscar pacotes:', pacotesError);
}

// Filtrar apenas pacotes com quota disponível
const pacotesDisponiveis = (pacotes || []).filter(p =>
  p.projetos_usados < p.projetos_inclusos   // 🚨 POSSÍVEL PONTO DE FALHA
);
```

**Query SQL executada:**
```sql
SELECT
  cp.id,
  cp.pacote_id,
  cp.user_id,
  cp.status,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.data_ativacao,
  cp.data_expiracao,
  pd.id AS "pacote.id",
  pd.nome AS "pacote.nome",
  pd.quantidade_projetos AS "pacote.quantidade_projetos",
  pd.potencia_maxima AS "pacote.potencia_maxima",
  u.id AS "user.id",
  u.email AS "user.email",
  u.name AS "user.name"
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN users u ON u.id = cp.user_id    -- 🚨 PODE FALHAR SE user_id INVÁLIDO
WHERE cp.tenant_id = '{tenantId}'
  AND cp.status = 'ativo';
```

**Retorno esperado:**
```json
{
  "success": true,
  "data": {
    "pacotes": [
      {
        "id": "uuid-do-cliente-pacote",
        "nome": "Pacote Ouro",
        "empresa": "Catarina Solar",  // 🚨 REQUER JOIN com users
        "quota": "0/5",
        "vagas_disponiveis": 5,
        "expira_em": "2025-03-30T..."
      }
    ],
    "assinaturas": []
  }
}
```

---

## 🐛 POSSÍVEIS PONTOS DE FALHA IDENTIFICADOS

### 🚨 PONTO DE FALHA #1: JOIN com `users` Pode Retornar NULL

**Localização:** `available-billing/route.ts` linha 62-66

**Problema:**
```typescript
user:users!user_id(
  id,
  email,
  name
)
```

**Hipótese:**
Se `cliente_pacotes.user_id` não corresponder a um `users.id` válido (por exemplo, se o usuário foi deletado ou se há inconsistência de dados), o JOIN pode:
1. Retornar `user: null`
2. Fazer a query inteira falhar
3. Retornar vazio silenciosamente

**Evidência:**
No retorno, usamos:
```typescript
empresa: p.user?.name || 'N/A'
```

O operador `?.` sugere que `user` PODE ser null.

**Impacto:**
Se `user` for null, o mapeamento funciona (retorna "N/A"), mas se a **query SQL falhar** por causa do JOIN, a API retorna `pacotes: []` sem erro visível.

---

### 🚨 PONTO DE FALHA #2: Campos NULL em `projetos_inclusos` ou `projetos_usados`

**Localização:** `available-billing/route.ts` linha 76-78

**Problema:**
```typescript
const pacotesDisponiveis = (pacotes || []).filter(p =>
  p.projetos_usados < p.projetos_inclusos
);
```

**Hipótese:**
Se durante a criação do pacote (ETAPA 3), os campos `projetos_inclusos` ou `projetos_usados` forem inseridos como `NULL` ao invés de números, a comparação `NULL < NULL` retorna `false`, e o pacote é filtrado para fora.

**Evidência:**
No INSERT (linha 78-79 do route.ts de renovação):
```typescript
projetos_inclusos: novoPacote.quantidade_projetos,  // Pode ser NULL se novoPacote.quantidade_projetos for NULL
projetos_usados: 0,                                  // Hard-coded como 0 (seguro)
```

**Teste necessário:**
Verificar se `novoPacote.quantidade_projetos` vem NULL de `pacotes_definicoes`.

---

### 🚨 PONTO DE FALHA #3: JOIN com `pacotes_definicoes` Pode Falhar

**Localização:** `available-billing/route.ts` linha 56-61

**Problema:**
```typescript
pacote:pacotes_definicoes(
  id,
  nome,
  quantidade_projetos,
  potencia_maxima
)
```

**Hipótese:**
Se `cliente_pacotes.pacote_id` não corresponder a um `pacotes_definicoes.id` válido, o JOIN falha.

**Impacto:**
No mapeamento final (linha 127), usamos:
```typescript
nome: p.pacote.nome,  // 🚨 ERRO se p.pacote for undefined
```

Se `p.pacote` for `undefined`, isso causa **erro JavaScript** que pode fazer a API retornar 500.

**Diferença entre billing-info e available-billing:**
- **billing-info** usa `LEFT JOIN` e trata null: `nome_pacote: pacoteAtivo.pacote?.nome || 'Pacote'`
- **available-billing** assume que pacote SEMPRE existe: `nome: p.pacote.nome` (SEM `?.`)

---

### 🚨 PONTO DE FALHA #4: Erro Silencioso na Query

**Localização:** `available-billing/route.ts` linha 71-73

**Problema:**
```typescript
if (pacotesError) {
  devLog.error('[available-billing] Erro ao buscar pacotes:', pacotesError);
  // ❌ NÃO RETORNA ERRO - Continua execução!
}
```

**Hipótese:**
Se a query Supabase falhar (erro de SQL, permissão RLS, timeout, etc.), o erro é apenas logado mas a API continua executando e retorna `pacotes: []` como se estivesse tudo normal.

**Impacto:**
Usuário vê "Nenhuma opção disponível" mas o verdadeiro problema é um erro de query que está sendo silenciado.

---

### 🚨 PONTO DE FALHA #5: Tenant ID Diferente entre Criação e Busca

**Localização:** Comparação entre ETAPA 3 e ETAPA 7

**Hipótese:**
Se o `tenant_id` usado na criação (header `x-tenant-id` na renovação) for DIFERENTE do `tenant_id` usado na busca (header `x-tenant-id` na conversão), o pacote existe mas não é encontrado.

**Cenário possível:**
- Renovação feita em domínio A (tenant_id = "abc")
- Busca feita em domínio B (tenant_id = "xyz")

**Evidência necessária:**
Logs comparando `tenant_id` entre as requisições.

---

## 🔬 DIAGNÓSTICO PROPOSTO: QUERIES SQL DIRETAS

### Query 1: Verificar Pacote Criado pela Renovação

```sql
-- Buscar o pacote mais recente criado pela renovação
SELECT
  cp.id,
  cp.user_id,
  cp.pacote_id,
  cp.tenant_id,
  cp.status,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.data_ativacao,
  cp.data_expiracao,
  cp.created_at,
  u.id AS user_exists,
  u.name AS user_name,
  pd.id AS pacote_def_exists,
  pd.nome AS pacote_nome
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
WHERE cp.status = 'ativo'
  AND cp.tenant_id = '{TENANT_ID_DO_TESTE}'
ORDER BY cp.created_at DESC
LIMIT 5;
```

**O que verificar:**
- ✅ `cp.status` = 'ativo'
- ✅ `cp.tenant_id` = tenant correto
- ✅ `cp.projetos_inclusos` = número (não NULL)
- ✅ `cp.projetos_usados` = 0
- ✅ `u.id` IS NOT NULL (user existe)
- ✅ `pd.id` IS NOT NULL (pacote_definicao existe)

**Se algum campo NULL:**
- `user_exists` NULL → **PROBLEMA: user_id inválido**
- `pacote_def_exists` NULL → **PROBLEMA: pacote_id inválido**
- `projetos_inclusos` NULL → **PROBLEMA: INSERT com valor NULL**

---

### Query 2: Simular Query do available-billing

```sql
-- Simular exatamente a query do available-billing
SELECT
  cp.id,
  cp.pacote_id,
  cp.user_id,
  cp.status,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.data_ativacao,
  cp.data_expiracao,
  jsonb_build_object(
    'id', pd.id,
    'nome', pd.nome,
    'quantidade_projetos', pd.quantidade_projetos,
    'potencia_maxima', pd.potencia_maxima
  ) AS pacote,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'name', u.name
  ) AS user
FROM cliente_pacotes cp
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN users u ON u.id = cp.user_id
WHERE cp.tenant_id = '{TENANT_ID_DO_TESTE}'
  AND cp.status = 'ativo';
```

**Se retornar 0 linhas:**
- Problema de `tenant_id` ou `status`

**Se retornar linhas mas `pacote` ou `user` for NULL:**
- Problema de JOIN (IDs inválidos)

---

### Query 3: Verificar Filtro de Quota

```sql
-- Verificar se o filtro de quota está correto
SELECT
  cp.id,
  cp.projetos_usados,
  cp.projetos_inclusos,
  (cp.projetos_usados < cp.projetos_inclusos) AS "PASSA_NO_FILTRO",
  CASE
    WHEN cp.projetos_usados IS NULL THEN 'projetos_usados é NULL'
    WHEN cp.projetos_inclusos IS NULL THEN 'projetos_inclusos é NULL'
    WHEN cp.projetos_usados >= cp.projetos_inclusos THEN 'Pacote esgotado'
    ELSE 'OK - Tem vaga'
  END AS "MOTIVO"
FROM cliente_pacotes cp
WHERE cp.tenant_id = '{TENANT_ID_DO_TESTE}'
  AND cp.status = 'ativo';
```

**Se "PASSA_NO_FILTRO" = false:**
- Verificar "MOTIVO" para entender por quê

---

## 📝 CHECKLIST DE VALIDAÇÃO

### Testes Imediatos (SQL):

- [ ] 1. Executar **Query 1** e verificar se pacote existe com todos os campos corretos
- [ ] 2. Executar **Query 2** e verificar se JOINs retornam dados
- [ ] 3. Executar **Query 3** e verificar se filtro de quota funciona
- [ ] 4. Comparar `tenant_id` do pacote com `tenant_id` usado na requisição de conversão

### Testes com Logs:

- [ ] 5. Adicionar `devLog` no available-billing para imprimir:
  - Valor de `tenantId`
  - Resultado bruto de `pacotes` (antes do filter)
  - Resultado de `pacotesError`
  - Resultado de `pacotesDisponiveis` (após filter)

- [ ] 6. Adicionar try-catch ao redor do mapeamento (linha 125-132) para capturar erros:
```typescript
try {
  return NextResponse.json({
    success: true,
    data: {
      pacotes: pacotesDisponiveis.map(p => ({
        id: p.id,
        nome: p.pacote.nome,  // Pode falhar aqui
        empresa: p.user?.name || 'N/A',
        quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
        vagas_disponiveis: p.projetos_inclusos - p.projetos_usados,
        expira_em: p.data_expiracao
      })),
      // ...
    }
  });
} catch (mapError) {
  devLog.error('[available-billing] Erro ao mapear dados:', mapError);
  throw mapError;
}
```

---

## 🎯 HIPÓTESE PRINCIPAL (MAIS PROVÁVEL)

**Baseado na análise do código:**

### 🔥 PROBLEMA CRÍTICO: JOIN Quebrado

O problema mais provável é que o **JOIN com `pacotes_definicoes` está falhando** porque:

1. Quando o pacote é renovado, o INSERT usa:
   ```typescript
   pacote_id: novo_pacote_id
   ```

2. Mas `novo_pacote_id` vem de:
   ```typescript
   body: JSON.stringify({ novo_pacote_id: pkg.pacote_id })
   ```

3. Onde `pkg.pacote_id` vem da API de billing-info.

4. **SE** billing-info retornou `pacote_id` incorreto ou NULL, o pacote é criado com `pacote_id` inválido.

5. Quando available-billing tenta fazer JOIN:
   ```sql
   LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
   ```

6. O JOIN falha (retorna NULL), e o mapeamento:
   ```typescript
   nome: p.pacote.nome  // 🚨 ERRO: Cannot read property 'nome' of undefined
   ```

7. A API retorna 500 ou vazio.

**Como confirmar:**
- Executar Query 1 e verificar se `pacote_def_exists` é NULL
- Se for NULL, o `pacote_id` está inválido

---

## 🛠️ CORREÇÕES PROPOSTAS (NÃO APLICAR AINDA)

### Correção #1: Validar JOINs e Tratar Erros

```typescript
// Linha 71-73: Retornar erro ao invés de silenciar
if (pacotesError) {
  devLog.error('[available-billing] Erro ao buscar pacotes:', pacotesError);
  return NextResponse.json(
    { success: false, error: `Erro ao buscar pacotes: ${pacotesError.message}` },
    { status: 500 }
  );
}

// Linha 125-132: Tratar casos NULL
pacotes: pacotesDisponiveis.map(p => ({
  id: p.id,
  nome: p.pacote?.nome || 'Pacote sem nome',  // 🆕 Operador ?.
  empresa: p.user?.name || 'N/A',
  quota: `${p.projetos_usados || 0}/${p.projetos_inclusos || 0}`,  // 🆕 Default 0
  vagas_disponiveis: (p.projetos_inclusos || 0) - (p.projetos_usados || 0),
  expira_em: p.data_expiracao
}))
```

### Correção #2: Filtrar Pacotes com JOINs Válidos

```typescript
// Linha 76-78: Filtrar também por JOINs válidos
const pacotesDisponiveis = (pacotes || []).filter(p =>
  p.pacote &&                               // 🆕 Tem definição de pacote
  p.projetos_usados < p.projetos_inclusos &&  // Tem quota disponível
  p.projetos_inclusos != null &&            // 🆕 Campos não NULL
  p.projetos_usados != null
);
```

### Correção #3: Adicionar Logs Detalhados

```typescript
// Após buscar pacotes
devLog.log('[available-billing] DIAGNÓSTICO Pacotes Brutos:', {
  tenant_id: tenantId,
  total_retornado: pacotes?.length || 0,
  pacotes: pacotes?.map(p => ({
    id: p.id,
    pacote_id: p.pacote_id,
    user_id: p.user_id,
    status: p.status,
    quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
    tem_pacote_definicao: !!p.pacote,
    tem_user: !!p.user,
    pacote_nome: p.pacote?.nome || 'NULL',
    user_nome: p.user?.name || 'NULL'
  })) || [],
  error: pacotesError?.message || null
});
```

---

## 📊 CONCLUSÃO E PRÓXIMOS PASSOS

### Causa Raiz Mais Provável:

**🎯 JOIN com `pacotes_definicoes` ou `users` está retornando NULL**, causando erro no mapeamento ou filtragem silenciosa de pacotes válidos.

### Ações Recomendadas:

1. **IMEDIATO:** Executar Query 1, 2 e 3 no banco de dados para confirmar hipótese
2. **DEBUG:** Adicionar logs detalhados (Correção #3) antes de qualquer correção
3. **CORREÇÃO:** Aplicar Correções #1 e #2 após confirmar causa raiz
4. **VALIDAÇÃO:** Testar conversão novamente e verificar logs

### Tempo Estimado:

- 5 min: Executar queries SQL
- 10 min: Analisar resultados e confirmar hipótese
- 10 min: Aplicar correções
- 5 min: Testar

**Total:** ~30 minutos

---

**AGUARDANDO APROVAÇÃO PARA EXECUTAR QUERIES DE DIAGNÓSTICO** 🔍
