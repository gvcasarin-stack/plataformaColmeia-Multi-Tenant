# 🔍 RELATÓRIO TÉCNICO: Bug de Permissão em Download de Fatura (Cliente)

**Data**: 10/01/2026
**Status**: ❌ BUG IDENTIFICADO - CORREÇÃO PENDENTE
**Severidade**: 🔴 CRÍTICA
**Área Afetada**: Painel do Cliente - Download de Faturas

---

## 📋 RESUMO EXECUTIVO

### Situação Atual
- ✅ **Admin**: Download de faturas funcionando perfeitamente
- ❌ **Cliente**: Download de faturas bloqueado com erro de permissão
- ✅ **Código de Verificação**: Correção aplicada corretamente
- ❌ **Dados do Backend**: Campo `owner_id` faltando no objeto retornado

### Causa Raiz Identificada
O campo `owner_id` não está sendo incluído no mapeamento de dados na função `getProjectsByUserId()`, fazendo com que a correção de permissão não funcione para clientes.

---

## 🔍 ANÁLISE TÉCNICA DETALHADA

### 1. Verificação do Código Frontend

**Arquivo**: `src/app/cliente/cobranca/page.tsx`
**Linhas**: 226-240

```typescript
// Function to generate and download invoice
const handleDownloadInvoice = async (project: any) => {
  if (!project) return;

  // SECURITY CHECK: Ensure the project belongs to the current user
  // Priorizar owner_id (proprietário) sobre userId (criador) para permitir que
  // clientes acessem projetos criados para eles por administradores
  const projectOwnerId = project.owner_id || project.userId;  // ✅ Linha 232: Correção aplicada
  if (projectOwnerId !== user?.id) {                          // ✅ Linha 233: Verificação correta
    toast({
      title: "Erro de permissão",
      description: "Você não tem permissão para acessar esta fatura.",
      variant: "destructive",
    });
    return;
  }
```

**Status**: ✅ **CÓDIGO CORRETO**
**Observação**: A lógica de verificação está perfeita - prioriza `owner_id` com fallback para `userId`.

---

### 2. Rastreamento do Fluxo de Dados

#### Chamada Inicial
**Arquivo**: `src/app/cliente/cobranca/page.tsx`
**Linha**: 98

```typescript
const result = await getClientProjectsAction(user.id);
```

#### Server Action
**Arquivo**: `src/lib/actions/project-actions.ts`
**Linhas**: 2264-2291

```typescript
export async function getClientProjectsAction(
  clientId: string
): Promise<{ data?: Project[]; error?: string; message?: string }> {
  try {
    if (!clientId) {
      logger.warn('[getClientProjectsAction] Tentativa de buscar projetos sem clientId.');
      return { error: 'ID do cliente é obrigatório.' };
    }

    logger.debug('[getClientProjectsAction] Buscando projetos para o cliente:', { clientId });

    // Usar getProjectsAdmin, assumindo que isAdmin seria false para um cliente específico
    const projectList = await getProjectsByUserId(clientId);  // ⚠️ Chama getProjectsByUserId

    logger.info(`[getClientProjectsAction] ${projectList.length} projetos encontrados para o cliente: ${clientId}`);
    return { data: projectList, message: 'Projetos carregados com sucesso.' };

  } catch (error) {
    // ...
  }
}
```

**Status**: ✅ Fluxo correto
**Observação**: Apenas repassa os dados de `getProjectsByUserId`

---

### 3. Ponto do Problema: Mapeamento de Dados

**Arquivo**: `src/lib/services/projectService/supabase.ts`
**Linhas**: 110-200

#### Query do Banco (CORRETA) ✅
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')  // ✅ Seleciona TODAS as colunas, incluindo owner_id
  .or(`owner_id.eq.${userId},and(owner_id.is.null,created_by.eq.${userId})`)
  .eq('tenant_id', userData.tenant_id)
  .is('deleted_at', null)
  .order('updated_at', { ascending: false });
```

**Status**: ✅ **QUERY CORRETA**
**Observação**: O banco retorna `owner_id`, `created_by` e todos os outros campos.

---

#### Mapeamento de Dados (INCORRETO) ❌

**Linhas**: 154-191

```typescript
// Mapear dados do Supabase para o formato Project
const projects: Project[] = data.map(item => ({
  id: item.id,
  userId: item.created_by,  // ✅ created_by → userId (MAPEADO)
  nome_cliente_final: item.nome_cliente_final,
  number: item.number,
  empresaIntegradora: item.empresa_integradora || '',
  nomeClienteFinal: item.nome_cliente_final || '',
  distribuidora: item.distribuidora || '',
  potencia: item.potencia || 0,
  dataEntrega: item.data_entrega || '',
  status: item.status || 'Não Iniciado',
  prioridade: item.prioridade || 'Baixa',
  valorProjeto: item.valor_projeto || null,
  pagamento: item.pagamento || undefined,

  // ✅ PROCURAÇÃO: Campos de cidade e estado do cliente
  cpf_cnpj_cliente_final: item.cpf_cnpj_cliente_final || undefined,
  endereco_local: item.endereco_local || undefined,
  client_city: item.client_city || undefined,
  client_state: item.client_state || undefined,

  // 💳 BILLING: Adicionar campos de faturamento
  billing_mode: item.billing_mode || 'avulso',
  billing_snapshot: item.billing_snapshot || null,

  createdAt: sanitizeDate(item.created_at),
  updatedAt: sanitizeDate(item.updated_at),
  adminResponsibleId: item.admin_responsible_id,
  adminResponsibleName: item.admin_responsible_name,
  adminResponsibleEmail: item.admin_responsible_email,
  adminResponsiblePhone: item.admin_responsible_phone,
  timelineEvents: item.timeline_events || [],
  documents: item.documents || [],
  files: item.files || [],
  comments: item.comments || [],
  history: item.history || [],
  lastUpdateBy: item.last_update_by || undefined,

  // ❌ PROBLEMA: owner_id NÃO ESTÁ SENDO MAPEADO!
}));
```

**Status**: ❌ **MAPEAMENTO INCOMPLETO**
**Problema Identificado**: O campo `item.owner_id` existe no banco, mas NÃO está sendo incluído no objeto retornado.

---

## 🎯 CAUSA RAIZ

### Fluxo do Problema

1. **Banco de Dados** ✅
   ```sql
   SELECT * FROM projects WHERE owner_id = 'cliente_id'
   -- Retorna: { owner_id: 'cliente_id', created_by: 'admin_id', ... }
   ```

2. **Mapeamento Backend** ❌
   ```typescript
   {
     userId: item.created_by,  // = 'admin_id'
     // owner_id: NÃO MAPEADO! ❌
   }
   ```

3. **Recebido no Frontend** ❌
   ```typescript
   project = {
     userId: 'admin_id',       // ✅ Existe
     owner_id: undefined,      // ❌ Não existe!
   }
   ```

4. **Verificação de Permissão** ❌
   ```typescript
   const projectOwnerId = project.owner_id || project.userId;
   // projectOwnerId = undefined || 'admin_id'
   // projectOwnerId = 'admin_id'  ❌ (deveria ser 'cliente_id')

   if (projectOwnerId !== user?.id) {
     // 'admin_id' !== 'cliente_id' → TRUE ❌
     // BLOQUEIA O ACESSO!
   }
   ```

---

## 📊 COMPARAÇÃO: ADMIN vs CLIENTE

### Por Que Funciona para Admin?

O admin usa endpoint diferente que pode:
1. Ter outro mapeamento que inclui `owner_id`
2. Não fazer verificação de permissão baseada em `owner_id`
3. Ter acesso direto sem restrições

### Por Que Não Funciona para Cliente?

O cliente:
1. ✅ Recebe dados via `getClientProjectsAction` → `getProjectsByUserId`
2. ❌ `owner_id` não está no objeto retornado
3. ❌ Fallback usa `userId` (que é `created_by` = admin)
4. ❌ Verificação compara admin_id com cliente_id → FALHA

---

## 🔧 SOLUÇÃO NECESSÁRIA

### Arquivo a Modificar
**Arquivo**: `src/lib/services/projectService/supabase.ts`
**Função**: `getProjectsByUserId`
**Linhas**: 154-191

### Mudança Necessária

Adicionar o campo `owner_id` ao mapeamento:

```typescript
const projects: Project[] = data.map(item => ({
  id: item.id,
  userId: item.created_by,
  owner_id: item.owner_id,  // ✅ ADICIONAR ESTA LINHA
  nome_cliente_final: item.nome_cliente_final,
  // ... resto dos campos
}));
```

### Validação Adicional

Verificar se a interface `Project` em `src/types/project.ts` inclui o campo `owner_id`:

```typescript
export interface Project {
  id: string;
  userId: string;
  owner_id?: string;  // ✅ Deve existir (opcional para retrocompatibilidade)
  // ... outros campos
}
```

---

## 🧪 TESTE DE VERIFICAÇÃO

### Cenário de Teste

**Setup**:
- Projeto criado por Admin
- `created_by` = UUID do admin
- `owner_id` = UUID do cliente

**Estado Atual** (Incorreto):
```typescript
// Backend retorna:
{
  userId: 'admin-uuid',
  owner_id: undefined  // ❌ Faltando!
}

// Verificação:
projectOwnerId = undefined || 'admin-uuid' = 'admin-uuid'
'admin-uuid' !== 'cliente-uuid' → BLOQUEADO ❌
```

**Estado Esperado** (Após Correção):
```typescript
// Backend deve retornar:
{
  userId: 'admin-uuid',
  owner_id: 'cliente-uuid'  // ✅ Presente!
}

// Verificação:
projectOwnerId = 'cliente-uuid' || 'admin-uuid' = 'cliente-uuid'
'cliente-uuid' !== 'cliente-uuid' → PERMITIDO ✅
```

---

## 📝 VERIFICAÇÕES ADICIONAIS NECESSÁRIAS

### 1. Verificar Interface TypeScript

**Arquivo**: `src/types/project.ts`

Confirmar se existe:
```typescript
export interface Project {
  owner_id?: string;  // ✅ Deve existir
}
```

### 2. Verificar Outras Funções de Mapeamento

Buscar por outros locais que fazem mapeamento similar:
- `getProjectsAdmin`
- `getProjectById`
- Qualquer outra função que retorne `Project[]`

### 3. Testar Retrocompatibilidade

Garantir que projetos antigos sem `owner_id` continuam funcionando:
```typescript
projectOwnerId = null || 'cliente-uuid' = 'cliente-uuid'  // ✅ OK
```

---

## 🎯 IMPACTO DA CORREÇÃO

### Funcionalidades Restauradas
- ✅ Cliente poderá baixar faturas de projetos criados para ele por admin
- ✅ Cliente poderá baixar faturas de projetos criados por ele mesmo
- ✅ Fluxo completo de "admin cria para cliente" funcionará 100%

### Funcionalidades Mantidas
- ✅ Admin continua gerando faturas normalmente
- ✅ Projetos antigos (sem owner_id) continuam funcionando
- ✅ Segurança mantida (verificação de permissões preservada)

### Mudanças Visuais
- **Nenhuma**: Correção é puramente de dados

---

## ⚠️ RESUMO DO BUG

### O Que Está Acontecendo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO BUG                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BANCO DE DADOS ✅                                       │
│     owner_id: 'cliente-uuid'                                │
│     created_by: 'admin-uuid'                                │
│                                                             │
│  2. QUERY SUPABASE ✅                                       │
│     SELECT * → Retorna owner_id                             │
│                                                             │
│  3. MAPEAMENTO BACKEND ❌                                   │
│     userId: created_by  ✅                                  │
│     owner_id: ???  ❌ NÃO MAPEADO!                          │
│                                                             │
│  4. OBJETO FRONTEND ❌                                      │
│     project.userId = 'admin-uuid'                           │
│     project.owner_id = undefined  ❌                        │
│                                                             │
│  5. VERIFICAÇÃO PERMISSÃO ❌                                │
│     projectOwnerId = undefined || 'admin-uuid'              │
│     projectOwnerId = 'admin-uuid'  ❌ (ERRADO!)             │
│                                                             │
│  6. COMPARAÇÃO ❌                                           │
│     'admin-uuid' !== 'cliente-uuid'                         │
│     → BLOQUEIA ACESSO ❌                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mensagem de Erro Vista pelo Usuário

```
┌─────────────────────────────────────────────┐
│  ⚠️ Erro de permissão                       │
│  Você não tem permissão para acessar esta   │
│  fatura.                                    │
└─────────────────────────────────────────────┘
```

---

## 🔧 SOLUÇÃO EM UMA LINHA

**Adicionar `owner_id: item.owner_id` no mapeamento da função `getProjectsByUserId()`**

---

## 📊 CHECKLIST DE CORREÇÃO

### Antes de Aplicar
- [x] Causa raiz identificada
- [x] Solução documentada
- [x] Arquivos identificados
- [x] Linha exata localizada

### Ao Aplicar
- [ ] Adicionar `owner_id` ao mapeamento em `getProjectsByUserId`
- [ ] Verificar interface `Project` tem `owner_id?`
- [ ] Buscar outras funções que possam ter mesmo problema

### Após Aplicar
- [ ] Testar download de fatura pelo cliente
- [ ] Testar com projeto criado por admin
- [ ] Testar com projeto criado por cliente
- [ ] Verificar projetos antigos (sem owner_id)
- [ ] Confirmar admin continua funcionando

---

## 📞 ARQUIVOS ENVOLVIDOS

### 1. Arquivo com Bug (Precisa Correção)
- **Arquivo**: `src/lib/services/projectService/supabase.ts`
- **Função**: `getProjectsByUserId`
- **Linha**: ~156 (no mapeamento)
- **Mudança**: Adicionar `owner_id: item.owner_id,`

### 2. Arquivo com Verificação (Já Corrigido)
- **Arquivo**: `src/app/cliente/cobranca/page.tsx`
- **Função**: `handleDownloadInvoice`
- **Linha**: 232
- **Status**: ✅ Correto

### 3. Arquivo de Tipos (Verificar)
- **Arquivo**: `src/types/project.ts`
- **Interface**: `Project`
- **Campo**: `owner_id?: string`
- **Status**: ⚠️ Precisa verificar

---

## 🎉 CONCLUSÃO

### Status Atual
❌ **BUG CRÍTICO IDENTIFICADO**

### Causa Raiz
Campo `owner_id` não está sendo mapeado na função `getProjectsByUserId()`, fazendo com que o valor seja `undefined` no frontend.

### Solução
Adicionar uma linha no mapeamento: `owner_id: item.owner_id,`

### Impacto da Solução
✅ Cliente poderá baixar faturas normalmente
✅ Fluxo de "admin cria para cliente" funcionará 100%
✅ Sem impacto em funcionalidades existentes
✅ Retrocompatibilidade mantida

### Próximo Passo
Aplicar a correção conforme descrito neste relatório.

---

**Relatório Elaborado Por**: Claude (Assistente de IA)
**Data**: 10/01/2026
**Versão**: 1.0
**Status**: ✅ Análise Completa - Aguardando Aprovação para Correção

---

**FIM DO RELATÓRIO TÉCNICO**
