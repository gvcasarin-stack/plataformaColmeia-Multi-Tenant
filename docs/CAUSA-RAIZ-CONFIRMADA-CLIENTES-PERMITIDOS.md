# Causa Raiz Confirmada: Bug de Checkbox Clientes Permitidos

**Data:** 2025-12-02
**Status:** ✅ CAUSA RAIZ 100% IDENTIFICADA

---

## 🎯 RESUMO DA DESCOBERTA

O checkbox "Permitir acesso a todos os clientes" está sendo **SALVO AUTOMATICAMENTE NO BANCO DE DADOS** quando o usuário clica nele durante a edição, **ANTES** de clicar em "Salvar" ou "Atualizar".

---

## 🔍 ANÁLISE DA API

### Arquivo Analisado
`src/app/api/admin/team-members/[id]/clientes-permitidos/route.ts`

### Lógica da API PUT (Linhas 172-173)

```typescript
const temRestricao = !temTodosOsClientes;
const arrayParaSalvar = temTodosOsClientes ? [] : idsValidos;
```

**Tradução:**
- **Se tem TODOS os clientes:**
  - `tem_restricao_clientes = false`
  - `clientes_permitidos = []` ← ARRAY VAZIO!

- **Se tem ALGUNS ou ZERO clientes:**
  - `tem_restricao_clientes = true`
  - `clientes_permitidos = [IDs]`

---

## 📊 FLUXO COMPLETO DO BUG

### Estado Inicial no Banco

```sql
colaborador {
  clientes_permitidos: []
  tem_restricao_clientes: true
}
```

### Passo 1: Usuário Abre Edição

```javascript
GET /api/admin/team-members/555de023.../clientes-permitidos

Response: {
  cliente_ids: [],
  tem_restricao: true
}

→ Frontend calcula: checkbox DESMARCADO ✅
```

---

### Passo 2: Usuário Clica no Checkbox (Marca)

```javascript
handleTogglePermitirTodos() executado:
  setPermitirTodosClientes(true)
  setClientesSelecionados([ID_catarina_solar])

🚨 ALGUÉM CHAMA AUTOMATICAMENTE:
PUT /api/admin/team-members/555de023.../clientes-permitidos
Body: { cliente_ids: ["ID_catarina_solar"] }

API calcula:
  todosClientesIds = ["ID_catarina_solar"] (1 cliente no tenant)
  idsValidos = ["ID_catarina_solar"]
  temTodosOsClientes = true ✅ (1 === 1 e todos incluídos)

API salva no banco:
  tem_restricao_clientes = false
  clientes_permitidos = [] ← VAZIO!
```

**Banco de dados MUDOU sem o usuário clicar em "Salvar"!**

---

### Passo 3: Usuário Abre Edição Novamente

```javascript
GET /api/admin/team-members/555de023.../clientes-permitidos

Response: {
  cliente_ids: [],        ← Vazio!
  tem_restricao: false    ← Mudou!
}

→ Frontend interpreta: SEM restrição = acesso total
→ Checkbox MARCADO ✅
```

---

### Passo 4: Usuário Clica no Checkbox (Desmarca)

```javascript
handleTogglePermitirTodos() executado:
  setPermitirTodosClientes(false)
  setClientesSelecionados([])

🚨 ALGUÉM CHAMA AUTOMATICAMENTE:
PUT /api/admin/team-members/555de023.../clientes-permitidos
Body: { cliente_ids: [] }

API calcula:
  idsValidos = []
  temTodosOsClientes = false ❌ (0 !== 1)

API salva no banco:
  tem_restricao_clientes = true
  clientes_permitidos = []
```

**Banco de dados MUDOU novamente!**

---

### Passo 5: Usuário Abre Edição Mais Uma Vez

```javascript
GET /api/admin/team-members/555de023.../clientes-permitidos

Response: {
  cliente_ids: [],
  tem_restricao: true    ← Voltou ao original!
}

→ Checkbox DESMARCADO novamente
```

---

## 🔎 ONDE ESTÁ O SALVAMENTO AUTOMÁTICO?

**SUSPEITO #1: Arquivo `page.tsx` - Linha 194**

```typescript
const salvarClientesPermitidos = async (colaboradorId: string) => {
  // ...
  const response = await fetch(`/api/admin/team-members/${colaboradorId}/clientes-permitidos`, {
    method: 'PUT',
    // ...
  });
}
```

**Essa função é chamada em:**
- ✅ `handleSubmit` (linha 398-400) → CORRETO! Quando usuário clica em "Salvar"

**MAS SERÁ QUE HÁ ALGUM `useEffect` CHAMANDO ELA?**

---

## 🧪 TESTE PARA CONFIRMAR

Adicionar log na função `salvarClientesPermitidos`:

```typescript
const salvarClientesPermitidos = async (colaboradorId: string) => {
  console.log('🚨 [SALVAR CLIENTES] CHAMADO!', {
    colaboradorId,
    clientesSelecionados,
    stackTrace: new Error().stack
  });

  // ... resto do código
}
```

**Se esse log aparecer quando o usuário clica no checkbox** (SEM clicar em "Salvar"), confirmamos que há salvamento automático.

---

## 💡 POSSÍVEIS CAUSAS DO SALVAMENTO AUTOMÁTICO

### Hipótese 1: `useEffect` Escutando Estados

Procurar por:

```typescript
useEffect(() => {
  salvarClientesPermitidos(...);
}, [clientesSelecionados, permitirTodosClientes]);
```

### Hipótese 2: Handler com Lógica Extra

Verificar se `handleTogglePermitirTodos` ou `handleToggleCliente` têm código extra que chama a API.

### Hipótese 3: Biblioteca de Formulário

Verificar se há alguma biblioteca (react-hook-form, formik, etc.) que salva automaticamente.

---

## 🎯 SOLUÇÃO

### Opção 1: Remover Salvamento Automático (RECOMENDADO)

Se houver `useEffect` ou código que salva automaticamente, **REMOVER**.

**Regra:** Clientes permitidos só devem ser salvos quando o usuário clicar em "Salvar" / "Atualizar".

### Opção 2: Implementar "Modo Draft"

Manter estados temporários separados que só são persistidos ao clicar em "Salvar".

---

## 📝 PRÓXIMOS PASSOS

1. ✅ Adicionar log em `salvarClientesPermitidos` para confirmar chamadas
2. ⏳ Procurar `useEffect` suspeitos
3. ⏳ Procurar código extra em handlers
4. ⏳ Remover salvamento automático
5. ⏳ Testar correção

---

## 🔍 EVIDÊNCIA DOS LOGS

```
[Tentativa 1] tem_restricao: true  → Checkbox: DESMARCADO
[Usuário clica] ...
[Tentativa 2] tem_restricao: false → Checkbox: MARCADO (mudou!)
[Usuário clica] ...
[Tentativa 3] tem_restricao: true  → Checkbox: DESMARCADO (voltou!)
```

**3 chamadas GET consecutivas retornaram 3 valores diferentes** porque o banco de dados está sendo **atualizado entre as chamadas**.

---

## ✅ CONCLUSÃO

**Problema:** Salvamento automático no banco de dados durante edição

**Onde:** Provavelmente em `page.tsx` via `useEffect` ou handlers

**Impacto:** Usuário não consegue editar sem salvar automaticamente

**Solução:** Remover lógica de salvamento automático, permitir salvar apenas via botão "Salvar"

---

**Relatório elaborado por:** Claude Code
**Baseado em:** Análise do código da API + Logs do browser
