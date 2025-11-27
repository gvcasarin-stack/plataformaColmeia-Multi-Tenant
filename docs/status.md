# 📊 Sistema Multi-Tenant de Status de Projetos

## 🎯 Objetivo
Implementar sistema flexível de status de projetos por tenant, permitindo que cada empresa customize seu workflow de projetos mantendo funcionalidades existentes intactas.

## 📋 Status Padrão Identificados
```sql
'Não Iniciado'
'Em Desenvolvimento'
'Aguardando Assinaturas'
'Em Homologação'
'Projeto Aprovado'
'Aguardando Solicitar Vistoria'
'Projeto Pausado'
'Em Vistoria'
'Finalizado'
'Cancelado'
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### 🗃️ **FASE 1: Estrutura de Banco de Dados** ✅ CONCLUÍDA
- [x] **1.1** Criar tabela `project_statuses`
  - [x] Campos: id, tenant_id, name, slug, color, icon, order_index, is_default, is_active
  - [x] Constraints e índices apropriados
  - [x] Unique constraints (tenant_id + slug, tenant_id + name)
  - [x] RLS (Row Level Security) implementado

- [x] **1.2** Criar função para inserir status padrão
  - [x] Função SQL `create_default_project_statuses()` criada
  - [x] Incluir cores, ordem e identificação de status padrão (10 status)
  - [x] Função auxiliar `get_tenant_project_statuses()` para listagem
  - [x] Função auxiliar `can_delete_project_status()` para validação

- [x] **1.3** Integrar criação de status na criação de tenants
  - [x] Atualizar `registration-actions.ts`
  - [x] Chamar função de criação de status padrão após criação da organização
  - [x] Garantir que novos tenants já nascem com status configurados

### 🔧 **FASE 2: APIs de Gerenciamento de Status** ✅ CONCLUÍDA
- [x] **2.1** Criar API `GET /api/project-statuses`
  - [x] Retornar status do tenant atual
  - [x] Ordenar por order_index
  - [x] Incluir metadados (cor, ícone, se é padrão)
  - [x] Usar função SQL `get_tenant_project_statuses()`

- [x] **2.2** Criar API `POST /api/project-statuses`
  - [x] Validar permissões multi-tenant
  - [x] Validar unicidade de nome/slug por tenant
  - [x] Definir order_index automaticamente
  - [x] Gerar slug automaticamente a partir do nome

- [x] **2.3** Criar API `PUT /api/project-statuses/:id`
  - [x] Editar nome, cor (slug mantido para integridade)
  - [x] Validar que não é um status padrão crítico
  - [x] Validar que status pertence ao tenant

- [x] **2.4** Criar API `DELETE /api/project-statuses/:id`
  - [x] Validar que não há projetos usando o status
  - [x] Não permitir excluir status padrão
  - [x] Usar função SQL `can_delete_project_status()`

### 🔄 **FASE 3: Atualização de APIs Existentes** ✅ CONCLUÍDA
- [x] **3.1** Mapear todas as APIs que usam status de projeto
  - [x] `/api/projects/unified` - API principal identificada
  - [x] `/api/projects/[id]` - API de projetos individuais
  - [x] APIs do painel e financeiro (identificadas para próxima fase)

- [x] **3.2** Atualizar API de listagem de projetos
  - [x] Fazer JOIN com project_statuses (`/api/projects/unified`)
  - [x] Retornar dados completos do status via `statusInfo`
  - [x] Manter compatibilidade com campo status atual
  - [x] Implementar fallback robusto

- [x] **3.3** Atualizar API de criação de projetos
  - [x] Validar que status existe para o tenant
  - [x] Usar slug do status (`nao-iniciado` como padrão)
  - [x] Definir status padrão automático
  - [x] Validação robusta antes da criação

- [x] **3.4** Atualizar API de edição de projetos
  - [x] Validar mudanças de status (`PUT /api/projects/[id]`)
  - [x] Verificar se novo status existe no tenant
  - [x] Segurança multi-tenant implementada

### 🎨 **FASE 4: Interface do Usuário - Kanban** ✅ CONCLUÍDA
- [x] **4.1** Atualizar componente de listagem de projetos
  - [x] KanbanService completamente migrado para nova API
  - [x] Buscar status via `/api/project-statuses`
  - [x] Funções: `getKanbanColumnTitles()`, `getKanbanColumnColors()`, `getProjectStatuses()`
  - [x] **CONCLUÍDO:** KanbanBoard totalmente atualizado para usar slugs dinâmicos

- [x] **4.2** Atualizar lógica de drag-and-drop
  - [x] **CONCLUÍDO:** Usar slugs dos status ao invés de nomes fixos
  - [x] Drag-and-drop funciona com status dinâmicos do tenant
  - [x] Validação de status de destino implementada
  - [x] Atualização via API funcionando

- [x] **4.3** Implementar botões de ação nas colunas do Kanban
  - [x] Funções backend: `updateKanbanColumnTitle()`, `deleteKanbanColumn()`, `addKanbanColumn()`
  - [x] **CONCLUÍDO:** Botão de editar nome do status (ícone de lápis)
  - [x] **CONCLUÍDO:** Botão de excluir coluna/status (ícone de X)
  - [x] Validações: não permitir exclusão se há projetos na coluna
  - [x] Validações: não permitir exclusão de status padrão
  - [x] Modal de confirmação para exclusão (`DeleteColumnDialog`)
  - [x] Feedback visual durante operações

- [x] **4.4** Manter vista expandida do projeto
  - [x] Funcionalidade de clique no cartão intacta (não foi alterada)
  - [x] **CONCLUÍDO:** Exibir status com cor e nome corretos
  - [x] **CONCLUÍDO:** Select de status dinâmico na vista expandida
  - [x] Status exibido com cores corretas em todas as seções

### ⚙️ **FASE 5: Interface de Gerenciamento de Status**
- [ ] **5.1** Criar página de configuração de status
  - [ ] Lista de status atual do tenant
  - [ ] Botões para adicionar, editar, excluir
  - [ ] Drag-and-drop para reordenar

- [ ] **5.2** Modal de criação de status
  - [ ] Campos: nome, cor, ícone (opcional)
  - [ ] Validação de unicidade
  - [ ] Preview da cor selecionada

- [ ] **5.3** Modal de edição de status
  - [ ] Editar nome e cor
  - [ ] Indicar se é status padrão (não editável)
  - [ ] Mostrar quantidade de projetos usando

- [ ] **5.4** Funcionalidade "Adicionar Coluna" no Kanban
  - [ ] Botão já existe, implementar funcionalidade
  - [ ] Abrir modal de criação de status
  - [ ] Recarregar colunas após criação

### 📊 **FASE 6: Atualização de Outras Áreas** ✅ CONCLUÍDA
- [x] **6.1** Atualizar aba Financeiro
  - [x] **CONCLUÍDO:** Status exibidos com cores dinâmicas na tabela
  - [x] **CONCLUÍDO:** Carregamento de status via API `/api/project-statuses`
  - [x] **CONCLUÍDO:** Badge de status com indicador de cor

- [x] **6.2** Atualizar Dashboard/Painel
  - [x] **CONCLUÍDO:** Contadores por status dinâmicos usando slugs
  - [x] **CONCLUÍDO:** Gráfico de pizza com cores dinâmicas dos status
  - [x] **CONCLUÍDO:** Legenda com cores corretas do tenant
  - [x] **CONCLUÍDO:** Função `renderProjectStatusBadge` atualizada

- [x] **6.3** Atualizar sistema de buscas/filtros
  - [x] **CONCLUÍDO:** Filtros dinâmicos na página cliente (`/cliente/projetos`)
  - [x] **CONCLUÍDO:** Botões de filtro gerados dinamicamente com cores
  - [x] **CONCLUÍDO:** Lógica de filtro usando slugs para comparação
  - [x] **CONCLUÍDO:** `ProjectsOverview` atualizado para status dinâmicos

### 🔍 **FASE 7: Validação e Testes**
- [ ] **7.1** Testar criação de novos tenants
  - [ ] Verificar se status padrão são criados
  - [ ] Testar Kanban com status padrão
  - [ ] Validar cores e funcionamento

- [ ] **7.2** Testar funcionalidades de CRUD de status
  - [ ] Criar status customizado
  - [ ] Editar status existente
  - [ ] Tentar excluir status em uso (deve falhar)
  - [ ] Reordenar status

- [ ] **7.3** Testar impacto em outras áreas
  - [ ] Financeiro com novos status
  - [ ] Dashboard com contadores corretos
  - [ ] Filtros funcionando
  - [ ] APIs não quebradas

### 📚 **FASE 8: Documentação e Finalização**
- [ ] **8.1** Documentar APIs criadas
  - [ ] Endpoints, parâmetros, respostas
  - [ ] Exemplos de uso
  - [ ] Códigos de erro

- [ ] **8.2** Atualizar documentação do usuário
  - [ ] Como gerenciar status
  - [ ] Limitações e regras
  - [ ] Melhores práticas

- [ ] **8.3** Criar guia de migração (para referência futura)
  - [ ] Scripts SQL se necessário
  - [ ] Processo de migração de dados
  - [ ] Validações pós-migração

---

## 🚨 **PONTOS DE ATENÇÃO**

### **Compatibilidade**
- Manter funcionamento atual do Kanban intacto
- Não quebrar APIs existentes durante implementação
- Funcionalidade drag-and-drop deve continuar funcionando
- Vista expandida do projeto deve continuar acessível

### **Performance**
- JOINs adicionais podem impactar performance
- Considerar cache para status por tenant
- Índices apropriados na nova tabela

### **Validação de Dados**
- Status padrão não devem ser excluíveis
- Projetos não podem ficar com status inexistente
- Nomes de status únicos por tenant

### **Segurança**
- Apenas admins podem gerenciar status
- Validar tenant_id em todas as operações
- Não permitir acesso cross-tenant

---

## 🎯 **RESULTADO ESPERADO**

Ao final da implementação:
- ✅ Cada tenant terá seus próprios status de projeto
- ✅ Interface para gerenciar status funcionando
- ✅ Kanban totalmente funcional com status customizados
- ✅ Novos tenants já nascem com status padrão configurados
- ✅ Funcionalidade "Adicionar Coluna" operacional
- ✅ Sistema escalável para futuras funcionalidades

---

## 📞 **PRÓXIMOS PASSOS**

1. **Revisar e aprovar** este checklist
2. **Definir prioridades** das fases
3. **Iniciar implementação** fase por fase
4. **Testar continuamente** para não quebrar funcionalidades existentes
5. **Validar** com tenant de teste antes de aplicar globalmente