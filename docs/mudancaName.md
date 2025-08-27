# Checklist: Migração do campo 'name' para 'nome_cliente_final'

## ⚠️ ATENÇÃO: PRODUÇÃO
Este checklist documenta todas as alterações necessárias para trocar o campo `name` pelo campo `nome_cliente_final` nos projetos. **AMBIENTE DE PRODUÇÃO - CUIDADO EXTREMO**.

## 📋 Status Geral
- [x] **CONCLUÍDO**: Tipos e Interfaces
- [x] **CONCLUÍDO**: APIs e Rotas
- [x] **CONCLUÍDO**: Serviços
- [x] **CONCLUÍDO**: Componentes React (principais)
- [x] **CONCLUÍDO**: Actions
- [x] **CONCLUÍDO**: Utils e Helpers (principais)
- [ ] **PENDENTE**: Testes e Validação final

## 📁 1. TIPOS E INTERFACES

### ✅ Arquivos que DEVEM ser alterados:
- [ ] `src/types/project.ts` - Linha 66, 93 (interface BaseProject e Project)
- [ ] `src/app/types/project.ts` - Verificar se existe e alterar

### 🔍 **Alteração necessária:**
```typescript
// TROCAR:
name: string;

// POR:
nome_cliente_final: string;
```

## 📡 2. APIs E ROTAS

### ✅ Arquivos identificados para alterar:
- [ ] `src/app/api/billing/projects/route.ts` - GET/POST que usam project.name
- [ ] `src/app/api/projects/unified/route.ts` - Criação/atualização de projetos
- [ ] `src/app/api/projects/unified/payment/route.ts` - Se usar project.name
- [ ] `src/app/api/debug/list-projects/route.ts` - Debug que lista projetos

### 🔍 **Padrões a procurar e alterar:**
- `project.name` → `project.nome_cliente_final`
- `name:` → `nome_cliente_final:`
- Validações do campo name
- Responses que retornam name

## 🔧 3. SERVIÇOS

### ✅ Arquivos identificados para alterar:
- [ ] `src/lib/services/projectService/supabase.ts` - CRUD de projetos
- [ ] `src/lib/services/projectService/core.ts` - Lógica core de projetos
- [ ] `src/lib/services/billingService.supabase.ts` - Billing que usa project.name
- [ ] `src/lib/services/emailService.ts` - Emails com nome do projeto
- [ ] `src/lib/services/commentService/core.ts` - Comentários sobre projetos
- [ ] `src/lib/services/fileService/index.ts` - Upload de arquivos para projetos
- [ ] `src/lib/services/fileService/core.ts` - Core de arquivos

### 🔍 **Padrões a procurar:**
- Queries SQL que selecionam `name`
- Inserções/Updates que usam `name`
- Validações de business logic
- Logs que mostram `project.name`

## ⚡ 4. ACTIONS

### ✅ Arquivos identificados para alterar:
- [ ] `src/lib/actions/project-actions.ts` - Todas as ações de projeto
- [ ] `src/lib/actions/multi-tenant-project-actions.ts` - Actions multi-tenant
- [ ] `src/lib/actions/file-actions.ts` - Se usar project.name

### 🔍 **Alterações típicas:**
- Server Actions que recebem/retornam project.name
- Validações de dados
- Transformações de dados

## 🧩 5. COMPONENTES REACT

### ✅ Arquivos CRÍTICOS identificados:
- [ ] `src/components/client/create-project-modal.tsx` - **MODAL CRIAÇÃO** ⚠️
- [ ] `src/app/components/expanded-project-view.tsx` - Visualização expandida
- [ ] `src/components/financial/FinancialHistoryPanel.tsx` - Painel financeiro
- [ ] `src/features/projects/ProjectManagementTable.tsx` - Tabela de projetos
- [ ] `src/components/kanban/KanbanBoard.tsx` - Kanban de projetos

### ✅ Páginas identificadas:
- [ ] `src/app/admin/painel/page.tsx` - Dashboard admin
- [ ] `src/app/admin/financeiro/page.tsx` - Financeiro admin
- [ ] `src/app/cliente/projetos/page.tsx` - Projetos do cliente
- [ ] `src/app/cliente/painel/page.tsx` - Dashboard cliente

### 🔍 **Padrões nos componentes:**
- `{project.name}` → `{project.nome_cliente_final}`
- `project?.name` → `project?.nome_cliente_final`
- Formulários com campo name
- Validações de formulário
- Estados locais que armazenam name

## 🛠️ 6. UTILS E HELPERS

### ✅ Arquivos identificados:
- [ ] `src/lib/utils/pdfGenerator.ts` - PDFs que mostram nome do projeto
- [ ] `src/lib/utils/notificationHelper.ts` - Notificações com nome
- [ ] `src/lib/services/commentService/helpers.ts` - Helpers de comentários

### 🔍 **Alterações:**
- Geradores de PDF/relatórios
- Templates de notificação
- Funções de formatação
- Logs e debugging

## 🧪 7. VALIDAÇÕES E SEGURANÇA

### ✅ Verificar:
- [ ] Formulários client-side (React Hook Form)
- [ ] Validações server-side (Zod/outras)
- [ ] Políticas RLS do Supabase
- [ ] Indexação no banco de dados

### ⚡ **Pontos críticos:**
- **Modal de criação**: `src/components/client/create-project-modal.tsx`
- **APIs de criação**: `src/app/api/projects/unified/route.ts`
- **Tipos base**: `src/types/project.ts`

## 🚨 ORDEM DE EXECUÇÃO RECOMENDADA

### Fase 1: Base (Tipos e Core)
1. `src/types/project.ts`
2. `src/app/types/project.ts` (se existir)
3. `src/lib/services/projectService/core.ts`
4. `src/lib/services/projectService/supabase.ts`

### Fase 2: APIs
5. `src/app/api/projects/unified/route.ts`
6. `src/app/api/billing/projects/route.ts`
7. Outras APIs identificadas

### Fase 3: Actions
8. `src/lib/actions/project-actions.ts`
9. `src/lib/actions/multi-tenant-project-actions.ts`

### Fase 4: Componentes Críticos
10. `src/components/client/create-project-modal.tsx` ⚠️ **MAIS IMPORTANTE**
11. `src/app/components/expanded-project-view.tsx`
12. Outros componentes

### Fase 5: Páginas e UI
13. Páginas admin e cliente
14. Componentes de visualização

### Fase 6: Utils e Auxiliares
15. PDFs, notificações, helpers

## 🧪 VALIDAÇÃO FINAL
- [ ] Testar criação de projeto
- [ ] Testar visualização de projetos
- [ ] Testar edição de projetos
- [ ] Testar relatórios/PDFs
- [ ] Testar notificações
- [ ] Verificar logs de erro
- [ ] Testar em diferentes roles (admin, cliente)

## ⚠️ ROLLBACK
- Manter backup dos arquivos originais
- Testar em ambiente local primeiro
- Deploy gradual se possível

---
**Data de criação:** 2025-08-27  
**Criticidade:** ALTA - PRODUÇÃO  
**Estimativa:** Múltiplos arquivos afetados  