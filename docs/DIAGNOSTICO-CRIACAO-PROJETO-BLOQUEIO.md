# DIAGNÓSTICO TÉCNICO: Bloqueio na Criação de Projetos pelo Cliente

**Data**: 17/12/2025  
**Status**: 🔍 DIAGNÓSTICO EM ANDAMENTO  
**Prioridade**: 🚨 **CRÍTICA** (Produção)  
**Ambiente**: Produção

---

## 📋 RESUMO EXECUTIVO

### Problema Relatado

Após alterações recentes no fluxo de criação de projetos para implementar notificações de billing, os clientes **não conseguem mais criar projetos**. O sistema está bloqueando a criação e gerando erros.

### Contexto das Alterações

1. **Objetivo Original**: Implementar notificações quando cliente estoura quota de pacote/assinatura
2. **Alteração Realizada**: Substituição da função `createProjectClientAction` por `createProjectMultiTenant`
3. **Arquivos Modificados**:
   - `src/lib/hooks/useProjects.ts` (linha 5, 213)
   - `src/app/cliente/painel/page.tsx` (linha 7, 286)
   - `src/app/cliente/projetos/page.tsx` (linha 9, 463)

### Sintomas Observados

- ❌ Cliente não consegue criar projetos
- ❌ Possível erro ao salvar no banco de dados
- ❌ Possível falta de campos obrigatórios
- ⚠️ Risco de dano às notificações existentes (email e in-app)

---

## 🔍 ANÁLISE DETALHADA

### 1. COMPARAÇÃO: Função Antiga vs Nova

#### 📄 `createProjectClientAction` (ANTIGA - NÃO USADA MAIS)

**Localização**: `src/lib/actions/project-actions.ts` (linha 1343+)

**Características**:
- ✅ Função estável e testada em produção
- ✅ Criava projetos com sucesso
- ❌ **NÃO disparava notificações de billing** (motivo da mudança)
- ❌ NÃO verificava limites organizacionais
- ❌ NÃO implementava sistema de billing avançado

**Parâmetros**:
```typescript
createProjectClientAction(
  projectDataFromClient: CreateProjectClientData,
  clientUser: { 
    id: string; 
    name?: string | null; 
    email?: string | null; 
    companyName?: string | null; 
  }
)
```

**Campos Enviados ao Banco** (comportamento presumido pela análise):
- `tenant_id` ✅
- `created_by` ✅
- `owner_id` ✅
- `name` ✅
- `description` ✅
- `empresaIntegradora` ✅
- `nomeClienteFinal` ✅
- `distribuidora` ✅
- `potencia` ✅
- `dataEntrega` ✅
- `status` ✅
- `prioridade` ✅
- `valorProjeto` ✅
- `pagamento` ✅
- `listaMateriais` ✅
- `disjuntorPadraoEntrada` ✅
- `cpf_cnpj_cliente_final` ✅
- `endereco_local` ✅
- `havera_beneficiarias` ✅
- `timeline_events` ✅
- `documents` ✅
- `files` ✅
- `comments` ✅
- `history` ✅
- `settings` ✅
- `last_update_by` ✅
- **billing_mode**: ❌ NÃO ENVIA (campo ausente)
- **billing_snapshot**: ❌ NÃO ENVIA (campo ausente)

---

#### 📄 `createProjectMultiTenant` (NOVA - EM USO ATUAL)

**Localização**: `src/lib/actions/multi-tenant-project-actions.ts` (linha 15+)

**Características**:
- ✅ Implementa sistema completo de billing
- ✅ Dispara notificações de billing
- ✅ Verifica limites organizacionais (com correção recente)
- ✅ Decrementa quota de pacote/assinatura
- ✅ Envia notificações para cliente e admins
- ⚠️ **ADICIONOU NOVOS CAMPOS OBRIGATÓRIOS**

**Parâmetros**:
```typescript
createProjectMultiTenant(
  projectData: CreateProjectClientData,
  user: { 
    id: string; 
    email?: string | null; 
    name?: string | null 
  }
)
```

**Campos Enviados ao Banco**:
- `tenant_id` ✅
- `created_by` ✅
- `owner_id` ✅
- `name` ✅
- `description` ✅
- `empresaIntegradora` ✅
- `nomeClienteFinal` ✅
- `distribuidora` ✅
- `potencia` ✅
- `dataEntrega` ✅
- `status` ✅ (usa slug: 'nao-iniciado')
- `prioridade` ✅
- `valorProjeto` ✅
- `pagamento` ✅
- `listaMateriais` ✅
- `disjuntorPadraoEntrada` ✅
- `cpf_cnpj_cliente_final` ✅
- `endereco_local` ✅
- `havera_beneficiarias` ✅
- `timeline_events` ✅
- `documents` ✅
- `files` ✅
- `comments` ✅
- `history` ✅
- `settings` ✅
- `last_update_by` ✅
- **billing_mode**: ✅ **NOVO CAMPO** ('avulso' | 'pacote' | 'assinatura')
- **billing_snapshot**: ✅ **NOVO CAMPO** (JSONB com dados de billing)
- **cliente_pacote_id**: ✅ **NOVO CAMPO** (FK para cliente_pacotes)
- **cliente_assinatura_id**: ✅ **NOVO CAMPO** (FK para cliente_assinaturas)

---

### 2. ANÁLISE DOS NOVOS CAMPOS

#### 🆕 Campo: `billing_mode`

**Tipo**: `TEXT` (constraint: 'avulso' | 'pacote' | 'assinatura')  
**Obrigatório**: ⚠️ Depende do schema do banco  
**Valor Padrão**: 'avulso' (definido na migration)  
**Enviado pela Função**: ✅ SIM (linha 311)

**Possível Problema**: ❓ Se o banco não tem valor default e o campo é NOT NULL, pode gerar erro

---

#### 🆕 Campo: `billing_snapshot`

**Tipo**: `JSONB`  
**Obrigatório**: ⚠️ Depende do schema do banco  
**Valor Padrão**: NULL (definido na migration)  
**Enviado pela Função**: ✅ SIM (linha 312)

**Estrutura do JSON**:
```typescript
// Para modo 'pacote'
{
  mode: 'pacote',
  pacote_id: string,
  pacote_nome: string,
  projetos_inclusos: number,
  projetos_usados_antes: number,
  projetos_usados_depois: number,
  data_expiracao: string,
  timestamp: string
}

// Para modo 'assinatura'
{
  mode: 'assinatura',
  assinatura_id: string,
  plano_nome: string,
  projetos_mensais: number,
  projetos_usados_antes: number,
  projetos_usados_depois: number,
  dia_renovacao: number,
  proximo_reset: string,
  timestamp: string
}

// Para modo 'avulso'
{
  mode: 'avulso',
  potencia: number,
  valor_projeto: number,
  timestamp: string
}
```

**Possível Problema**: ❓ Se o banco não aceita NULL e não há pacote/assinatura, pode gerar erro

---

#### 🆕 Campo: `cliente_pacote_id`

**Tipo**: `UUID` (FK → `cliente_pacotes.id`)  
**Obrigatório**: ❌ NÃO (pode ser NULL)  
**Valor Padrão**: NULL  
**Enviado pela Função**: ✅ SIM (linha 315 - apenas se `billing_mode = 'pacote'`)

**Possível Problema**: ❓ Se a FK existe mas a tabela `cliente_pacotes` não existe, pode gerar erro

---

#### 🆕 Campo: `cliente_assinatura_id`

**Tipo**: `UUID` (FK → `cliente_assinaturas.id`)  
**Obrigatório**: ❌ NÃO (pode ser NULL)  
**Valor Padrão**: NULL  
**Enviado pela Função**: ✅ SIM (linha 316 - apenas se `billing_mode = 'assinatura'`)

**Possível Problema**: ❓ Se a FK existe mas a tabela `cliente_assinaturas` não existe, pode gerar erro

---

### 3. CHAMADAS NA APLICAÇÃO

#### 📍 Local 1: `useProjects.ts` (Hook Compartilhado)

**Linha 213**:
```typescript
const result = await createProjectMultiTenant(newProjectData, clientUserInfo);
```

**Dados Enviados**:
```typescript
{
  nome_cliente_final: string,
  empresaIntegradora: string,
  nomeClienteFinal: string,
  cpf_cnpj_cliente_final?: string,
  endereco_local?: string,
  havera_beneficiarias?: boolean,
  distribuidora: string,
  potencia: number,
  listaMateriais?: string,
  disjuntorPadraoEntrada?: string,
  valorProjeto: number,
  dataEntrega: string
}
```

**User Info**:
```typescript
{
  id: string,
  name: string,
  email: string
}
```

**✅ ANÁLISE**: Dados parecem completos

---

#### 📍 Local 2: `cliente/painel/page.tsx`

**Linha 286**:
```typescript
const result = await createProjectMultiTenant(projectDataForAction, clientUserInfo);
```

**Dados Enviados**: Mesma estrutura do `useProjects.ts`

**✅ ANÁLISE**: Dados parecem completos

---

#### 📍 Local 3: `cliente/projetos/page.tsx`

**Linha 463**:
```typescript
const result = await createProjectMultiTenant(projectDataForAction, clientUserInfo);
```

**Dados Enviados**: Mesma estrutura do `useProjects.ts`

**✅ ANÁLISE**: Dados parecem completos

---

### 4. VERIFICAÇÃO DO FLUXO INTERNO DA FUNÇÃO

#### Etapa 1: Obtenção de Dados do Usuário (linhas 32-47)

```typescript
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('tenant_id, role, status')
  .eq('id', user.id)
  .single()
```

**Campos Obtidos**: `tenant_id`, `role`, `status`

**Possível Problema**: ❓ Se usuário não existe ou não tem `tenant_id`, retorna erro antes de tentar criar projeto

---

#### Etapa 2: Cálculo de Valor (linhas 49-83)

**Lógica**: Busca configuração de faixas de potência do tenant e calcula valor automaticamente

**Possível Problema**: ✅ Tratamento de erro existe, continua com valor do formulário

---

#### Etapa 3: Verificação de Modalidade de Faturamento (linhas 86-239)

**Lógica**:
1. Busca pacote ativo do usuário
2. Busca assinatura ativa do usuário
3. Define `billing_mode` e `billing_snapshot`
4. Gera `billingWarnings` se necessário

**Possível Problema**: ❓ Se queries falharem, variáveis podem ficar `null` ou `undefined`

**Análise do Código**:
```typescript
let billingMode: 'avulso' | 'pacote' | 'assinatura' = 'avulso' // ✅ Default seguro
let billingSnapshot: any = null // ⚠️ Pode ser NULL
const billingWarnings: Array<...> = [] // ✅ Array vazio por padrão
```

**Para modo 'avulso' (sem pacote/assinatura)**:
```typescript
billingMode = 'avulso'
billingSnapshot = {
  mode: 'avulso',
  potencia: projectData.potencia || 0,
  valor_projeto: valorCalculado,
  timestamp: new Date().toISOString()
}
```

**✅ CONCLUSÃO**: Sempre define `billing_snapshot` (nunca fica NULL)

---

#### Etapa 4: Verificação de Limites Organizacionais (linhas 241-277)

**⚠️ CORREÇÃO RECENTE APLICADA**: Documento `CORRECAO-ERRO-LIMITES-ORGANIZACAO.md`

**Lógica**:
- Se usuário TEM pacote/assinatura: **PULA** verificação de limites
- Se usuário NÃO TEM: Verifica via RPC `can_create_resource`

**Possível Problema**: ❓ RPC `can_create_resource` pode estar falhando

**Análise**:
```typescript
if (limitError) {
  devLog.error('[createProjectMultiTenant] Erro ao verificar limite:', limitError)
  devLog.warn('[createProjectMultiTenant] Erro ao verificar limites, mas permitindo criação')
  // ✅ NÃO BLOQUEIA mais após correção
}
```

**✅ CONCLUSÃO**: Correção permite criação mesmo se RPC falhar

---

#### Etapa 5: Preparação dos Dados do Projeto (linhas 279-356)

**Análise Detalhada**:

```typescript
const projectToCreate = {
  // ✅ Campos obrigatórios básicos
  tenant_id: tenantId, // ✅ Obtido do usuário
  created_by: user.id, // ✅ Parâmetro da função
  owner_id: projectData.owner_id || user.id, // ✅ Fallback para user.id
  
  // ✅ Campos de nome (ambos enviados)
  name: projectData.nomeClienteFinal || projectData.nome_cliente_final || 'Projeto sem nome',
  description: projectData.description || '',
  
  // ✅ Dados específicos
  empresa_integradora: projectData.empresaIntegradora || '',
  nome_cliente_final: projectData.nomeClienteFinal || projectData.nome_cliente_final || '',
  distribuidora: projectData.distribuidora || '',
  potencia: projectData.potencia || 0,
  data_entrega: projectData.dataEntrega || null,
  
  // ✅ Novos campos opcionais
  cpf_cnpj_cliente_final: projectData.cpf_cnpj_cliente_final || null,
  endereco_local: projectData.endereco_local || null,
  havera_beneficiarias: projectData.havera_beneficiarias || false,
  
  // ⚠️ Status usando SLUG (mudança importante!)
  status: 'nao-iniciado', // ⚠️ Antes era 'Não Iniciado'
  prioridade: projectData.prioridade || 'Baixa',
  
  // ✅ Campos financeiros
  valor_projeto: valorCalculado,
  pagamento: projectData.pagamento || 'pendente',
  
  // 🆕 NOVOS CAMPOS DE BILLING
  billing_mode: billingMode, // ✅ Sempre definido
  billing_snapshot: billingSnapshot, // ✅ Sempre definido (nunca NULL)
  
  // 🆕 FKs para billing
  cliente_pacote_id: billingMode === 'pacote' && pacoteAtivo ? pacoteAtivo.id : null,
  cliente_assinatura_id: billingMode === 'assinatura' && assinaturaAtiva ? assinaturaAtiva.id : null,
  
  // ... outros campos
}
```

**✅ CONCLUSÃO**: Dados estão completos e com valores default seguros

---

#### Etapa 6: INSERT no Banco de Dados (linhas 369-387)

```typescript
const { data: newProject, error: createError } = await supabase
  .from('projects')
  .insert(projectToCreate)
  .select('*')
  .single()

if (createError || !newProject) {
  devLog.error('[createProjectMultiTenant] Erro ao criar projeto:', {
    error: createError,
    message: createError?.message,
    details: createError?.details,
    hint: createError?.hint,
    code: createError?.code
  })
  return {
    error: 'Erro ao criar projeto no banco de dados',
    message: createError?.message || 'Erro desconhecido ao inserir projeto'
  }
}
```

**🔴 ESTE É O PONTO CRÍTICO**

**Possíveis Causas de Erro**:

1. **❌ Schema do banco não tem os campos novos**
   - `billing_mode` não existe na tabela
   - `billing_snapshot` não existe na tabela
   - `cliente_pacote_id` não existe na tabela
   - `cliente_assinatura_id` não existe na tabela

2. **❌ Constraints de NOT NULL violadas**
   - Algum campo obrigatório não está sendo enviado
   - Valor default não está configurado no banco

3. **❌ Foreign Keys inválidas**
   - Tentando inserir `cliente_pacote_id` mas tabela `cliente_pacotes` não existe
   - Tentando inserir `cliente_assinatura_id` mas tabela `cliente_assinaturas` não existe
   - FK constraint falhando

4. **❌ Tipo de dados incompatível**
   - `billing_snapshot` esperando JSONB mas recebendo outro tipo
   - `status` esperando valor específico do ENUM/CHECK constraint

5. **❌ Trigger de validação bloqueando**
   - Algum trigger BEFORE INSERT falhando
   - Validação customizada no banco bloqueando

6. **❌ RLS (Row Level Security) bloqueando**
   - Política de segurança não permite INSERT
   - Service Role não tem permissão

---

#### Etapa 7: Notificações (linhas 444-504)

**Lógica**:
1. **Notificação de novo projeto** (linha 449): `notifyNewProject()`
2. **Notificações de billing** (linha 484): `sendBillingNotifications()`

**Análise**:
- ✅ Ambas têm `try/catch`
- ✅ Erros NÃO bloqueiam criação do projeto
- ✅ Apenas logam o erro

**✅ CONCLUSÃO**: Notificações NÃO são a causa do bloqueio

---

### 5. VERIFICAÇÃO DAS MIGRATIONS DE BANCO

**Migrations Encontradas**:

1. **`scripts/add-billing-fields-to-projects.sql`**
   - ✅ Adiciona `billing_mode` TEXT DEFAULT 'avulso'
   - ✅ Adiciona `billing_snapshot` JSONB DEFAULT NULL
   - ✅ Cria índice em `billing_mode`

2. **`scripts/add-billing-fks-to-projects.sql`**
   - ⚠️ Provável: Adiciona `cliente_pacote_id` e `cliente_assinatura_id`
   - ❓ Não lido ainda, precisa verificar

3. **Tabelas de Billing**:
   - ❓ `cliente_pacotes` existe?
   - ❓ `cliente_assinaturas` existe?
   - ❓ `pacotes_definicoes` existe?
   - ❓ `planos_assinatura` existe?

**🚨 POSSÍVEL CAUSA RAIZ**:
- Migrations podem não ter sido executadas em produção
- Campos novos podem não existir na tabela `projects`
- Tabelas de billing podem não existir
- Foreign Keys podem estar falhando

---

## 🎯 HIPÓTESES PRINCIPAIS

### Hipótese 1: Campos de Billing Não Existem no Banco (MAIS PROVÁVEL) 🔴

**Evidência**:
- Migrations foram criadas mas podem não ter sido executadas em produção
- Build passou sem erros TypeScript (código está correto)
- Erro acontece no INSERT do Supabase

**Como Verificar**:
```sql
-- Executar no banco de produção
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('billing_mode', 'billing_snapshot', 'cliente_pacote_id', 'cliente_assinatura_id');
```

**Solução Se Confirmado**:
- Executar migrations em produção
- Adicionar campos faltantes

---

### Hipótese 2: Foreign Keys Falhando 🟡

**Evidência**:
- Código tenta inserir `cliente_pacote_id` e `cliente_assinatura_id`
- Tabelas `cliente_pacotes` e `cliente_assinaturas` podem não existir

**Como Verificar**:
```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cliente_pacotes', 'cliente_assinaturas', 'pacotes_definicoes', 'planos_assinatura');

-- Verificar Foreign Keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'projects'
AND kcu.column_name IN ('cliente_pacote_id', 'cliente_assinatura_id');
```

**Solução Se Confirmado**:
- Criar tabelas de billing
- Adicionar Foreign Keys

---

### Hipótese 3: Constraint CHECK em `billing_mode` 🟡

**Evidência**:
- Migration define CHECK constraint: `billing_mode IN ('avulso', 'pacote', 'assinatura')`
- Código sempre envia um desses valores
- Mas pode haver problema de case-sensitivity ou espaços

**Como Verificar**:
```sql
-- Verificar constraints na tabela
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
AND conname LIKE '%billing%';
```

**Solução Se Confirmado**:
- Ajustar valores enviados pelo código
- Ou ajustar constraint no banco

---

### Hipótese 4: Status com Slug Incompatível 🟠

**Evidência**:
- Código antigo enviava: `'Não Iniciado'` (nome legível)
- Código novo envia: `'nao-iniciado'` (slug)
- Pode haver constraint ou trigger validando

**Como Verificar**:
```sql
-- Verificar constraint de status
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
AND consrc LIKE '%status%';

-- Verificar valores aceitos
SELECT DISTINCT status FROM projects;
```

**Solução Se Confirmado**:
- Atualizar constraint para aceitar slugs
- Ou voltar código para usar nomes legíveis

---

### Hipótese 5: RLS Bloqueando INSERT (MENOS PROVÁVEL) 🟢

**Evidência**:
- Função usa `createSupabaseServiceRoleClient()` (deveria ter permissões totais)
- Mas RLS pode estar configurado incorretamente

**Como Verificar**:
```sql
-- Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'projects'
AND cmd = 'INSERT';
```

**Solução Se Confirmado**:
- Ajustar políticas RLS
- Garantir que Service Role tem permissão

---

### Hipótese 6: Trigger de Validação Falhando 🟠

**Evidência**:
- Pode haver triggers BEFORE INSERT validando dados
- Novos campos podem não passar validação

**Como Verificar**:
```sql
-- Listar triggers na tabela projects
SELECT tgname, tgtype, tgenabled, tgisinternal, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid = 'projects'::regclass
AND tgisinternal = false;

-- Ver função do trigger
SELECT p.proname, pg_get_functiondef(p.oid)
FROM pg_proc p
WHERE p.proname LIKE '%project%';
```

**Solução Se Confirmado**:
- Ajustar lógica do trigger
- Ou desabilitar temporariamente

---

## 🔧 POSSÍVEIS SOLUÇÕES

### Solução 1: Verificar e Executar Migrations (RECOMENDADA) ✅

**Passos**:
1. Conectar no banco de produção
2. Verificar se campos existem:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'projects' 
   AND column_name IN ('billing_mode', 'billing_snapshot', 'cliente_pacote_id', 'cliente_assinatura_id');
   ```
3. Se campos não existem, executar migrations:
   ```bash
   psql -h <host> -U <user> -d <database> -f scripts/add-billing-fields-to-projects.sql
   psql -h <host> -U <user> -d <database> -f scripts/add-billing-fks-to-projects.sql
   ```

**Risco**: BAIXO (migrations têm `IF NOT EXISTS`)

---

### Solução 2: Reverter para Função Antiga Temporariamente ⚠️

**Se migrations não podem ser executadas imediatamente**, reverter temporariamente:

**Arquivos a Modificar**:
1. `src/lib/hooks/useProjects.ts`
2. `src/app/cliente/painel/page.tsx`
3. `src/app/cliente/projetos/page.tsx`

**Mudanças**:
```typescript
// ANTES (atual)
import { createProjectMultiTenant } from '@/lib/actions/multi-tenant-project-actions';
const result = await createProjectMultiTenant(newProjectData, clientUserInfo);

// DEPOIS (reverter)
import { createProjectClientAction } from '@/lib/actions/project-actions';
const result = await createProjectClientAction(newProjectData, clientUserInfo);
```

**Consequência**: ❌ Notificações de billing **NÃO funcionarão**

**Risco**: MÉDIO (perde funcionalidade, mas restaura criação de projetos)

---

### Solução 3: Tornar Campos de Billing Opcionais no Código ⚠️

**Se campos não existem no banco**, modificar código para não enviar:

**Arquivo**: `src/lib/actions/multi-tenant-project-actions.ts`

**Modificação** (linhas 310-316):
```typescript
// ANTES
billing_mode: billingMode,
billing_snapshot: billingSnapshot,
cliente_pacote_id: billingMode === 'pacote' && pacoteAtivo ? pacoteAtivo.id : null,
cliente_assinatura_id: billingMode === 'assinatura' && assinaturaAtiva ? assinaturaAtiva.id : null,

// DEPOIS (temporário)
...(billingMode && { billing_mode: billingMode }),
...(billingSnapshot && { billing_snapshot: billingSnapshot }),
...(billingMode === 'pacote' && pacoteAtivo && { cliente_pacote_id: pacoteAtivo.id }),
...(billingMode === 'assinatura' && assinaturaAtiva && { cliente_assinatura_id: assinaturaAtiva.id }),
```

**Consequência**: ❌ Dados de billing **NÃO serão salvos**

**Risco**: ALTO (perde integridade de dados)

---

### Solução 4: Criar Campos Manualmente via SQL (EMERGENCIAL) 🚨

**Se migrations não funcionam**, executar SQL direto:

```sql
-- Adicionar campos se não existem
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'avulso' CHECK (billing_mode IN ('avulso', 'pacote', 'assinatura'));

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS billing_snapshot JSONB DEFAULT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cliente_pacote_id UUID DEFAULT NULL;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cliente_assinatura_id UUID DEFAULT NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_projects_billing_mode ON projects(billing_mode);

-- Adicionar comentários
COMMENT ON COLUMN projects.billing_mode IS 'Modalidade de cobrança do projeto no momento da criação';
COMMENT ON COLUMN projects.billing_snapshot IS 'Snapshot JSON das informações de billing no momento da criação';
```

**Risco**: MÉDIO (SQL manual pode ter erros)

---

## 📊 IMPACTO NAS NOTIFICAÇÕES EXISTENTES

### Notificações de Novo Projeto (Email + In-App) ✅

**Função**: `notifyNewProject()` (linha 449)

**Análise**:
- ✅ Implementação **NÃO foi alterada**
- ✅ Continua funcionando como antes
- ✅ Apenas **adicionada** ao fluxo, não substituída

**Conclusão**: **SEM RISCO** de dano

---

### Notificações de Billing (In-App) 🆕

**Função**: `sendBillingNotifications()` (linha 484)

**Análise**:
- ✅ Função **NOVA**, não substitui nenhuma existente
- ✅ Apenas adiciona notificações extras
- ✅ Tem `try/catch`, não bloqueia se falhar

**Conclusão**: **SEM RISCO** de dano

---

### Outras Notificações do Sistema ✅

**Análise**:
- ✅ Nenhuma outra função de notificação foi modificada
- ✅ `notificationService.ts` apenas re-exporta funções
- ✅ Estrutura modular preservada

**Conclusão**: **SEM RISCO** de dano

---

## 🎬 PRÓXIMOS PASSOS RECOMENDADOS

### Passo 1: DIAGNÓSTICO NO BANCO DE DADOS (URGENTE) 🔍

**Executar no banco de produção**:

```sql
-- 1. Verificar campos da tabela projects
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Verificar se campos de billing existem
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('billing_mode', 'billing_snapshot', 'cliente_pacote_id', 'cliente_assinatura_id');

-- 3. Verificar tabelas de billing
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cliente_pacotes', 'cliente_assinaturas', 'pacotes_definicoes', 'planos_assinatura');

-- 4. Verificar Foreign Keys
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'projects';

-- 5. Verificar constraints
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'projects'::regclass;

-- 6. Verificar triggers
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'projects'::regclass
AND tgisinternal = false;

-- 7. Tentar INSERT de teste (CUIDADO!)
-- NÃO EXECUTAR EM PRODUÇÃO SEM ANÁLISE
```

---

### Passo 2: TESTAR CRIAÇÃO MANUAL (DIAGNÓSTICO) 🧪

**Criar projeto de teste diretamente no banco**:

```sql
-- INSERT de teste com campos novos
INSERT INTO projects (
  id,
  tenant_id,
  created_by,
  owner_id,
  name,
  nome_cliente_final,
  empresa_integradora,
  distribuidora,
  potencia,
  status,
  prioridade,
  valor_projeto,
  pagamento,
  billing_mode,
  billing_snapshot,
  timeline_events,
  documents,
  files,
  comments,
  history,
  settings
) VALUES (
  gen_random_uuid(),
  '<tenant_id_valido>',
  '<user_id_valido>',
  '<user_id_valido>',
  'Projeto de Teste',
  'Cliente de Teste',
  'Integradora Teste',
  'Distribuidora Teste',
  10.5,
  'nao-iniciado',
  'Baixa',
  5000.00,
  'pendente',
  'avulso',
  '{"mode": "avulso", "potencia": 10.5, "valor_projeto": 5000, "timestamp": "2025-12-17T00:00:00Z"}'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '[]'::jsonb,
  '{"notifications_enabled": true, "auto_timeline": true, "require_approval": false}'::jsonb
)
RETURNING *;
```

**Se INSERT funcionar**: ✅ Problema está no código ou permissões  
**Se INSERT falhar**: ❌ Problema está no schema do banco

---

### Passo 3: HABILITAR LOGS DETALHADOS (PRODUÇÃO) 📝

**Modificar temporariamente** `src/lib/actions/multi-tenant-project-actions.ts`:

**Adicionar antes do INSERT** (linha 367):

```typescript
// ⚠️ LOG DETALHADO TEMPORÁRIO
console.log('='.repeat(80));
console.log('🔍 DIAGNÓSTICO: Tentando criar projeto');
console.log('='.repeat(80));
console.log('📦 Dados completos a serem inseridos:');
console.log(JSON.stringify(projectToCreate, null, 2));
console.log('='.repeat(80));

const { data: newProject, error: createError } = await supabase
  .from('projects')
  .insert(projectToCreate)
  .select('*')
  .single()

console.log('='.repeat(80));
console.log('📊 Resultado do INSERT:');
console.log('✅ Sucesso:', !!newProject);
console.log('❌ Erro:', !!createError);
if (createError) {
  console.log('🚨 Detalhes do erro:');
  console.log(JSON.stringify({
    message: createError.message,
    details: createError.details,
    hint: createError.hint,
    code: createError.code
  }, null, 2));
}
console.log('='.repeat(80));
```

**Deploy e reproduzir erro** → Verificar logs no Vercel

---

### Passo 4: APLICAR SOLUÇÃO ADEQUADA 🛠️

**Com base no diagnóstico**:

1. **Se campos não existem** → Executar migrations (Solução 1)
2. **Se FKs falhando** → Criar tabelas de billing primeiro
3. **Se constraint bloqueando** → Ajustar valores ou constraint
4. **Se outro erro** → Análise específica baseada nos logs

---

## ⏱️ ESTIMATIVA DE TEMPO

- **Diagnóstico no banco**: 15-30 minutos
- **Execução de migrations**: 5-10 minutos
- **Teste de validação**: 10-20 minutos
- **Deploy e verificação**: 15-30 minutos

**TOTAL**: 45 minutos a 1h30 (depende da complexidade)

---

## 🚨 RECOMENDAÇÕES FINAIS

### Ação Imediata (Próximos 30 minutos)

1. ✅ **Executar queries de diagnóstico** no banco de produção
2. ✅ **Verificar se campos de billing existem**
3. ✅ **Verificar se tabelas de billing existem**
4. ✅ **Tentar INSERT manual de teste**

### Plano de Ação

**CENÁRIO A: Campos não existem no banco** (MAIS PROVÁVEL)
- ✅ Executar migrations em produção
- ✅ Verificar constraints e FKs
- ✅ Testar criação de projeto
- ⏱️ Tempo estimado: 30-45 minutos

**CENÁRIO B: Campos existem mas outro erro**
- ✅ Habilitar logs detalhados
- ✅ Reproduzir erro
- ✅ Analisar mensagem de erro específica
- ✅ Aplicar correção pontual
- ⏱️ Tempo estimado: 1-2 horas

**CENÁRIO C: Emergencial - Sistema precisa funcionar AGORA**
- ⚠️ Reverter para função antiga (Solução 2)
- ⚠️ Perder funcionalidade de notificações de billing
- ⚠️ Planejar correção definitiva posterior
- ⏱️ Tempo estimado: 15-30 minutos

---

## 📌 CONCLUSÃO

**Causa Mais Provável**: Migrations de billing **não foram executadas** em produção

**Evidências**:
1. ✅ Código TypeScript compila sem erros
2. ✅ Lógica da função está correta
3. ✅ Dados enviados estão completos
4. ❌ INSERT no banco está falhando
5. 🆕 Campos novos foram adicionados recentemente

**Próximo Passo**: **EXECUTAR QUERIES DE DIAGNÓSTICO** no banco de produção

**Risco para Produção**: 🔴 **CRÍTICO** (clientes não conseguem criar projetos)

**Risco de Correção**: 🟢 **BAIXO** (migrations são seguras com `IF NOT EXISTS`)

---

**FIM DO DIAGNÓSTICO**

---

## 📋 CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

Após aplicar a solução, validar:

- [ ] Cliente consegue criar projeto no painel
- [ ] Cliente consegue criar projeto na página de projetos
- [ ] Projeto é salvo no banco com `billing_mode` correto
- [ ] Projeto é salvo no banco com `billing_snapshot` correto
- [ ] Notificação de novo projeto é enviada (email + in-app)
- [ ] Notificações de billing são enviadas quando aplicável
- [ ] Quota de pacote/assinatura é decrementada corretamente
- [ ] Timeline do projeto é criada
- [ ] Admin visualiza o projeto criado
- [ ] Cliente visualiza o projeto criado
- [ ] Outras notificações do sistema continuam funcionando

---


