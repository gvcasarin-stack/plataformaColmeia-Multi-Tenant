# 🎯 RELATÓRIO FINAL: CAUSA RAIZ - Billing Não Aparece na Interface

**Data:** 25/11/2025
**Investigação:** Análise profunda do fluxo de dados desde criação até exibição

---

## 🔍 INSIGHT DO USUÁRIO

> "Eu acho, meu palpite, que não é questão como banco de dados, porque eu acho que no banco de dados está sendo salvo tudo corretamente. O problema está sendo na exibição para o formato em. Não sei se é no mapeamento do campo ou na hora da criação do projeto."

**STATUS:** ✅ **INSIGHT CORRETO** - O problema está no **MAPEAMENTO**, não no banco!

---

## 🐛 CAUSA RAIZ IDENTIFICADA

### **BUG CRÍTICO: Campos billing_mode e billing_snapshot NÃO são retornados pela Server Action**

**Arquivo:** `src/lib/actions/project-actions.ts`
**Função:** `createProjectClientAction`
**Linhas:** 1995-2026

### ❌ O QUE ESTÁ ACONTECENDO:

1. **Linhas 1924-1926:** Os campos `billing_mode` e `billing_snapshot` **SÃO INSERIDOS** no banco de dados corretamente
   ```typescript
   const projectData = {
     // ... outros campos ...
     billing_mode: billingMode,        // ✅ SALVA NO BANCO
     billing_snapshot: billingSnapshot, // ✅ SALVA NO BANCO
   };
   ```

2. **Linhas 1957-1961:** O projeto é inserido e retornado do banco com **TODOS os campos**, incluindo billing
   ```typescript
   const { data, error } = await supabase
     .from('projects')
     .insert([projectData])
     .select()  // ✅ RETORNA billing_mode e billing_snapshot do banco
     .single();

   newProject = data; // ✅ newProject TEM os campos billing
   ```

3. **🚨 Linhas 1996-2026:** O objeto `projectResult` é criado **MAS NÃO INCLUI** os campos billing!
   ```typescript
   const projectResult: Project = {
     id: newProject.id,
     userId: newProject.created_by,
     nome_cliente_final: newProject.nome_cliente_final,
     // ... 20+ campos mapeados ...

     // ❌ FALTANDO: billing_mode
     // ❌ FALTANDO: billing_snapshot

     createdAt: newProject.created_at,
     updatedAt: newProject.updated_at,
     // ... mais campos ...
   };
   ```

4. **Linha 2056:** A função retorna `projectResult` **SEM os campos billing**
   ```typescript
   return { success: true, data: projectResult }; // ❌ billing_mode e billing_snapshot ausentes
   ```

---

## 📊 FLUXO DE DADOS COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRIAÇÃO DO PROJETO (createProjectClientAction)              │
├─────────────────────────────────────────────────────────────────┤
│ ✅ billingMode calculado corretamente (linha 1710)             │
│ ✅ billingSnapshot criado corretamente (linhas 1715-1901)      │
│ ✅ Campos adicionados ao projectData (linhas 1924-1926)        │
│ ✅ Insert no banco SUCESSO (linhas 1957-1971)                  │
│                                                                 │
│ ❌ BUG: projectResult NÃO INCLUI billing (linhas 1996-2026)   │
│ ❌ Retorno da action SEM billing_mode/billing_snapshot         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. BANCO DE DADOS                                               │
├─────────────────────────────────────────────────────────────────┤
│ ✅ billing_mode: "pacote" (projetos 347, 348, 349)            │
│ ✅ billing_snapshot: {...} (dados completos)                   │
│                                                                 │
│ EVIDÊNCIA (Query SQL):                                          │
│   FV-2025-349 → billing_mode: "pacote" ✅                      │
│   FV-2025-348 → billing_mode: "pacote" ✅                      │
│   FV-2025-347 → billing_mode: "pacote" ✅                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. HOOK useProjects (linha 224)                                │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Recebe projectResult da action                              │
│ ❌ projectResult NÃO TEM billing_mode/billing_snapshot         │
│ ✅ Adiciona projeto ao estado: setProjects([formattedProject]) │
│                                                                 │
│ RESULTADO: Projeto sem billing chega no React state            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. COMPONENTE expanded-project-view.tsx                        │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Recebe projeto via props (linha 298)                        │
│ ❌ project.billing_mode = undefined                            │
│ ❌ project.billing_snapshot = undefined                        │
│                                                                 │
│ RESULTADO (linha 1736):                                         │
│ if (editedProject.billing_mode === 'pacote') // ❌ FALSO!     │
│   → Não renderiza card roxo do pacote                          │
│   → Exibe valor avulso ao invés de informações do pacote       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔬 CONFIRMAÇÃO DA CAUSA RAIZ

### TESTE 1: Verificar banco de dados
```sql
SELECT billing_mode, billing_snapshot FROM projects WHERE id = 'PROJETO_RECENTE';
```
**Resultado:** ✅ Campos estão no banco com valores corretos

### TESTE 2: Verificar projectResult na Server Action
**Linha 1996-2026:** ❌ Objeto `projectResult` NÃO inclui billing_mode e billing_snapshot

### TESTE 3: Verificar queries de leitura (supabase.ts)
**Linhas 79-80, 170-171:** ✅ Queries de leitura INCLUEM os campos billing corretamente
```typescript
billing_mode: data.billing_mode || 'avulso',
billing_snapshot: data.billing_snapshot || null,
```

### TESTE 4: Verificar useState no componente
**Linha 298-300:** ✅ useState INCLUI os campos billing corretamente
```typescript
billing_mode: project.billing_mode || 'avulso',
billing_snapshot: project.billing_snapshot || null,
```

---

## 💡 POR QUE O PROBLEMA SÓ AFETA NOVOS PROJETOS CRIADOS?

### Projetos NOVOS (criados via modal "Novo Projeto"):
1. Criados via `createProjectClientAction` → ❌ Retorna SEM billing
2. Hook `useProjects` recebe projeto SEM billing
3. Interface mostra "avulso" porque `billing_mode` é `undefined`

### Projetos EXISTENTES (buscados do banco):
1. Buscados via `getProjectsForUserAction` → ✅ Usa queries do `supabase.ts`
2. Queries do `supabase.ts` (linhas 79-80, 170-171) → ✅ INCLUEM billing
3. Interface mostra corretamente porque `billing_mode` vem do banco

---

## 📋 PROJETOS AFETADOS

### ❌ Projetos criados HOJE (24-25/11) via interface:
- **Afetados:** Projetos criados pelo botão "Novo Projeto" na área do cliente
- **Sintoma:** Contam no pacote (banco correto) mas exibem "avulso" na interface
- **Causa:** Server Action não retorna campos billing

### ✅ Projetos criados via API Unified:
- **Arquivo:** `src/app/api/projects/unified/route.ts` (linhas 272-546)
- **Status:** ✅ API cria projetos corretamente COM billing_mode e billing_snapshot
- **Diferença:** API retorna o objeto direto do banco, não passa por mapeamento manual

### ❓ Projetos 344, 345, 346 (19-22/11):
- **Status no banco:** `billing_mode: NULL`
- **Explicação ATUALIZADA:** Esses projetos foram criados ANTES da migration adicionar as colunas
- **Observação:** User mencionou que migration foi feita antes, mas timestamps sugerem que colunas não existiam ainda

---

## 🎯 SOLUÇÃO PROPOSTA

### SOLUÇÃO IMEDIATA: Adicionar campos billing ao retorno da Server Action

**Arquivo:** `src/lib/actions/project-actions.ts`
**Linha:** Após linha 2012 (dentro do objeto `projectResult`)

**Adicionar:**
```typescript
const projectResult: Project = {
  id: newProject.id,
  userId: newProject.created_by,
  owner_id: newProject.owner_id,
  nome_cliente_final: newProject.nome_cliente_final,
  number: newProject.number,
  empresaIntegradora: newProject.empresa_integradora,
  nomeClienteFinal: newProject.nome_cliente_final,
  distribuidora: newProject.distribuidora,
  potencia: newProject.potencia,
  dataEntrega: newProject.data_entrega,
  listaMateriais: newProject.lista_materiais,
  disjuntorPadraoEntrada: newProject.disjuntor_padrao_entrada,
  status: newProject.status,
  prioridade: newProject.prioridade,
  valorProjeto: newProject.valor_projeto,
  pagamento: newProject.pagamento,

  // 💳 CORREÇÃO: Adicionar campos de billing que faltavam
  billing_mode: newProject.billing_mode || 'avulso',
  billing_snapshot: newProject.billing_snapshot || null,

  createdAt: newProject.created_at,
  updatedAt: newProject.updated_at,
  // ... resto dos campos ...
};
```

---

## ✅ VALIDAÇÃO DA SOLUÇÃO

### ANTES da correção:
```javascript
// Server Action retorna:
{
  id: "abc",
  number: "FV-2025-350",
  // ... 20+ campos ...
  // ❌ billing_mode: undefined
  // ❌ billing_snapshot: undefined
}

// Interface exibe: "Projeto Avulso - R$ 15.000"
```

### DEPOIS da correção:
```javascript
// Server Action retorna:
{
  id: "abc",
  number: "FV-2025-350",
  // ... 20+ campos ...
  billing_mode: "pacote", // ✅ PRESENTE
  billing_snapshot: {     // ✅ PRESENTE
    mode: "pacote",
    pacote_nome: "Pacote Ouro",
    projetos_usados_antes: 1,
    projetos_usados_depois: 2
  }
}

// Interface exibe: "Projeto incluso no pacote - Pacote Ouro"
```

---

## 📌 VERIFICAÇÃO ADICIONAL

### Outros pontos de criação de projeto a verificar:

1. ✅ **API Unified (`/api/projects/unified/route.ts`)**
   - Linhas 272-546: POST handler
   - Status: ✅ Já inclui billing_mode e billing_snapshot corretamente
   - Não precisa correção

2. ❌ **Server Action (`createProjectClientAction`)**
   - Status: ❌ **ESTE É O BUG** - não retorna billing
   - Precisa: Adicionar billing_mode e billing_snapshot ao projectResult

3. ✅ **Queries de leitura (`supabase.ts`)**
   - Linhas 79-80, 170-171
   - Status: ✅ Já incluem billing corretamente
   - Não precisa correção

---

## 🚀 PLANO DE AÇÃO

### PASSO 1: Aplicar correção na Server Action
- Arquivo: `src/lib/actions/project-actions.ts`
- Ação: Adicionar billing_mode e billing_snapshot ao projectResult
- Impacto: Projetos NOVOS criados terão billing na interface

### PASSO 2: Testar criação de novo projeto
- Criar projeto via botão "Novo Projeto"
- Verificar se billing_mode aparece no card de financeiro
- Verificar se card roxo "Projeto incluso no pacote" é exibido

### PASSO 3 (Opcional): Migrar projetos antigos NULL
- Apenas se necessário (projetos 344-346)
- SQL para atualizar projetos sem billing:
```sql
UPDATE projects
SET
  billing_mode = 'avulso',
  billing_snapshot = jsonb_build_object(
    'mode', 'avulso',
    'potencia', potencia,
    'valor_projeto', valor_projeto,
    'timestamp', created_at
  )
WHERE billing_mode IS NULL
  AND created_at < '2025-11-22 17:00:00';
```

---

## 📊 RESUMO EXECUTIVO

| Item | Status | Detalhes |
|------|--------|----------|
| **Banco de dados** | ✅ Correto | Campos sendo salvos corretamente |
| **Server Action (criar)** | ❌ **BUG** | Não retorna billing no projectResult |
| **API Unified (criar)** | ✅ Correto | Retorna billing corretamente |
| **Queries (ler)** | ✅ Correto | Leem billing do banco corretamente |
| **useState (UI)** | ✅ Correto | Preserva billing quando presente |
| **Renderização (UI)** | ✅ Correto | Exibe billing quando presente |

**CONCLUSÃO:** O bug está em **1 ÚNICA LINHA DE CÓDIGO** - o mapeamento do `projectResult` na Server Action não inclui os campos billing que foram salvos no banco.

---

## 🎖️ CRÉDITOS

**Insight crítico do usuário:** "não é questão como banco de dados... O problema está sendo na exibição para o formato em... no mapeamento do campo"

**✅ EXATAMENTE CORRETO!** O problema era no **mapeamento de retorno** da Server Action, não no banco, não nas queries de leitura, não no componente.

---

**Relatório gerado em:** 25/11/2025 03:45 BRT
**Status:** Causa raiz identificada com 100% de certeza
**Próxima ação:** Aplicar correção de 2 linhas na Server Action
