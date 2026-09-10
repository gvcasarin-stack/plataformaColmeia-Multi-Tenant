# Pipelines — Plano de Implementação

## Visão Geral

Transformar o sistema de projetos de um único pipeline fixo para múltiplos pipelines configuráveis por tenant, onde cada pipeline define suas próprias colunas de Kanban e seu próprio formulário de solicitação de projeto.

Inspiração: modelo Trello/Jira — boards independentes com colunas e formulários customizados.

**Casos de uso:**
- Pipeline "Projetos Fotovoltaicos" → colunas e formulário específicos de FV
- Pipeline "Projetos de Subestação" → colunas e formulário próprios
- Pipeline "Serviços de Manutenção" → fluxo completamente diferente
- Qualquer setor interno que precise de um Kanban próprio

---

## Templates Pré-Prontos

Ao criar um novo pipeline, o tenant não começa do zero — escolhe um template como ponto de partida e personaliza a partir dele.

### Templates disponíveis

| Template | Descrição |
|----------|-----------|
| **Projetos Fotovoltaicos** | Fluxo padrão de homologação FV (etapas atuais da plataforma) |
| **Manutenção e Assistência Técnica** | Abertura → Diagnóstico → Em Execução → Aguardando Peças → Concluído |
| **Projetos de Subestação** | Estudo → Projeto → Aprovação → Execução → Comissionamento → Entregue |
| **Projetos Elétricos Gerais** | Levantamento → Projeto → Aprovação → Execução → Entregue |
| **Personalizado** | Começa com uma coluna em branco, o admin monta do zero |

Os templates são definidos no código (não no banco) — são apenas dados iniciais que populam as colunas ao criar o pipeline. Após a criação, o tenant pode editar, reordenar ou excluir qualquer coluna livremente.

### Template "Projetos Fotovoltaicos" — colunas padrão
Exatamente as etapas atuais da plataforma, garantindo zero impacto na migração:
1. Não Iniciado
2. Em Desenvolvimento
3. Aguardando Assinaturas
4. Em Homologação
5. Projeto Aprovado
6. Aguardando Solicitar Vistoria
7. Projeto Pausado
8. Em Vistoria
9. Finalizado
10. Cancelado

---

## Configuração via Preferências

Toda a gestão de pipelines fica centralizada em **Preferências → Pipelines**, acessível para `admin`, `owner` e `superadmin`.

### O que o admin pode fazer nessa tela

**Visão geral dos pipelines:**
- Listar todos os pipelines do tenant com nome, ícone, cor e quantidade de projetos
- Definir qual é o pipeline padrão (carregado automaticamente no Kanban)
- Ativar / desativar pipelines sem excluir
- Reordenar pipelines por drag-and-drop

**Dentro de cada pipeline — aba Colunas:**
- Visualizar todas as colunas na ordem atual
- Arrastar para reordenar (refletido imediatamente no Kanban)
- Editar nome e cor de cada coluna
- Adicionar nova coluna (nome + cor)
- Excluir coluna (com aviso se houver projetos nela)

**Dentro de cada pipeline — aba Formulário:**
- Listar campos customizados do formulário de solicitação
- Adicionar campo: label, tipo, placeholder, obrigatório, opções (para select)
- Reordenar campos por drag-and-drop
- Excluir campo (dados já salvos em projetos existentes são mantidos no JSONB)

**Criação de novo pipeline:**
- Nome + ícone + cor
- Seleção de template pré-pronto
- Colunas carregadas automaticamente a partir do template, já editáveis

---

## Arquitetura de Banco de Dados

### Novas tabelas

```sql
-- Pipelines do tenant
CREATE TABLE pipelines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  descricao    TEXT,
  icone        TEXT,         -- ex: "Zap", "Battery", "Building2" (Lucide)
  cor          TEXT,         -- ex: "#f59e0b"
  is_default   BOOLEAN DEFAULT FALSE,
  ativo        BOOLEAN DEFAULT TRUE,
  posicao      INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Colunas de cada pipeline (equivalente às etapas do Kanban)
CREATE TABLE pipeline_columns (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id  UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  slug         TEXT NOT NULL,    -- gerado automaticamente a partir do nome
  cor          TEXT DEFAULT '#6b7280',
  posicao      INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Campos customizados do formulário de solicitação por pipeline
CREATE TABLE pipeline_form_fields (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id  UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  tipo         TEXT NOT NULL,    -- 'text' | 'number' | 'select' | 'date' | 'textarea' | 'boolean'
  opcoes       JSONB,            -- para tipo 'select': ["Opção A", "Opção B"]
  obrigatorio  BOOLEAN DEFAULT FALSE,
  posicao      INTEGER NOT NULL,
  placeholder  TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

### Alteração na tabela `projects`

```sql
-- pipeline ao qual o projeto pertence
ALTER TABLE projects ADD COLUMN pipeline_id UUID REFERENCES pipelines(id);

-- respostas dos campos customizados do formulário
ALTER TABLE projects ADD COLUMN dados_pipeline JSONB DEFAULT '{}';

-- após migração completa, tornar pipeline_id obrigatório
-- ALTER TABLE projects ALTER COLUMN pipeline_id SET NOT NULL;
```

O campo `status` existente continua como slug de texto — passa a referenciar o slug de uma `pipeline_column` do pipeline ao qual o projeto pertence.

---

## Campos Fixos vs. Campos Customizáveis

### Campos fixos (presentes em todos os projetos, independente do pipeline)
- Nome do projeto
- Cliente (vínculo com a tabela de clientes)
- Endereço / Localização
- Responsável técnico
- Data de início / prazo estimado
- Observações gerais

### Campos customizáveis (definidos por pipeline via `pipeline_form_fields`)
Exemplos para Pipeline FV:
- Potência estimada do sistema (kWp)
- Distribuidora
- Tipo de ligação (monofásica / bifásica / trifásica)
- Tipo de telhado
- Número de módulos

Exemplos para Pipeline Subestação:
- Tensão de operação
- Capacidade (MVA)
- Norma aplicável
- Tipo de proteção

---

## Migração dos Dados Existentes

### Estratégia: pipeline padrão automático por tenant

1. Para cada tenant que já possui projetos, criar automaticamente um pipeline **"Projetos Fotovoltaicos"** com `is_default = true`, usando o template FV
2. Criar as colunas a partir das etapas atuais hardcoded (mesmos slugs)
3. Associar todos os projetos existentes ao pipeline padrão (`pipeline_id = <id>`)
4. Nenhum dado é perdido — o `status` atual já corresponde aos slugs das colunas

A migração roda via rota `/api/admin/pipelines/migrate` e é idempotente (pode ser executada mais de uma vez sem duplicar dados).

---

## Plano de Implementação por Etapas

### Etapa 1 — Banco de dados e migração
- Criar as tabelas `pipelines`, `pipeline_columns`, `pipeline_form_fields`
- Adicionar `pipeline_id` e `dados_pipeline` à tabela `projects`
- RLS policies para as novas tabelas (filtro por `tenant_id`)
- Rota de migração que cria o pipeline FV padrão por tenant e associa projetos existentes

### Etapa 2 — Serviço e API de pipelines
- `pipelineService.ts` com CRUD completo
- Definição dos templates pré-prontos no código (`PIPELINE_TEMPLATES`)
- API routes:
  - `/api/admin/pipelines` (GET, POST)
  - `/api/admin/pipelines/[id]` (GET, PUT, DELETE)
  - `/api/admin/pipelines/[id]/columns` (GET, POST, PUT, DELETE, reorder)
  - `/api/admin/pipelines/[id]/form-fields` (GET, POST, PUT, DELETE, reorder)
  - `/api/admin/pipelines/migrate` (POST — migração dos tenants existentes)

### Etapa 3 — Kanban dinâmico
- Kanban carrega colunas a partir do pipeline selecionado (não mais hardcoded)
- Seletor de pipeline no topo da página de projetos
- Pipeline padrão selecionado automaticamente ao entrar
- Projetos filtrados pelo pipeline ativo
- Métricas globais mantidas + filtro por pipeline opcional no painel

### Etapa 4 — Preferências → Pipelines
- Página `/admin/preferencias/pipelines` (ou aba dentro de Configurações):
  - Listagem com drag-and-drop para reordenar pipelines
  - Criação com seleção de template pré-pronto
  - Edição de colunas: reordenar, renomear, adicionar, excluir
  - Edição de campos do formulário: tipos, obrigatório, opções
- Acessível apenas para `admin`, `owner`, `superadmin`

### Etapa 5 — Formulário de solicitação dinâmico
- Modal de novo projeto renderiza campos fixos + campos customizados do pipeline
- Respostas salvas em `projects.dados_pipeline` (JSONB)
- Validação de obrigatoriedade conforme configuração do pipeline
- Cliente vê o formulário do pipeline selecionado

### Etapa 6 — Ajustes em métricas e painel
- Painel admin: seletor de pipeline para filtrar métricas
- Métricas globais continuam disponíveis como padrão
- Timeline e histórico de status continuam funcionando

---

## Riscos e Pontos de Atenção

| Risco | Mitigação |
|-------|-----------|
| Projetos existentes sem `pipeline_id` quebrarem o Kanban | Migração cria pipeline padrão antes de qualquer outra mudança; `pipeline_id` nullable na transição |
| Slugs de status desalinhados entre pipelines | Cada pipeline tem seus próprios slugs; slug é único dentro do contexto do pipeline |
| Templates de documentos vinculados a etapas hardcoded | Manter compatibilidade com slugs atuais; futuramente vincular templates à `pipeline_column_id` |
| Exclusão de coluna com projetos ativos | Bloquear exclusão ou exigir reatribuição dos projetos antes |
| Clientes com acesso a múltiplos pipelines | Fase 1: cliente vê todos os pipelines ativos do tenant; fase 2: controle granular por pipeline |
| Performance: colunas carregadas dinamicamente | Cache client-side por pipeline; volume pequeno por tenant |

---

## Estimativa de Complexidade

| Etapa | Complexidade | Dependências |
|-------|-------------|--------------|
| 1 — Banco + migração | Média | Nenhuma |
| 2 — Serviço + API | Média | Etapa 1 |
| 3 — Kanban dinâmico | Alta | Etapas 1, 2 |
| 4 — Preferências / UI de configuração | Alta | Etapas 1, 2 |
| 5 — Formulário dinâmico | Alta | Etapas 2, 4 |
| 6 — Métricas | Baixa | Etapa 3 |

**Ordem recomendada:** 1 → 2 → 3 → 4 → 5 → 6

O Kanban dinâmico (Etapa 3) vem antes da UI de configuração (Etapa 4) porque valida toda a arquitetura de dados com resultado visível imediato — e os tenants existentes já têm o pipeline padrão criado pela migração, então o Kanban já funciona sem a UI de configuração estar pronta.

---

## Decisões Pendentes — Pontos para Revisar na Hora de Implementar

Estes pontos ainda não foram decididos e precisam de definição antes ou durante a implementação das etapas correspondentes.

### SLA por coluna
A plataforma já possui rastreamento de SLA no Kanban. Com pipelines dinâmicos, o SLA precisará ser configurável por coluna dentro de cada pipeline — cada etapa pode ter um prazo esperado diferente, e isso varia muito entre um pipeline FV (dias) e um de manutenção (horas).

**Decisão necessária:** o SLA por coluna é configurado pelo admin do tenant na tela de Preferências, ou é um valor fixo por tipo de pipeline definido na plataforma?

---

### Notificações por coluna
Hoje as notificações de mudança de etapa são genéricas. Com pipelines customizados, faz sentido permitir configurar por coluna quais notificações disparam automaticamente.

Exemplo: "ao entrar na coluna Aguardando Assinaturas, notificar o cliente por e-mail automaticamente".

**Decisão necessária:** notificações por coluna são configuráveis pelo admin do tenant, ou seguem regras fixas da plataforma? Quais eventos disparam notificação por padrão em colunas sem configuração?

---

### Templates de documentos por pipeline
Dado o trabalho já feito no catálogo de equipamentos e nos templates de documentos, cada pipeline poderia ter seu próprio conjunto de documentos geráveis. Um pipeline de subestação não precisa de Diagrama Unifilar FV; um pipeline de manutenção pode ter um relatório de visita técnica.

**Decisão necessária:** os templates de documentos são vinculados ao pipeline ou permanecem globais por tenant? A vinculação seria obrigatória ou opcional por template?

---

### Limites de pipelines por plano de billing
O número de pipelines disponíveis é um diferencial natural entre planos — 1 pipeline no básico, ilimitados no premium, por exemplo. Vale modelar esse controle junto com a Etapa 1 para não precisar fazer ajustes no banco depois.

**Decisão necessária:** quais são os limites por plano? O controle de limite é verificado no backend (API retorna erro) ou bloqueado antecipadamente na UI?

---

### Visibilidade do pipeline no portal do cliente
O portal do cliente hoje mostra projetos de forma unificada. Com múltiplos pipelines, é necessário definir o que o cliente enxerga.

**Opções:**
- Cliente vê todos os pipelines em que tem projetos, com separação visual por pipeline
- Cliente vê uma lista unificada de projetos independente do pipeline (comportamento atual mantido)
- Admin pode configurar por pipeline se ele é visível ou não para o cliente

**Decisão necessária:** qual das opções acima, ou combinação delas?
