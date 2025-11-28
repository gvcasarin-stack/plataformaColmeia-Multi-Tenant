# 🐛 RELATÓRIO TÉCNICO: Projetos do Pacote Não Aparecem na Interface

**Data:** 27/11/2025
**Severidade:** 🔴 **CRÍTICA** - Dados inconsistentes entre contador e lista
**Status:** ⚠️ Identificado - Aguardando correção

---

## 📋 RESUMO EXECUTIVO

O sistema mostra **contador correto** de projetos usados em pacotes ("5 de 5 projetos utilizados"), mas a **tabela de projetos exibe apenas 2 projetos** ao invés dos 5 esperados.

**Causa Raiz:** Campo `cliente_pacote_id` **não está sendo preenchido** quando projetos são criados, impedindo a vinculação correta entre projetos e pacotes.

---

## 🔍 ANÁLISE DO PROBLEMA

### Comportamento Observado:

1. **Contador do Pacote**: ✅ Mostra "5 de 5 projetos utilizados"
2. **Tabela de Projetos**: ❌ Exibe apenas 2 projetos
3. **Campo `projetos_usados`**: ✅ Incrementado corretamente (valor = 5)
4. **Campo `cliente_pacote_id`**: ❌ Não está sendo salvo nos projetos

### Evidência do Bug:

**Screenshot fornecido pelo usuário:**
- Header: "Catarina Solar - Pacote Ouro • 5 de 5 projetos utilizados"
- Tabela: Apenas 2 linhas visíveis (#FV-2025-348 e #FV-2025-347)

---

## 🔧 CAUSA RAIZ TÉCNICA

### 1. **API de Listagem de Pacotes**

**Arquivo:** `src/app/api/admin/cliente-pacotes/route.ts`
**Linhas:** 65-70

```typescript
// Busca projetos vinculados ao pacote
const { data: projetos, error: projetosError } = await supabase
  .from('projects')
  .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at')
  .eq('cliente_pacote_id', pacote.id)  // ❌ PROBLEMA: Este campo está NULL nos projetos
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });
```

**Por que falha:**
- A query busca projetos onde `cliente_pacote_id = pacote.id`
- Mas esse campo **nunca foi preenchido** durante a criação dos projetos
- Resultado: Retorna array vazio ou apenas projetos antigos que foram manualmente corrigidos

---

### 2. **Criação de Projetos**

**Arquivo:** `src/lib/actions/project-actions.ts`
**Linhas:** 1945-1981 (preparação dos dados do projeto)

```typescript
// ✅ SUPABASE - Preparar dados do projeto para inserção
const projectData = {
  nome_cliente_final: projectDataFromClient.nomeClienteFinal || '...',
  number: projectNumber,
  created_by: clientUser.id,
  owner_id: ownerId,
  tenant_id: tenantInfo.tenant_id,
  // ... outros campos ...

  // 💳 BILLING: Campos de faturamento
  billing_mode: billingMode,
  billing_snapshot: billingSnapshot,

  // ❌ FALTANDO: cliente_pacote_id e cliente_assinatura_id
  // Esses campos nunca são adicionados ao projectData!
};
```

**Validação de Pacote (Linhas 1786-1821):**
```typescript
// ✅ Pacote válido - decrementar contador
const { error: updateError } = await supabase
  .from('cliente_pacotes')
  .update({
    projetos_usados: pacote.projetos_usados + 1,  // ✅ Incrementa corretamente
    updated_at: new Date().toISOString()
  })
  .eq('id', pacote.id);

// Criar snapshot do pacote
billingSnapshot = {
  mode: 'pacote',
  pacote_id: pacote.id,  // ⚠️ Salvo no snapshot mas NÃO na FK do projeto
  // ...
};

// ❌ FALTANDO: Adicionar cliente_pacote_id ao projectData
```

---

## 📊 INCONSISTÊNCIA DE DADOS

### Tabela `cliente_pacotes`:
```
| id | user_id | projetos_inclusos | projetos_usados | status |
|----|---------|-------------------|-----------------|--------|
| abc| xyz     | 5                 | 5               | ativo  |  ✅ Correto
```

### Tabela `projects`:
```sql
SELECT id, number, cliente_pacote_id, billing_mode, billing_snapshot
FROM projects
WHERE owner_id = 'xyz' AND billing_mode = 'pacote';

Resultado esperado:
| id  | number         | cliente_pacote_id | billing_mode | billing_snapshot.pacote_id |
|-----|----------------|-------------------|--------------|----------------------------|
| 1   | #FV-2025-344   | abc               | pacote       | abc                        |
| 2   | #FV-2025-345   | abc               | pacote       | abc                        |
| 3   | #FV-2025-346   | abc               | pacote       | abc                        |
| 4   | #FV-2025-347   | abc               | pacote       | abc                        |
| 5   | #FV-2025-348   | abc               | pacote       | abc                        |

Resultado REAL:
| id  | number         | cliente_pacote_id | billing_mode | billing_snapshot.pacote_id |
|-----|----------------|-------------------|--------------|----------------------------|
| 1   | #FV-2025-344   | NULL              | pacote       | abc                        | ❌
| 2   | #FV-2025-345   | NULL              | pacote       | abc                        | ❌
| 3   | #FV-2025-346   | NULL              | pacote       | abc                        | ❌
| 4   | #FV-2025-347   | NULL ou abc       | pacote       | abc                        | ❓
| 5   | #FV-2025-348   | NULL ou abc       | pacote       | abc                        | ❓
```

**Nota:** Apenas 2 projetos aparecem porque podem ter sido corrigidos manualmente ou criados antes/depois de alguma alteração.

---

## 🎯 IMPACTO NO NEGÓCIO

### Problemas Causados:

1. **❌ Relatórios Incorretos**: Admin não vê todos os projetos vinculados ao pacote
2. **❌ Auditoria Impossível**: Não há como rastrear quais projetos consumiram o pacote
3. **❌ Cobranças Inconsistentes**: Dificuldade para gerar faturas detalhadas
4. **❌ Dados Órfãos**: Projetos existem mas não aparecem em lugar nenhum
5. **❌ Confiança do Cliente**: Administrador vê informações conflitantes

### Exemplo do Problema:

```
Admin acessa /admin/financeiro → Aba Pacotes
  ↓
Vê: "Catarina Solar - 5 de 5 projetos utilizados"  ✅
  ↓
Espera ver 5 projetos na tabela abaixo  ✅
  ↓
Mas vê apenas 2 projetos  ❌
  ↓
Admin confuso: "Onde estão os outros 3 projetos?" 😕
  ↓
Não consegue gerar fatura completa  ❌
```

---

## ✅ SOLUÇÃO PROPOSTA

### Correção 1: Preencher FK no Momento da Criação

**Arquivo:** `src/lib/actions/project-actions.ts`
**Linhas a modificar:** 1945-1981, 1786-1821, 1892-1930

#### MODIFICAÇÃO NO PACOTE (após linha 1821):

```typescript
// ✅ Pacote válido - decrementar contador
const { error: updateError } = await supabase
  .from('cliente_pacotes')
  .update({
    projetos_usados: pacote.projetos_usados + 1,
    updated_at: new Date().toISOString()
  })
  .eq('id', pacote.id);

if (updateError) {
  logger.error('[createProjectClientAction] Erro ao decrementar contador do pacote:', updateError);
  return { error: 'Erro ao processar pacote. Tente novamente.' };
}

// 🆕 ADICIONAR: Armazenar ID do pacote para vincular ao projeto
const pacoteIdParaVincular = pacote.id;  // ✅ NOVO

// Criar snapshot do pacote
billingSnapshot = {
  mode: 'pacote',
  pacote_id: pacote.id,
  // ... resto do snapshot
};
```

#### MODIFICAÇÃO NA PREPARAÇÃO DOS DADOS (linha ~1965):

```typescript
// ✅ SUPABASE - Preparar dados do projeto para inserção
const projectData = {
  nome_cliente_final: projectDataFromClient.nomeClienteFinal || '...',
  number: projectNumber,
  created_by: clientUser.id,
  owner_id: ownerId,
  tenant_id: tenantInfo.tenant_id,
  // ... outros campos ...

  // 💳 BILLING: Campos de faturamento
  billing_mode: billingMode,
  billing_snapshot: billingSnapshot,

  // 🆕 NOVO: Vincular ao pacote/assinatura específico
  cliente_pacote_id: pacoteIdParaVincular || null,  // ✅ ADICIONAR
  cliente_assinatura_id: assinaturaIdParaVincular || null,  // ✅ ADICIONAR

  timeline_events: initialTimelineEvents,
  // ...
};
```

#### MESMA LÓGICA PARA ASSINATURA (linhas 1892-1930)

---

### Correção 2: Corrigir Projetos Existentes (Migration)

**Arquivo:** Criar novo script `scripts/fix-missing-cliente-pacote-fks.sql`

```sql
-- ========================================
-- Script: Corrigir FKs faltantes em projetos existentes
-- Data: 27/11/2025
-- Descrição: Preencher cliente_pacote_id e cliente_assinatura_id com base no billing_snapshot
-- ========================================

-- 1. Atualizar projetos que têm billing_mode = 'pacote'
UPDATE projects
SET cliente_pacote_id = (billing_snapshot->>'pacote_id')::uuid
WHERE billing_mode = 'pacote'
  AND billing_snapshot->>'pacote_id' IS NOT NULL
  AND billing_snapshot->>'pacote_id' != 'null'
  AND cliente_pacote_id IS NULL;

-- 2. Atualizar projetos que têm billing_mode = 'assinatura'
UPDATE projects
SET cliente_assinatura_id = (billing_snapshot->>'assinatura_id')::uuid
WHERE billing_mode = 'assinatura'
  AND billing_snapshot->>'assinatura_id' IS NOT NULL
  AND billing_snapshot->>'assinatura_id' != 'null'
  AND cliente_assinatura_id IS NULL;

-- 3. Verificar resultados
SELECT
  billing_mode,
  COUNT(*) as total,
  COUNT(cliente_pacote_id) as com_pacote_fk,
  COUNT(cliente_assinatura_id) as com_assinatura_fk,
  COUNT(*) - COUNT(cliente_pacote_id) - COUNT(cliente_assinatura_id) as sem_fk
FROM projects
WHERE billing_mode IN ('pacote', 'assinatura')
GROUP BY billing_mode;
```

---

### Correção 3: API Alternativa (Fallback)

**Arquivo:** `src/app/api/admin/cliente-pacotes/route.ts`
**Linhas:** 65-70

Adicionar **fallback** caso `cliente_pacote_id` esteja NULL:

```typescript
// Buscar projetos vinculados PRIORITARIAMENTE por FK
let { data: projetos, error: projetosError } = await supabase
  .from('projects')
  .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at, billing_snapshot')
  .eq('cliente_pacote_id', pacote.id)
  .eq('tenant_id', tenantId)
  .order('created_at', { ascending: false });

// 🆕 FALLBACK: Se não encontrou projetos pela FK, buscar pelo snapshot
if (!projetos || projetos.length === 0) {
  const { data: projetosFallback } = await supabase
    .from('projects')
    .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at, billing_snapshot')
    .eq('owner_id', pacote.user_id)
    .eq('billing_mode', 'pacote')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  // Filtrar apenas os que têm o pacote_id correto no snapshot
  projetos = (projetosFallback || []).filter(p =>
    p.billing_snapshot?.pacote_id === pacote.id
  );

  devLog.warn(`[API /admin/cliente-pacotes GET] FALLBACK usado para pacote ${pacote.id}: ${projetos.length} projetos`);
}
```

---

## 📝 CHECKLIST DE CORREÇÃO

### Implementação:
- [ ] 1. Modificar `project-actions.ts` para preencher FKs
  - [ ] Adicionar variáveis `pacoteIdParaVincular` e `assinaturaIdParaVincular`
  - [ ] Preencher essas variáveis quando pacote/assinatura for validado
  - [ ] Adicionar `cliente_pacote_id` e `cliente_assinatura_id` ao `projectData`
  - [ ] Garantir que apenas UMA das FKs seja preenchida por vez

- [ ] 2. Corrigir dados existentes (Migration)
  - [ ] Executar script SQL de migração em desenvolvimento
  - [ ] Verificar resultado da migração
  - [ ] Executar em produção

- [ ] 3. Adicionar fallback na API
  - [ ] Implementar busca alternativa por `billing_snapshot`
  - [ ] Adicionar logs de quando fallback é usado
  - [ ] Testar ambos os cenários (com e sem FK)

### Testes:
- [ ] 4. Testar criação de projeto com pacote ativo
  - [ ] Verificar se `cliente_pacote_id` foi preenchido
  - [ ] Verificar se projeto aparece na lista do pacote
  - [ ] Verificar contador do pacote

- [ ] 5. Testar criação de projeto com assinatura ativa
  - [ ] Verificar se `cliente_assinatura_id` foi preenchido
  - [ ] Verificar se projeto aparece na lista da assinatura
  - [ ] Verificar contador da assinatura

- [ ] 6. Testar fallback para avulso
  - [ ] Pacote esgotado → criar como avulso
  - [ ] Verificar que FKs ficam NULL
  - [ ] Verificar que projeto não aparece na lista do pacote

### Validação:
- [ ] 7. Verificar dados no banco de dados
  ```sql
  SELECT
    p.id,
    p.number,
    p.billing_mode,
    p.cliente_pacote_id,
    p.cliente_assinatura_id,
    p.billing_snapshot->>'pacote_id' as snapshot_pacote,
    p.billing_snapshot->>'assinatura_id' as snapshot_assinatura
  FROM projects p
  WHERE p.billing_mode IN ('pacote', 'assinatura')
  ORDER BY p.created_at DESC
  LIMIT 20;
  ```

- [ ] 8. Validar constraint de exclusividade
  ```sql
  -- Verificar que nenhum projeto tem AMBAS as FKs preenchidas
  SELECT COUNT(*)
  FROM projects
  WHERE cliente_pacote_id IS NOT NULL
    AND cliente_assinatura_id IS NOT NULL;
  -- Deve retornar 0
  ```

---

## 🔄 FLUXO CORRETO (APÓS CORREÇÃO)

### Cenário 1: Cliente com Pacote Ativo

```
1. Cliente cria projeto
     ↓
2. Validação encontra pacote ativo válido
     ↓
3. Decrementa contador: projetos_usados = 4 → 5  ✅
     ↓
4. Armazena: pacoteIdParaVincular = pacote.id  🆕
     ↓
5. Cria billing_snapshot com pacote_id  ✅
     ↓
6. Insere projeto com cliente_pacote_id = pacote.id  🆕
     ↓
7. API busca projetos: .eq('cliente_pacote_id', pacote.id)  ✅
     ↓
8. Retorna 5 projetos na interface  ✅
```

### Cenário 2: Cliente com Pacote Esgotado

```
1. Cliente cria projeto
     ↓
2. Validação encontra pacote esgotado
     ↓
3. NÃO decrementa contador (já está no limite)  ✅
     ↓
4. Muda billingMode = 'avulso'  ✅
     ↓
5. Cria snapshot com fallback_reason = 'pacote_esgotado'  ✅
     ↓
6. Insere projeto com cliente_pacote_id = NULL  🆕
     ↓
7. Projeto NÃO aparece na lista do pacote  ✅ (comportamento correto!)
     ↓
8. Contador continua "5 de 5"  ✅
```

---

## 🎯 MÉTRICAS DE SUCESSO (PÓS-CORREÇÃO)

| Métrica | Antes | Depois |
|---------|-------|--------|
| Projetos listados no pacote | 2 de 5 (40%) | 5 de 5 (100%) |
| Projetos com FK preenchida | 0% | 100% |
| Consistência contador vs lista | ❌ Falso | ✅ Verdadeiro |
| Capacidade de gerar fatura | ❌ Parcial | ✅ Completa |
| Confiança dos dados | ❌ Baixa | ✅ Alta |

---

## 🚀 PRIORIDADE DE IMPLEMENTAÇÃO

**Prioridade:** 🔴 **CRÍTICA** - Corrigir imediatamente

**Motivo:** Dados inconsistentes afetam confiança no sistema e geram relatórios incorretos

**Tempo estimado:** 60-90 minutos
- 30 min: Implementar correção no código
- 15 min: Criar e executar migration
- 15 min: Implementar fallback na API
- 20 min: Testar todos os cenários
- 10 min: Deploy e validação em produção

---

## 📎 ARQUIVOS RELACIONADOS

1. **Arquivo Principal (BUG):** `src/lib/actions/project-actions.ts`
   - Função: `createProjectClientAction()`
   - Linhas: 1786-1821 (pacote), 1892-1930 (assinatura), 1945-1981 (preparação)

2. **API de Listagem (IMPACTADA):** `src/app/api/admin/cliente-pacotes/route.ts`
   - Função: `GET`
   - Linhas: 65-70

3. **Schema SQL (REFERÊNCIA):** `scripts/add-billing-fks-to-projects.sql`
   - Define colunas `cliente_pacote_id` e `cliente_assinatura_id`
   - Constraint de exclusividade

4. **Interface Frontend (SINTOMA):** `src/app/admin/financeiro/page.tsx`
   - Linhas: 2392-2444 (renderização da tabela)
   - Mostra apenas os projetos retornados pela API

---

## 🔍 DIAGNÓSTICO ADICIONAL NECESSÁRIO

Antes de aplicar a correção, executar este diagnóstico no banco de dados:

```sql
-- Script de diagnóstico completo
-- Copie e cole no SQL Editor do Supabase

-- 1. Ver estado atual das FKs
SELECT
  'Total de projetos' as metrica,
  COUNT(*) as valor
FROM projects
UNION ALL
SELECT
  'Projetos modo pacote',
  COUNT(*)
FROM projects
WHERE billing_mode = 'pacote'
UNION ALL
SELECT
  'Projetos com cliente_pacote_id NULL',
  COUNT(*)
FROM projects
WHERE billing_mode = 'pacote' AND cliente_pacote_id IS NULL
UNION ALL
SELECT
  'Projetos com pacote_id no snapshot',
  COUNT(*)
FROM projects
WHERE billing_mode = 'pacote' AND billing_snapshot->>'pacote_id' IS NOT NULL;

-- 2. Ver pacotes e seus contadores
SELECT
  cp.id,
  u.company_name || ' - ' || pd.nome as identificacao,
  cp.projetos_inclusos,
  cp.projetos_usados,
  cp.status,
  COUNT(p.id) as projetos_vinculados_por_fk,
  cp.projetos_usados - COUNT(p.id) as diferenca
FROM cliente_pacotes cp
LEFT JOIN users u ON u.id = cp.user_id
LEFT JOIN pacotes_definicoes pd ON pd.id = cp.pacote_id
LEFT JOIN projects p ON p.cliente_pacote_id = cp.id
GROUP BY cp.id, u.company_name, pd.nome, cp.projetos_inclusos, cp.projetos_usados, cp.status
HAVING cp.projetos_usados - COUNT(p.id) > 0
ORDER BY diferenca DESC;

-- 3. Listar projetos órfãos (modo pacote mas sem FK)
SELECT
  p.id,
  p.number,
  p.nome_cliente_final,
  p.billing_mode,
  p.billing_snapshot->>'pacote_id' as pacote_no_snapshot,
  p.cliente_pacote_id,
  p.created_at
FROM projects p
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NULL
ORDER BY p.created_at DESC
LIMIT 50;
```

---

## ✍️ AUTOR DO RELATÓRIO

**Sistema:** Claude Code
**Versão:** 4.5
**Data:** 27/11/2025
**Status:** Aguardando aprovação para correção

---

## 📌 NOTAS IMPORTANTES

1. **Não deletar projetos!** Eles existem, apenas falta a FK
2. **Migration é segura:** Usa dados do `billing_snapshot` que já existem
3. **Fallback temporário:** Permite que interface funcione enquanto migração não roda
4. **Validar antes do deploy:** Testar em dev antes de produção
5. **Backup recomendado:** Fazer snapshot do banco antes da migration
