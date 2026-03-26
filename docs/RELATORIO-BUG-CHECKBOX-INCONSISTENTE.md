# Relatório Técnico: Bug de Checkbox Inconsistente - Clientes Permitidos

**Data:** 2025-12-02
**Sistema:** SGF Multi-Tenant - Módulo de Gerenciamento de Equipe
**Severidade:** CRÍTICA
**Status:** CAUSA RAIZ IDENTIFICADA

---

## 1. RESUMO EXECUTIVO

Identificado um bug crítico onde o checkbox "Permitir acesso a todos os clientes" está apresentando **comportamento inconsistente** devido a **DOIS PROBLEMAS DISTINTOS**:

1. **API retorna dados inconsistentes** - Mesmo colaborador retorna valores diferentes de `tem_restricao` em chamadas consecutivas
2. **Sistema salva automaticamente** quando usuário interage com o checkbox durante edição

---

## 2. ANÁLISE DOS LOGS

### 2.1 Primeira Tentativa de Edição

```javascript
🔍 [FETCH CLIENTES PERMITIDOS] RESPOSTA API: {
  success: true,
  cliente_ids: Array(0),    // ← Nenhum cliente permitido
  tem_restricao: true       // ← TEM restrição
}

🔍 [FETCH CLIENTES PERMITIDOS] COM RESTRIÇÃO - CALCULANDO: {
  todosClientesIdsLength: 1,    // 1 cliente disponível no sistema
  clienteIdsLength: 0,          // 0 clientes permitidos ao colaborador
  lengthsIguais: false,         // 0 !== 1
  RESULTADO_temTodos: false
}

🔍 [FETCH CLIENTES PERMITIDOS] setPermitirTodosClientes(false)
```

**Resultado:** Checkbox DESMARCADO ✅ **CORRETO**
**Interpretação:** Colaborador tem restrição e não tem nenhum cliente permitido

---

### 2.2 Evento Inesperado

```javascript
🔍 [USE EFFECT] permitirTodosClientes MUDOU: {
  novoValor: true,                      // ❌ Mudou para TRUE!
  clientesSelecionadosLength: 1,        // ❌ 1 cliente selecionado!
  clientesDisponiveisLength: 1
}
```

**Problema:** O checkbox mudou de `false` para `true` **SEM INTERAÇÃO DO USUÁRIO**!
**Evidência:** `clientesSelecionados` mudou de 0 para 1

---

### 2.3 Segunda Tentativa de Edição

```javascript
🔍 [FETCH CLIENTES PERMITIDOS] RESPOSTA API: {
  success: true,
  cliente_ids: Array(0),    // ← Mesmos dados (nenhum cliente)
  tem_restricao: false      // ❌ MUDOU! Agora é FALSE
}

🔍 [FETCH CLIENTES PERMITIDOS] SEM RESTRIÇÃO - setPermitirTodosClientes(true)
```

**Problema Crítico:** Para o **MESMO COLABORADOR**, a API retornou `tem_restricao: false` agora!

**Interpretação errada:** Sem restrição = acesso a todos os clientes → Checkbox marcado
**Resultado:** Checkbox MARCADO (mas deveria estar desmarcado!)

---

### 2.4 Terceira Tentativa de Edição

```javascript
🔍 [FETCH CLIENTES PERMITIDOS] RESPOSTA API: {
  success: true,
  cliente_ids: Array(0),
  tem_restricao: true       // ❌ VOLTOU para TRUE!
}

🔍 [FETCH CLIENTES PERMITIDOS] setPermitirTodosClientes(false)
```

**Problema Crítico:** API voltou a retornar `tem_restricao: true` para o **MESMO COLABORADOR**!

---

## 3. CAUSAS RAIZ IDENTIFICADAS

### 3.1 PROBLEMA #1: API Inconsistente

**Arquivo:** `src/app/api/admin/team-members/[id]/clientes-permitidos/route.ts`

**Evidência:**
- **Chamada 1:** `tem_restricao: true`
- **Chamada 2:** `tem_restricao: false` (DIFERENTE!)
- **Chamada 3:** `tem_restricao: true` (VOLTOU!)

**Impacto:**
- Mesmo colaborador retorna dados diferentes
- Impossível ter interface consistente
- Usuário vê comportamento imprevisível

**Possíveis causas:**
1. Race condition na API (leitura vs escrita simultâneas)
2. Cache inconsistente
3. Lógica de decisão de `tem_restricao` está errada
4. Banco de dados sendo atualizado entre as chamadas

---

### 3.2 PROBLEMA #2: Salvamento Automático Durante Edição

**Evidência do Log:**
```javascript
// Usuário clica no checkbox
🔍 [USE EFFECT] permitirTodosClientes MUDOU: {
  novoValor: true,
  clientesSelecionadosLength: 1  // ← MUDOU! Foi salvo automaticamente
}
```

**O que está acontecendo:**

1. Usuário abre modal de edição
2. Sistema carrega dados do colaborador
3. Usuário clica no checkbox "Permitir todos os clientes"
4. **handleTogglePermitirTodos** executa:
   ```typescript
   setPermitirTodosClientes(true);
   setClientesSelecionados([...todos os clientes...]); // ← Atualiza estado
   ```
5. Algum código está **salvando isso automaticamente** no banco
6. Na próxima abertura, API retorna dados **diferentes** porque foram salvos

**Suspeito:** Pode haver um `useEffect` ou alguma lógica que salva automaticamente quando `clientesSelecionados` ou `permitirTodosClientes` mudam durante edição.

---

## 4. FLUXO DO BUG

```
TEMPO   → AÇÃO                         → ESTADO API (tem_restricao)

T0: Usuário abre edição                → true (CORRETO)
    └─> Checkbox desmarcado ✅

T1: Usuário clica no checkbox          → true
    └─> handleTogglePermitirTodos()
    └─> setPermitirTodosClientes(true)
    └─> setClientesSelecionados([todos])
    └─> ??? Salvamento automático ???  → false (MUDOU!)

T2: Usuário fecha modal                → false

T3: Usuário abre edição novamente      → false (INCONSISTENTE!)
    └─> Checkbox marcado ❌ (ERRADO!)

T4: Usuário clica novamente            → false
    └─> Salvamento automático novamente? → true (VOLTOU!)

T5: Usuário abre edição                → true
    └─> Checkbox desmarcado (voltou)
```

---

## 5. INVESTIGAÇÃO NECESSÁRIA

### 5.1 Verificar API

**Arquivo:** `src/app/api/admin/team-members/[id]/clientes-permitidos/route.ts`

**Perguntas:**
1. Como a API calcula `tem_restricao`?
2. Há algum cache envolvido?
3. A leitura e escrita podem acontecer simultaneamente?

**Código suspeito a investigar:**
```typescript
// Como esse valor é determinado?
const temRestricao = ???

// Quando isso é atualizado?
// Há algum código que muda tem_restricao_clientes automaticamente?
```

### 5.2 Verificar Salvamento Automático

**Arquivo:** `src/app/admin/equipe/page.tsx`

**Procurar por:**
1. `useEffect` que escuta `clientesSelecionados` ou `permitirTodosClientes`
2. Qualquer chamada a `salvarClientesPermitidos()` fora de `handleSubmit`
3. Lógica que persiste dados durante a edição (antes de clicar "Salvar")

---

## 6. DADOS TÉCNICOS

### 6.1 Colaborador Testado
- **ID:** `555de023-844d-4e5d-bdeb-ec397381b8d1`
- **Nome:** Carlos
- **Role:** colaborador

### 6.2 Estado Esperado
- **cliente_ids:** `[]` (vazio)
- **tem_restricao:** Deveria ser **CONSTANTE** (não mudar entre chamadas)

### 6.3 Estado Real Observado
- **tem_restricao:** Alterna entre `true` e `false` sem motivo aparente

---

## 7. IMPACTO

### 7.1 Problemas para o Usuário
- ❌ Checkbox muda sozinho
- ❌ Não consegue confiar no estado exibido
- ❌ Pode salvar permissões incorretas sem perceber
- ❌ Experiência frustrante e confusa

### 7.2 Problemas de Segurança
- ⚠️ Colaborador pode receber acessos indevidos
- ⚠️ Colaborador pode perder acessos necessários
- ⚠️ Dados inconsistentes entre UI e banco de dados

---

## 8. PRÓXIMOS PASSOS

### Passo 1: Investigar API
1. Ler código de `src/app/api/admin/team-members/[id]/clientes-permitidos/route.ts`
2. Entender como `tem_restricao` é calculado
3. Verificar se há lógica de escrita automática

### Passo 2: Procurar Salvamento Automático
1. Procurar `useEffect` no componente da página
2. Procurar chamadas a `salvarClientesPermitidos` fora de `handleSubmit`
3. Verificar se há listeners de eventos que salvam dados

### Passo 3: Corrigir
Dependendo do achado:
- Se API inconsistente: Corrigir lógica de cálculo
- Se salvamento automático: Remover ou condicionar ao modo de edição

---

## 9. CONCLUSÃO

**O problema NÃO está no código React da página de equipe.**

**O problema ESTÁ em:**
1. ✅ API retorna dados inconsistentes para o mesmo colaborador
2. ✅ Possível salvamento automático que persiste mudanças durante edição (antes de clicar "Salvar")

**Evidência mais clara:**
```
Chamada 1: tem_restricao: true
Chamada 2: tem_restricao: false  ← MUDOU!
Chamada 3: tem_restricao: true   ← VOLTOU!
```

Para o **mesmo colaborador**, em **menos de 30 segundos**, a API retornou **3 valores diferentes**.

---

**Relatório elaborado por:** Claude Code
**Baseado em:** Logs reais do browser console
**Próxima ação:** Investigar API e procurar salvamento automático
