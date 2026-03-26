# Relatório Técnico: Bug de Race Condition em Clientes Permitidos

**Data:** 2025-12-02
**Sistema:** SGF Multi-Tenant - Módulo de Gerenciamento de Equipe
**Severidade:** ALTA
**Status:** CAUSA RAIZ IDENTIFICADA

---

## 1. RESUMO EXECUTIVO

Foi identificado um **race condition (condição de corrida)** no carregamento de dados ao editar um colaborador, fazendo com que o checkbox "Permitir acesso a todos os clientes" seja automaticamente desmarcado mesmo quando deveria permanecer marcado.

---

## 2. DESCRIÇÃO DO PROBLEMA

### 2.1 Sintoma Observado
Ao editar um colaborador existente no sistema:
1. Usuário abre o modal de edição
2. O checkbox "Permitir acesso a todos os clientes" aparece brevemente como marcado
3. Após ~1-2 segundos, o checkbox é **automaticamente desmarcado**
4. Isso acontece **mesmo sem interação do usuário**

### 2.2 Comportamento Esperado
O checkbox deve refletir o estado real dos clientes permitidos do colaborador e **não deve mudar automaticamente**.

---

## 3. ANÁLISE DOS LOGS

### 3.1 Sequência de Eventos (Extraída dos Logs)

```
[1] Estado inicial após abrir modal:
    permitirTodosClientes: true
    clientesSelecionados: 0
    clientesDisponiveis: 0  ⚠️ VAZIO!

[2] LINHA 151 - fetchClientesPermitidos executa cálculo:
    temRestricao: true
    todosClientesIdsLength: 0  ⚠️ Array vazio porque clientesDisponiveis ainda não carregou!
    clienteIdsLength: 0
    temTodos: false  ❌ Calcula FALSE porque todosClientesIds está vazio

    AÇÃO: setPermitirTodosClientes(false)  ❌ ERRO!

[3] Estado após 1-2 segundos:
    permitirTodosClientes: false  ❌ Desmarcado incorretamente
    clientesSelecionados: 0
    clientesDisponiveis: 1  ✅ Agora sim carregou!
```

### 3.2 Análise Detalhada

O log da **LINHA 151** mostra claramente o problema:

```javascript
fetchClientesPermitidos - setPermitirTodosClientes(temTodos) - calculado
{
  temRestricao: true,
  temTodos: false,           // ❌ Calculado como FALSE
  todosClientesIdsLength: 0, // ❌ Array vazio!
  clienteIdsLength: 0,
  colaboradorId: '555de023-844d-4e5d-bdeb-ec397381b8d1'
}
```

**Por que `todosClientesIdsLength` está 0?**

Porque a linha 147 do código faz:
```typescript
const todosClientesIds = clientesDisponiveis.map(c => c.id);
```

E nesse momento, `clientesDisponiveis` ainda está **vazio** no estado React!

---

## 4. CAUSA RAIZ

### 4.1 Race Condition Identificada

**Arquivo:** `src/app/admin/equipe/page.tsx`
**Função:** `handleEdit` (linha ~476)

```typescript
if (member.role === 'colaborador') {
  await fetchClientesDisponiveis();      // [1] Busca clientes disponíveis
  await fetchClientesPermitidos(member.id); // [2] Busca clientes permitidos do colaborador
}
```

**Problema:**

1. **Linha [1]:** `fetchClientesDisponiveis()` faz requisição HTTP e chama `setClientesDisponiveis(result.data)`
2. **Linha [2]:** `fetchClientesPermitidos()` executa **IMEDIATAMENTE DEPOIS**
3. Dentro de `fetchClientesPermitidos`, o código lê `clientesDisponiveis` do estado:
   ```typescript
   const todosClientesIds = clientesDisponiveis.map(c => c.id);
   ```
4. **PROBLEMA:** O estado React ainda não foi atualizado! `setClientesDisponiveis` é **assíncrono**
5. Resultado: `clientesDisponiveis` ainda é `[]` (array vazio)
6. Cálculo: `todosClientesIds.length = 0`, então `temTodos = false`
7. Ação: `setPermitirTodosClientes(false)` ❌ **INCORRETO!**

### 4.2 Por que o `await` não resolve?

O `await fetchClientesDisponiveis()` espera a **requisição HTTP terminar**, mas **NÃO espera** o estado React ser atualizado.

React state updates (`setState`) são assíncronos e enfileirados. Então:
- `fetchClientesDisponiveis()` completa ✅
- `setClientesDisponiveis(data)` é chamado ✅
- Mas o estado ainda é o **antigo valor** quando a próxima linha executa ❌

### 4.3 Diagrama do Fluxo

```
TEMPO  →

T0: handleEdit chamado
    └─> await fetchClientesDisponiveis()
         └─> HTTP Request enviado

T1: HTTP Response recebido
    └─> setClientesDisponiveis([...clientes...])
        └─> [ENFILEIRADO - ainda não aplicado]

T2: await fetchClientesPermitidos()
    └─> Lê clientesDisponiveis do estado
    └─> Estado ainda é [] (VAZIO!) ❌
    └─> Calcula: temTodos = false
    └─> setPermitirTodosClientes(false) ❌ ERRO!

T3: React aplica as atualizações de estado
    └─> clientesDisponiveis agora tem os dados
    └─> Mas permitirTodosClientes já foi setado como false ❌
```

---

## 5. IMPACTO

### 5.1 Funcionalidades Afetadas
- ✅ **Adicionar novo colaborador**: NÃO afetado (funciona corretamente)
- ❌ **Editar colaborador existente**: AFETADO (checkbox desmarca automaticamente)

### 5.2 Gravidade
- **Alta:** O usuário pode não perceber e salvar o colaborador com permissões incorretas
- **Perda de dados:** Clientes permitidos podem ser apagados acidentalmente
- **Experiência do usuário:** Comportamento confuso e frustrante

---

## 6. SOLUÇÃO PROPOSTA

### 6.1 Abordagem

Modificar `fetchClientesPermitidos` para receber os clientes disponíveis como **parâmetro** ao invés de ler do estado React.

### 6.2 Mudanças Necessárias

**Antes (Código Atual):**
```typescript
const fetchClientesPermitidos = async (colaboradorId: string) => {
  // ...
  const todosClientesIds = clientesDisponiveis.map(c => c.id); // ❌ Lê do estado
  // ...
}

// Chamada
await fetchClientesDisponiveis();
await fetchClientesPermitidos(member.id);
```

**Depois (Solução):**
```typescript
const fetchClientesPermitidos = async (
  colaboradorId: string,
  clientesDisponiveisParam: Cliente[] // ✅ Recebe como parâmetro
) => {
  // ...
  const todosClientesIds = clientesDisponiveisParam.map(c => c.id); // ✅ Usa o parâmetro
  // ...
}

// Chamada
const clientes = await fetchClientesDisponiveis();
await fetchClientesPermitidos(member.id, clientes); // ✅ Passa os dados
```

### 6.3 Vantagens da Solução
1. ✅ Elimina completamente o race condition
2. ✅ Dados são passados diretamente (sem depender de estado assíncrono)
3. ✅ Código fica mais explícito e fácil de entender
4. ✅ Menos propenso a bugs futuros
5. ✅ Não quebra funcionalidades existentes

---

## 7. ARQUIVOS AFETADOS

1. **`src/app/admin/equipe/page.tsx`**
   - Linha ~119: Função `fetchClientesPermitidos` (modificar assinatura)
   - Linha ~147: Uso de `clientesDisponiveis` (trocar por parâmetro)
   - Linha ~476: Chamada em `handleEdit` (passar dados retornados)

---

## 8. TESTES RECOMENDADOS

Após aplicar a correção:

1. ✅ Editar colaborador com "todos os clientes" permitidos
   - Verificar que checkbox permanece marcado

2. ✅ Editar colaborador com clientes específicos
   - Verificar que checkbox fica desmarcado
   - Verificar que clientes corretos aparecem selecionados

3. ✅ Editar colaborador sem clientes permitidos
   - Verificar que checkbox fica desmarcado
   - Verificar que lista de clientes está vazia

4. ✅ Adicionar novo colaborador
   - Verificar que funcionalidade continua funcionando

---

## 9. CONCLUSÃO

### Causa Raiz Confirmada
**Race condition entre atualização assíncrona de estado React e leitura desse estado.**

### Linha de Código Problemática
`src/app/admin/equipe/page.tsx:147`
```typescript
const todosClientesIds = clientesDisponiveis.map(c => c.id);
```

### Solução
Passar `clientesDisponiveis` como parâmetro ao invés de ler do estado React.

### Próximos Passos
1. Implementar a solução proposta
2. Executar testes de regressão
3. Remover logs de debug após validação
4. Deploy em produção

---

**Relatório elaborado por:** Claude Code
**Validado por:** Análise de logs do browser console
