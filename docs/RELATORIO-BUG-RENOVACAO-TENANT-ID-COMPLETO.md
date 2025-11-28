# 🐛 RELATÓRIO TÉCNICO COMPLETO: Erro tenant_id NULL em Renovações

**Data:** 27/11/2025
**Severidade:** 🔴 **CRÍTICA** - Impede renovação de pacotes E alteração de assinaturas
**Status:** ⚠️ Identificado - Aguardando correção

---

## 📋 RESUMO EXECUTIVO

⚠️ **ATENÇÃO: 2 BUGS IDENTIFICADOS COM O MESMO PADRÃO**

O sistema está **bloqueando**:
1. ❌ **Renovação de PACOTES**
2. ❌ **Alteração de ASSINATURAS** (mudar de plano)

**Erro em ambos:**
```
"null value in column tenant_id" violates not-null constraint"
```

**Causa Raiz:** Campo `tenant_id` **não está sendo incluído** no INSERT em **2 arquivos diferentes**.

---

## 🔍 BUG #1: RENOVAÇÃO DE PACOTES

### Arquivo Afetado:
**`src/app/api/admin/cliente-pacotes/[id]/route.ts`**

### Código Problemático (Linha 70-82):

```typescript
// ❌ PROBLEMA: INSERT sem tenant_id
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

### Correção Necessária:

```typescript
// ✅ CORRETO: INSERT COM tenant_id
const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    tenant_id: tenantId,  // 🆕 ADICIONAR
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

## 🔍 BUG #2: ALTERAÇÃO DE ASSINATURA

### Arquivo Afetado:
**`src/app/api/admin/cliente-assinaturas/[id]/renovar/route.ts`**

### Código Problemático (Linha 78-91):

```typescript
// ❌ PROBLEMA: INSERT sem tenant_id
const { data: novaAssinatura, error: createError } = await supabase
  .from('cliente_assinaturas')
  .insert({
    user_id: assinaturaAtual.user_id,
    plano_id: novo_plano_id,
    // ❌ FALTANDO: tenant_id: tenantId,
    data_inicio: agora.toISOString(),
    status: 'ativa',
    dia_renovacao: diaRenovacao,
    ultimo_reset: agora.toISOString(),
    proximo_reset: proximoReset.toISOString(),
    projetos_usados_mes_atual: 0,
  })
  .select()
  .single();
```

### Correção Necessária:

```typescript
// ✅ CORRETO: INSERT COM tenant_id
const { data: novaAssinatura, error: createError } = await supabase
  .from('cliente_assinaturas')
  .insert({
    user_id: assinaturaAtual.user_id,
    plano_id: novo_plano_id,
    tenant_id: tenantId,  // 🆕 ADICIONAR
    data_inicio: agora.toISOString(),
    status: 'ativa',
    dia_renovacao: diaRenovacao,
    ultimo_reset: agora.toISOString(),
    proximo_reset: proximoReset.toISOString(),
    projetos_usados_mes_atual: 0,
  })
  .select()
  .single();
```

---

## 📊 TABELA COMPARATIVA DOS BUGS

| Aspecto | Bug #1 (Pacotes) | Bug #2 (Assinaturas) |
|---------|------------------|----------------------|
| **Arquivo** | `cliente-pacotes/[id]/route.ts` | `cliente-assinaturas/[id]/renovar/route.ts` |
| **Linha** | 70-82 | 78-91 |
| **Tabela** | `cliente_pacotes` | `cliente_assinaturas` |
| **Operação** | Renovar pacote | Alterar plano |
| **Campo faltando** | `tenant_id` | `tenant_id` |
| **Erro** | "tenant_id" NULL em "cliente_pacotes" | "tenant_id" NULL em "cliente_assinaturas" |
| **Frontend** | Botão "Renovar" (linha 403) | Botão "Alterar" (linha 479) |
| **Severidade** | 🔴 CRÍTICA | 🔴 CRÍTICA |

---

## 🎯 IMPACTO NO NEGÓCIO

### Operações Bloqueadas:

1. **❌ Renovar Pacote Esgotado**: Admin não consegue renovar pacotes que chegaram a 5/5 projetos
2. **❌ Renovar Pacote Expirado**: Admin não consegue renovar pacotes que expiraram
3. **❌ Alterar Plano de Assinatura**: Admin não consegue mudar cliente de um plano para outro
4. **❌ Converter entre Modalidades**: Fluxos de conversão podem estar quebrados

### Consequências:

- 🔴 Clientes com pacotes esgotados ficam bloqueados
- 🔴 Impossível fazer upgrade/downgrade de assinaturas
- 🔴 Perda de receita por renovações não processadas
- 🔴 Suporte sobrecarregado com tickets de erro
- 🔴 Experiência ruim do admin (erros incompreensíveis)

---

## 🔧 SOLUÇÃO COMPLETA

### Correção #1: Pacotes

**Arquivo:** `src/app/api/admin/cliente-pacotes/[id]/route.ts`
**Linha:** 75 (dentro do INSERT)

**Adicionar:**
```typescript
tenant_id: tenantId,  // 🆕 Adicionar esta linha
```

**Localização exata:**
```typescript
const { data: novoPacoteCliente, error: createError } = await supabase
  .from('cliente_pacotes')
  .insert({
    user_id: pacoteAtual.user_id,
    pacote_id: novo_pacote_id,
    tenant_id: tenantId,  // 🆕 ADICIONAR AQUI (linha 75)
    data_ativacao: dataAtivacao.toISOString(),
    // ... resto do código
  })
```

---

### Correção #2: Assinaturas

**Arquivo:** `src/app/api/admin/cliente-assinaturas/[id]/renovar/route.ts`
**Linha:** 83 (dentro do INSERT)

**Adicionar:**
```typescript
tenant_id: tenantId,  // 🆕 Adicionar esta linha
```

**Localização exata:**
```typescript
const { data: novaAssinatura, error: createError } = await supabase
  .from('cliente_assinaturas')
  .insert({
    user_id: assinaturaAtual.user_id,
    plano_id: novo_plano_id,
    tenant_id: tenantId,  // 🆕 ADICIONAR AQUI (linha 83)
    data_inicio: agora.toISOString(),
    // ... resto do código
  })
```

---

## 📝 CHECKLIST DE CORREÇÃO

### Implementação:
- [ ] **1. Corrigir Bug #1 - Pacotes**
  - [ ] Abrir `src/app/api/admin/cliente-pacotes/[id]/route.ts`
  - [ ] Adicionar `tenant_id: tenantId,` na linha 75
  - [ ] Salvar arquivo

- [ ] **2. Corrigir Bug #2 - Assinaturas**
  - [ ] Abrir `src/app/api/admin/cliente-assinaturas/[id]/renovar/route.ts`
  - [ ] Adicionar `tenant_id: tenantId,` na linha 83
  - [ ] Salvar arquivo

### Testes:
- [ ] **3. Testar Renovação de Pacote**
  - [ ] Acessar `/admin/clientes` → aba Assinaturas
  - [ ] Buscar "Catarina Solar" (Pacote Ouro - Esgotado 5/5)
  - [ ] Clicar "Renovar"
  - [ ] Confirmar renovação
  - [ ] ✅ **Esperado:** "Pacote renovado com sucesso" (não erro)
  - [ ] ✅ **Verificar:** Novo pacote criado com status "Ativo (0/5)"

- [ ] **4. Testar Alteração de Assinatura**
  - [ ] Buscar cliente com assinatura ativa
  - [ ] Clicar "Alterar"
  - [ ] Selecionar novo plano
  - [ ] Confirmar alteração
  - [ ] ✅ **Esperado:** "Plano alterado com sucesso" (não erro)
  - [ ] ✅ **Verificar:** Nova assinatura criada com plano diferente

### Validação no Banco:
- [ ] **5. Verificar tenant_id no Banco**
  ```sql
  -- Verificar pacotes renovados TÊM tenant_id
  SELECT
    id,
    user_id,
    pacote_id,
    tenant_id,  -- Não pode ser NULL
    status,
    data_ativacao,
    projetos_usados
  FROM cliente_pacotes
  WHERE status = 'ativo'
    AND data_ativacao >= NOW() - INTERVAL '1 hour'  -- Últimas renovações
  ORDER BY data_ativacao DESC;

  -- Verificar assinaturas alteradas TÊM tenant_id
  SELECT
    id,
    user_id,
    plano_id,
    tenant_id,  -- Não pode ser NULL
    status,
    data_inicio,
    projetos_usados_mes_atual
  FROM cliente_assinaturas
  WHERE status = 'ativa'
    AND data_inicio >= NOW() - INTERVAL '1 hour'  -- Últimas alterações
  ORDER BY data_inicio DESC;
  ```

---

## 🚀 PRIORIDADE DE IMPLEMENTAÇÃO

**Prioridade:** 🔴 **CRÍTICA** - Corrigir ambos imediatamente

**Motivo:** Bloqueia funcionalidades essenciais do sistema

**Tempo estimado:** 20-30 minutos
- 5 min: Corrigir Bug #1 (pacotes)
- 5 min: Corrigir Bug #2 (assinaturas)
- 10 min: Testar ambos os cenários
- 5 min: Validar no banco
- 5 min: Commit e deploy

---

## 📎 RESUMO DOS ARQUIVOS AFETADOS

### Arquivos a Modificar:

1. ✏️ `src/app/api/admin/cliente-pacotes/[id]/route.ts`
   - **Linha 75**: Adicionar `tenant_id: tenantId,`

2. ✏️ `src/app/api/admin/cliente-assinaturas/[id]/renovar/route.ts`
   - **Linha 83**: Adicionar `tenant_id: tenantId,`

### Arquivos Relacionados (para referência):

3. ✅ `src/app/api/admin/cliente-pacotes/route.ts` (POST)
   - **Linha 186**: Já tem `tenant_id` corretamente

4. 📄 `src/components/admin/ClientSubscriptionsTab.tsx` (Frontend)
   - **Linha 691-704**: Chama renovação de pacote
   - **Linha 796-800**: Chama alteração de assinatura

---

## 🎯 VALIDAÇÃO PÓS-CORREÇÃO

### Teste 1: Renovar Pacote Esgotado

```
1. Login como admin
2. Acesse /admin/clientes → Assinaturas
3. Localize "Catarina Solar - Pacote Ouro • Esgotado (5/5)"
4. Clique "Renovar"
5. Modal abre: "Deseja renovar o pacote Pacote Ouro?"
6. Clique "Sim, renovar"

✅ RESULTADO ESPERADO:
  - Toast verde: "Pacote renovado com sucesso"
  - Contador reseta: "Ativo (0/5)"
  - Cliente pode criar projetos novamente
  - NENHUM ERRO de tenant_id

❌ RESULTADO ANTES DA CORREÇÃO:
  - Toast vermelho: "Erro ao renovar pacote"
  - Mensagem: "null value in column tenant_id"
  - Pacote NÃO renovado
```

### Teste 2: Alterar Plano de Assinatura

```
1. Login como admin
2. Acesse /admin/clientes → Assinaturas
3. Localize cliente com assinatura ativa
4. Clique "Alterar"
5. Selecione novo plano no dropdown
6. Clique "Confirmar alteração"

✅ RESULTADO ESPERADO:
  - Toast verde: "Plano alterado com sucesso"
  - Nova assinatura ativa com novo plano
  - NENHUM ERRO de tenant_id

❌ RESULTADO ANTES DA CORREÇÃO:
  - Toast vermelho: "Erro ao alterar plano"
  - Mensagem: "null value in column tenant_id"
  - Plano NÃO alterado
```

---

## ⚠️ PREVENÇÃO FUTURA

### TypeScript Strict Types:

Criar interfaces que SEMPRE exigem tenant_id:

```typescript
// src/types/billing.ts

interface ClientePacoteInsert {
  user_id: string;
  pacote_id: string;
  tenant_id: string;  // Required - não pode ser omitido
  data_ativacao: string;
  data_expiracao: string;
  projetos_inclusos: number;
  projetos_usados: number;
  status: 'ativo' | 'expirado' | 'cancelado';
}

interface ClienteAssinaturaInsert {
  user_id: string;
  plano_id: string;
  tenant_id: string;  // Required - não pode ser omitido
  data_inicio: string;
  status: 'ativa' | 'pausada' | 'cancelada';
  dia_renovacao: number;
  ultimo_reset: string;
  proximo_reset: string;
  projetos_usados_mes_atual: number;
}
```

### Lint Rule Customizada:

```typescript
// eslint-custom-rules/require-tenant-id.js

// Detectar .insert() sem tenant_id em tabelas multi-tenant
module.exports = {
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.property?.name === 'insert') {
          // Verificar se objeto tem tenant_id
          // Se não tiver, reportar erro
        }
      }
    };
  }
};
```

---

## ✍️ AUTOR DO RELATÓRIO

**Sistema:** Claude Code
**Versão:** 4.5
**Data:** 27/11/2025
**Status:** Aguardando aprovação para correção

---

## 📌 CONCLUSÃO

### Status Atual:
- 🔴 2 bugs CRÍTICOS identificados
- 🔴 Renovação de pacotes: **BLOQUEADA**
- 🔴 Alteração de assinaturas: **BLOQUEADA**

### Após Correção:
- ✅ 2 linhas de código adicionadas (1 por arquivo)
- ✅ Renovação de pacotes: **FUNCIONANDO**
- ✅ Alteração de assinaturas: **FUNCIONANDO**
- ✅ Isolamento multi-tenant: **GARANTIDO**

### Risco da Correção:
- ✅ **ZERO RISCO**: Apenas adiciona campo obrigatório
- ✅ **NÃO afeta** outros fluxos
- ✅ **NÃO requer** migration (dados novos apenas)
- ✅ **TESTÁVEL** imediatamente com casos reais

---

**RECOMENDAÇÃO: Aplicar correção IMEDIATAMENTE** ✅
