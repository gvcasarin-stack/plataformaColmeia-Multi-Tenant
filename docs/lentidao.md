# Plano de Ação — Lentidão em `/admin/projetos`

## Diagnóstico

A página `/admin/projetos` pode demorar 15–20 segundos para carregar. A investigação identificou as seguintes causas raiz:

---

### Causa 1 (CRÍTICA) — `SELECT *` carregando colunas JSONB pesadas

**Arquivo:** `src/lib/services/projectService/supabase.ts` — função `getProjectsWithFilters` (linha ~344)

A query usa `SELECT *`, o que inclui cinco colunas JSONB que **não são usadas no Kanban ou na tabela de projetos**:

| Coluna | Conteúdo | Tamanho estimado por projeto |
|---|---|---|
| `timeline_events` | Array de todos os eventos, comentários e documentos | 50–500 KB |
| `documents` | Lista de documentos anexados | 10–100 KB |
| `files` | Lista de arquivos | 10–100 KB |
| `comments` | Comentários | 10–50 KB |
| `history` | Histórico de alterações | 10–100 KB |

Com 100–300 projetos e `limit: 1000`, o volume total transferido do banco pode chegar a dezenas de MB por request. Esses dados só são necessários quando o usuário **abre** um projeto específico.

**Código atual (linha ~344–353):**
```typescript
let query = supabase
  .from('projects')
  .select(`
    *,
    owner:users!owner_id (
      id,
      name,
      company_name
    )
  `)
```

---

### Causa 2 — Fetch duplicado de `/api/admin/team-members`

A lista de membros da equipe é buscada em dois lugares distintos:

- `src/app/admin/projetos/page.tsx` — `useEffect` para o filtro de responsável
- `src/components/kanban/KanbanBoard.tsx` — `useEffect` para o diálogo de assumir responsabilidade

Isso gera duas requisições HTTP idênticas toda vez que a página carrega.

---

### Causa 3 — Fetches sequenciais na inicialização

Em `page.tsx`, a inicialização segue esta ordem sequencial:

1. `user?.id` disponível → dispara `useEffect` com `init()`
2. `init()` chama `/api/tenant/organization` → aguarda resposta
3. Só depois: carrega preferências salvas (`getProjectFilters`)
4. Em paralelo (outro `useEffect`): chama `/api/admin/team-members`
5. Em paralelo (hook `useProjects`): `getProjectsForUserAction` → `getProjectsWithFilters`

Os steps 2–3 são sequenciais (um espera o outro), mas poderiam ser paralelos.

---

### Causa 4 — KanbanBoard recarrega títulos das colunas após montar

`KanbanBoard.tsx` chama `reloadColumnTitles()` dentro de um `useEffect` no momento da montagem, adicionando mais uma requisição ao banco logo após o carregamento inicial.

---

### Causa 5 — Busca textual percorre `timelineEvents` de todos os projetos

Em `filteredProjects` (`page.tsx` linha ~226), cada keystroke (com 300ms debounce) faz um `.some()` em `timelineEvents` de todos os projetos carregados. Com 200 projetos e 50 eventos cada, isso é 10.000 iterações por keystroke no thread da UI.

---

## Plano de Ação

### Etapa 1 — Substituir `SELECT *` por colunas explícitas (impacto máximo)

**Arquivo:** `src/lib/services/projectService/supabase.ts` — função `getProjectsWithFilters`

Substituir o `select('*')` por uma lista explícita que **exclui** as cinco colunas JSONB pesadas. As colunas excluídas só serão buscadas quando o usuário abrir um projeto específico (Etapa 2).

**Query proposta:**
```typescript
let query = supabase
  .from('projects')
  .select(`
    id,
    created_by,
    owner_id,
    number,
    nome_cliente_final,
    empresa_integradora,
    distribuidora,
    potencia,
    data_entrega,
    status,
    prioridade,
    valor_projeto,
    pagamento,
    cpf_cnpj_cliente_final,
    endereco_local,
    numero_uc,
    client_city,
    client_state,
    havera_beneficiarias,
    lista_materiais,
    disjuntor_padrao_entrada,
    tipo_conexao,
    tipo_ramal,
    tensao_atendimento,
    coord_utm_fuso,
    coord_utm_x,
    coord_utm_y,
    modulos_quantidade,
    modulos_fabricante,
    modulos_modelo,
    modulos_potencia_wp,
    inversores_quantidade,
    inversores_fabricante,
    inversores_modelo,
    inversores_potencia,
    inversores_tensao,
    conta_contrato,
    classe_uc,
    numero_poste_transformador,
    numero_condutores_fase,
    secao_fase_mm2,
    secao_neutro_mm2,
    disjuntor_polos,
    disjuntor_corrente_a,
    disjuntor_tensao_v,
    tipo_fornecimento,
    modalidade_compensacao,
    planta_situacao_url,
    planta_situacao_config,
    caixa_medicao_id,
    caixa_medicao_imagem_url,
    caixa_medicao_nome,
    caixa_medicao_comprimento_mm,
    caixa_medicao_altura_mm,
    caixa_medicao_largura_mm,
    responsavel_nome,
    responsavel_profissao,
    responsavel_registro,
    data_documento,
    secao_aterramento_mm2,
    setup_padrao_entrada,
    setup_quadro_cc,
    setup_mais_de_um_inversor,
    setup_tipo_inversor,
    setup_total_inversores,
    setup_configuracao_saidas,
    setup_tipo_transformador,
    setup_potencia_transformador,
    setup_concluido,
    billing_mode,
    billing_snapshot,
    created_at,
    updated_at,
    admin_responsible_id,
    admin_responsible_name,
    admin_responsible_email,
    admin_responsible_phone,
    last_update_by,
    status_changed_at,
    sla_expires_at,
    sla_expired,
    deleted_at,
    tenant_id,
    owner:users!owner_id (
      id,
      name,
      company_name
    )
  `)
```

No mapeamento (linha ~413), os campos ausentes passam a retornar arrays vazios por padrão — o que já acontece hoje via `|| []`:
```typescript
timelineEvents: item.timeline_events || [],  // [] quando não carregado
documents: item.documents || [],
files: item.files || [],
comments: item.comments || [],
history: item.history || [],
```

Isso é seguro porque esses campos já não são usados no Kanban nem na tabela de projetos.

---

### Etapa 2 — Carregar dados pesados sob demanda (lazy loading)

**Arquivo:** `src/app/components/expanded-project-view.tsx`

Ao abrir a visão expandida de um projeto, buscar os dados completos (com JSONB) via uma nova função ou rota.

**Opção A — Nova Server Action:**
```typescript
// src/lib/actions/project-actions.ts
export async function getProjectFullDataAction(projectId: string): Promise<{
  timelineEvents: any[];
  documents: any[];
  files: any[];
  comments: any[];
  history: any[];
} | null>
```
Faz `SELECT id, timeline_events, documents, files, comments, history` por ID.

**Opção B — Reutilizar `getProjectById`** (já existente) que usa `SELECT *`.

**No componente** (`expanded-project-view.tsx`):
```typescript
const [fullData, setFullData] = useState<FullProjectData | null>(null);
const [loadingFullData, setLoadingFullData] = useState(true);

useEffect(() => {
  getProjectFullDataAction(project.id).then(data => {
    if (data) setFullData(data);
    setLoadingFullData(false);
  });
}, [project.id]);
```

Enquanto carrega: exibir skeleton/spinner apenas na aba "Linha do Tempo". As abas "Visão Geral" e "Editar" não dependem dos dados pesados e abrem imediatamente.

---

### Etapa 3 — Eliminar fetch duplicado de team-members

**Arquivos:** `src/app/admin/projetos/page.tsx` e `src/components/kanban/KanbanBoard.tsx`

1. `page.tsx` já busca `teamMembers` — passar como prop para `KanbanBoard`:
   ```tsx
   <KanbanBoard
     ...
     teamMembers={teamMembers}
   />
   ```
2. Em `KanbanBoard.tsx`, remover o `useEffect` que faz `fetch('/api/admin/team-members')` e usar a prop recebida.

**Atenção:** verificar a interface de props de `KanbanBoard` antes de adicionar a prop.

---

### Etapa 4 — Remover busca em `timelineEvents` do filtro principal

**Arquivo:** `src/app/admin/projetos/page.tsx` — `filteredProjects` useMemo

Com a Etapa 1, `timelineEvents` estará vazio na lista. Remover o trecho:
```typescript
// REMOVER:
const matchesTimeline = project.timelineEvents?.some(event =>
  typeof event.content === 'string' && event.content.toLowerCase().includes(searchLower)
);

return matchesBasicFields || matchesMaterials || matchesTimeline;
// SUBSTITUIR POR:
return matchesBasicFields || matchesMaterials;
```

---

### Etapa 5 — Índice de banco de dados (opcional, executar no Supabase)

Se o volume de projetos crescer (>500), adicionar índice composto:

```sql
CREATE INDEX IF NOT EXISTS idx_projects_tenant_deleted
  ON projects (tenant_id, deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_updated_at
  ON projects (updated_at DESC);
```

Executar no SQL Editor do Supabase. Não afeta o código.

---

## Impacto Esperado

| Otimização | Redução estimada |
|---|---|
| Etapa 1 — SELECT explícito | 70–90% do volume de dados transferidos |
| Etapa 2 — Lazy loading | Carregamento da lista não bloqueia mais nos dados pesados |
| Etapa 3 — Sem fetch duplicado | 1 requisição a menos na carga inicial |
| Etapa 4 — Sem loop de timeline | Busca textual ~10x mais rápida no cliente |

Tempo esperado após implementação: **2–4 segundos** (de 15–20s).

---

## Ordem de Implementação

1. **Etapa 1** (maior impacto, risco controlado) — modificar apenas a query SELECT
2. **Etapa 2** (complementar) — lazy loading da visão expandida
3. **Etapa 3** (simples) — eliminar fetch duplicado
4. **Etapa 4** (consequência da Etapa 1) — ajustar filtro de busca
5. **Etapa 5** (banco) — executar SQL separadamente

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Visão expandida abre sem timeline | Etapa 2 resolve — skeleton enquanto carrega |
| Busca em comentários para de funcionar | Comportamento aceito; busca nos campos principais permanece |
| Colunas novas adicionadas no futuro quebram a lista explícita | Adicionar coluna nova à lista de SELECT ao criar |
| `getProjectsByUserId` (clientes) ainda usa `SELECT *` | Clientes têm muito menos projetos — impacto menor; pode ser otimizado depois |
