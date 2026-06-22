# Plano de Implementação — Catálogo de Equipamentos e Múltiplos Modelos

> **Status:** Planejamento  
> **Escopo:** Módulos fotovoltaicos e inversores com suporte a múltiplos modelos por projeto, alimentados por um Catálogo de Equipamentos centralizado.

---

## Visão Geral

### Problema atual
Cada projeto suporta apenas **um modelo de módulo** e **um modelo de inversor**. Os parâmetros técnicos são preenchidos manualmente toda vez, sem reaproveitamento entre projetos.

### Solução proposta
1. **Catálogo de Equipamentos** — banco de dados de módulos e inversores com todos os parâmetros técnicos, gerenciado pelo administrador.
2. **Múltiplos modelos por projeto** — cada projeto pode ter N modelos de módulo e N modelos de inversor, cada um com sua quantidade.
3. **Autocomplete inteligente** — ao digitar fabricante/modelo no Conferir Informações, o sistema busca no Catálogo e preenche todos os parâmetros automaticamente.

---

## Etapa 1 — Banco de Dados

### 1.1 Nova tabela: `equipment_catalog`

```sql
CREATE TABLE equipment_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('modulo', 'inversor')),

  -- Identificação
  fabricante TEXT NOT NULL,
  modelo TEXT NOT NULL,

  -- Módulos
  potencia_wp NUMERIC,
  voc NUMERIC,
  isc NUMERIC,
  vpmp NUMERIC,
  ipmp NUMERIC,
  eficiencia NUMERIC,
  comprimento_m NUMERIC,
  largura_m NUMERIC,
  area_unitaria_m2 NUMERIC,
  peso_kg NUMERIC,

  -- Inversores
  potencia_kw NUMERIC,
  tensao TEXT,
  vcc_max NUMERIC,
  icc_max NUMERIC,
  vpmp_max NUMERIC,
  vpmp_min NUMERIC,
  vcc_partida NUMERIC,
  faixa_tensao TEXT,
  corrente_nominal NUMERIC,
  fator_potencia TEXT,
  rendimento NUMERIC,
  dht_corrente NUMERIC,
  entradas_por_mppt INTEGER,
  quantidade_mppt INTEGER,
  potencia_max_saida NUMERIC,
  tensao_max_ca NUMERIC,
  tensao_min_ca NUMERIC,
  tipo_conexao_saida TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Novos campos JSON na tabela `projects`

Adicionar duas colunas para substituir os campos individuais atuais:

```sql
ALTER TABLE projects
  ADD COLUMN modulos_lista JSONB,    -- array de modelos de módulo
  ADD COLUMN inversores_lista JSONB; -- array de modelos de inversor
```

**Formato `modulos_lista`:**
```json
[
  {
    "catalog_id": "uuid-opcional",
    "fabricante": "JA Solar",
    "modelo": "JAM72S30-545/MR",
    "potencia_wp": "650",
    "quantidade": "12",
    "voc": "49.2",
    "isc": "13.97",
    "vpmp": "41.4",
    "ipmp": "13.38",
    "eficiencia": "20.1",
    "comprimento_m": "2.278",
    "largura_m": "1.134",
    "area_unitaria_m2": "2.583",
    "peso_kg": "32.0"
  }
]
```

**Formato `inversores_lista`:**
```json
[
  {
    "catalog_id": "uuid-opcional",
    "fabricante": "Fronius",
    "modelo": "Primo 5.0-1",
    "potencia": "5,0",
    "quantidade": "2",
    "tensao": "220",
    "vcc_max": "600",
    "icc_max": "18",
    "vpmp_max": "500",
    "vpmp_min": "200",
    "vcc_partida": "150",
    "faixa_tensao": "200-500",
    "corrente_nominal": "22.8",
    "fator_potencia": "1",
    "rendimento": "98",
    "dht_corrente": "3",
    "entradas_por_mppt": "2",
    "quantidade_mppt": "2",
    "potencia_max_saida": "5,0",
    "tensao_max_ca": "253",
    "tensao_min_ca": "180",
    "tipo_conexao_saida": "Monofásico"
  }
]
```

> **Compatibilidade:** Os campos antigos (`modulos_fabricante`, `inversores_fabricante`, etc.) são mantidos no banco durante a transição. A leitura prioriza `modulos_lista`/`inversores_lista` se presentes, senão cai para os campos antigos (fallback).

---

## Etapa 2 — Catálogo de Equipamentos (nova página admin)

### 2.1 Rota
`/admin/catalogo-equipamentos`

### 2.2 Arquivos a criar
- `src/app/admin/catalogo-equipamentos/page.tsx` — página principal
- `src/components/admin/CatalogoEquipamentos.tsx` — componente principal (tabs Módulos / Inversores)
- `src/components/admin/CatalogoEquipamentoModal.tsx` — modal de cadastro/edição
- `src/app/api/admin/equipment-catalog/route.ts` — GET (listar) + POST (criar)
- `src/app/api/admin/equipment-catalog/[id]/route.ts` — PUT (editar) + DELETE (excluir)
- `src/lib/services/equipmentCatalogService.ts` — serviço de acesso ao banco

### 2.3 Interface
- Duas abas: **Módulos** e **Inversores**
- Tabela com: Fabricante, Modelo, Potência, Ações (editar/excluir)
- Botão **+ Novo equipamento**
- Modal com todos os campos do `equipment_catalog` divididos em seções
- Busca/filtro por fabricante e modelo

---

## Etapa 3 — Conferir Informações: lista de modelos com autocomplete

### 3.1 Novos componentes
- `src/components/modals/EquipamentoListEditor.tsx` — lista expansível de equipamentos (reutilizável para módulos e inversores)
- `src/components/modals/EquipamentoListItem.tsx` — item individual com todos os campos e autocomplete

### 3.2 Comportamento do autocomplete
- Campo "Fabricante" dispara busca no catálogo após 2 caracteres
- Selecionar um resultado preenche todos os campos do modelo automaticamente
- Se não encontrar, o usuário preenche manualmente
- Botão **"Salvar no Catálogo"** ao final do item manual para cadastrar o novo equipamento

### 3.3 Estrutura visual no modal

```
┌─ Módulos Fotovoltaicos ──────────────────────────────────────┐
│                                                               │
│  ▼  Modelo 1                                  [remover]      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Fabricante: [ JA Solar ▼ ]  Modelo: [ JAM72S30 ▼ ]    │  │
│  │ Potência Wp: [650]  Quantidade: [12]                   │  │
│  │ ▶ Parâmetros elétricos (Voc, Isc, Vpmp, Ipmp...)      │  │
│  │ ▶ Parâmetros físicos (dimensões, peso, eficiência...)  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ▶  Modelo 2 — Canadian Solar / CS6W / 600 Wp × 6 un        │
│                                                               │
│  + Adicionar modelo de módulo                                 │
└───────────────────────────────────────────────────────────────┘
```

### 3.4 Endpoint de busca no catálogo
`GET /api/admin/equipment-catalog?tipo=modulo&q=ja+solar`  
Retorna lista filtrada para o autocomplete.

### 3.5 Salvamento
O `PUT /api/projects/[id]/conferir-info` já existente passa a aceitar também `modulos_lista` e `inversores_lista` como campos válidos.

---

## Etapa 4 — Adaptação dos documentos gerados

Esta é a etapa mais extensa. Todos os templates precisam ser atualizados para ler os novos campos JSON e calcular totais corretamente.

### 4.1 Lógica de leitura (helper reutilizável)

Criar `src/lib/utils/equipmentParser.ts`:

```typescript
// Retorna o primeiro modelo (para campos que só mostram 1 modelo)
export function getPrimaryModulo(pd): ModuloItem | null

// Retorna o primeiro inversor
export function getPrimaryInversor(pd): InversorItem | null

// Retorna todos os módulos (com fallback para campos antigos)
export function getAllModulos(pd): ModuloItem[]

// Retorna todos os inversores
export function getAllInversores(pd): InversorItem[]

// Potência de pico total (soma de kWp × qtd de todos os modelos)
export function getTotalKwp(pd): number

// Potência nominal total dos inversores (soma de kW × qtd de todos os modelos)
export function getTotalInversorKw(pd): number

// Quantidade total de módulos
export function getTotalModulosQtd(pd): number

// Quantidade total de inversores
export function getTotalInversoresQtd(pd): number
```

### 4.2 Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `FormularioSolicitacaoPreview.tsx` | Total inversores usa `getTotalInversorKw()` |
| `FormularioSolicitacaoPDF.tsx` | Idem; tabela de geradores lista todos os modelos |
| `MemorialDescritivoPreview.tsx` | Seção módulos e inversores lista todos os modelos |
| `MemorialDescritivoPDF.tsx` | Idem; texto descritivo descreve todos os modelos |
| `DiagramaBlocosPreview.tsx` | Bloco de módulos e bloco de inversor refletem todos |
| `DiagramaBlocosPDF.tsx` | Idem |
| `DiagramaUnifilarPreview.tsx` | Parâmetros elétricos de todos os modelos |
| `DiagramaUnifilarPDF.tsx` | Idem |
| `AnexoECPFLPreview.tsx` | Tabela de equipamentos lista todos |
| `AnexoFCPFLPreview.tsx` | Idem |

### 4.3 Regras de exibição por documento

**Formulário de Solicitação de Acesso**
- Campo "Potência Geração do Orçamento" = `min(getTotalKwp(), getTotalInversorKw())`
- Tabela de geradores: uma linha por modelo de módulo (com sua quantidade individual)
- Tabela de inversores: uma linha por modelo de inversor (com sua quantidade individual)

**Memorial Descritivo**
- Texto descritivo: citar todos os modelos (ex: "12 módulos JA Solar 650 Wp e 6 módulos Canadian Solar 600 Wp")
- Tabela de dimensionamento de módulos: uma seção por modelo
- Tabela de dimensionamento de inversores: uma seção por modelo

**Diagrama de Blocos**
- Bloco de módulos: lista todos os modelos e totais
- Bloco de inversor: lista todos os modelos

**Diagrama Unifilar**
- Parâmetros do primeiro modelo (principal) para o diagrama elétrico
- Se houver múltiplos: indicar no rodapé

---

## Etapa 5 — Migração de dados existentes

Para projetos já cadastrados com os campos antigos, criar script de migração que converte os campos individuais para o novo formato de array:

```typescript
// Para cada projeto com modulos_fabricante preenchido e modulos_lista vazio:
// → Criar modulos_lista = [{ fabricante, modelo, potencia_wp, quantidade, ... }]
// → Mantém campos antigos intactos (não deleta)
```

A migração pode ser executada via rota de admin: `POST /api/admin/migrate-equipment-lists`

---

## Resumo de arquivos a criar/modificar

### Novos arquivos
- `supabase/migrations/XXXXXXXX_add_equipment_catalog.sql`
- `src/app/admin/catalogo-equipamentos/page.tsx`
- `src/components/admin/CatalogoEquipamentos.tsx`
- `src/components/admin/CatalogoEquipamentoModal.tsx`
- `src/components/modals/EquipamentoListEditor.tsx`
- `src/components/modals/EquipamentoListItem.tsx`
- `src/app/api/admin/equipment-catalog/route.ts`
- `src/app/api/admin/equipment-catalog/[id]/route.ts`
- `src/lib/services/equipmentCatalogService.ts`
- `src/lib/utils/equipmentParser.ts`
- `src/app/api/admin/migrate-equipment-lists/route.ts`

### Arquivos a modificar
- `src/components/modals/ConferirInformacoesModal.tsx`
- `src/app/api/projects/[id]/conferir-info/route.ts`
- `src/components/templates/FormularioSolicitacaoPreview.tsx`
- `src/components/templates/FormularioSolicitacaoPDF.tsx`
- `src/components/templates/MemorialDescritivoPreview.tsx`
- `src/components/templates/MemorialDescritivoPDF.tsx`
- `src/components/templates/DiagramaBlocosPreview.tsx`
- `src/components/templates/DiagramaBlocosPDF.tsx`
- `src/components/templates/DiagramaUnifilarPreview.tsx`
- `src/components/templates/DiagramaUnifilarPDF.tsx`
- `src/components/templates/AnexoECPFLPreview.tsx`
- `src/components/templates/AnexoFCPFLPreview.tsx`
- `src/app/admin/layout.tsx` ou equivalente (menu lateral — novo item)
- `src/types/project.ts` (novos tipos)

---

## Ordem de execução recomendada

1. **Migração SQL** — criar tabela `equipment_catalog` e colunas `modulos_lista`/`inversores_lista`
2. **`equipmentParser.ts`** — helper com fallback para campos antigos (garante que nada quebra)
3. **Catálogo de Equipamentos** — página admin + API CRUD
4. **`EquipamentoListEditor`** — componente da lista no modal
5. **Conferir Informações** — integrar o novo componente + autocomplete
6. **Templates dos documentos** — substituir leitura dos campos antigos pelo helper
7. **Script de migração** — converter projetos existentes para o novo formato
8. **Deploy e validação**
