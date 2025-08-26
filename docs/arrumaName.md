# Checklist: Remoção do Campo `name` dos Projetos

## 📋 Objetivo
Remover o campo `name` dos projetos e utilizar apenas `nome_cliente_final` para evitar redundância e confusão de dados.

## 🚨 Arquivos Críticos (Prioridade Alta)

### Sistema de E-mails
- [ ] **`src/lib/services/emailService.ts`**
  - [ ] Linha 559: `const projectName = project.name || project.number || projectId;`
  - [ ] Linha 662: `const projectName = project.name || project.number || projectId;`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

### Sistema de Notificações
- [ ] **`src/lib/utils/notificationHelper.ts`**
  - [ ] Linha 881: `const projectName = projectData.name || projectData.nome || projectNumber || 'Projeto não especificado';`
  - [ ] Linha 1613: Similar uso para notificações
  - [ ] Substituir `projectData.name` por `projectData.nome_cliente_final`

### Geração de PDFs e Relatórios
- [ ] **`src/lib/utils/pdfGenerator.ts`**
  - [ ] Linha 731: `<td>${project.name || "N/A"}</td>`
  - [ ] Linha 937: `Nome do Projeto: ${project.name}`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

## 🖥️ Interface e Componentes (Prioridade Média)

### Componentes de Visualização
- [ ] **`src/components/kanban/KanbanBoard.tsx`**
  - [ ] Linha 164: `project.name?.toLowerCase().includes(query)`
  - [ ] Linha 378: `name: project.name,`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

- [ ] **`src/features/projects/ProjectManagementTable.tsx`**
  - [ ] Linha 86: `project.name?.toLowerCase().includes(searchQuery.toLowerCase())`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

- [ ] **`src/app/components/expanded-project-view.tsx`**
  - [ ] Linha 206: `name: project.name,`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

- [ ] **`src/components/financial/FinancialHistoryPanel.tsx`**
  - [ ] Linha 1030: `<div className="font-medium">{safeString(project.name)}</div>`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

## 🔧 Serviços e Actions (Prioridade Média)

### Serviço de Comentários
- [ ] **`src/lib/services/commentService/helpers.ts`**
  - [ ] Linha 120: `projectName: project.name || '',`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

- [ ] **`src/lib/services/commentService/core.ts`**
  - [ ] Linha 334: `projectName: project.name || '',`
  - [ ] Linha 349: `projectName: project.name || '',`
  - [ ] Linha 436: `projectName: project.name || '',`
  - [ ] Linha 449: `projectName: project.name || '',`
  - [ ] Substituir todas as ocorrências de `project.name` por `project.nome_cliente_final`

### Serviço de Arquivos
- [ ] **`src/lib/services/fileService/index.ts`**
  - [ ] Linha 100: `projectName: project.name,`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

### Actions de Projetos
- [ ] **`src/lib/actions/project-actions.ts`**
  - [ ] Linha 1667: `logger.info('[getProjectAction] Projeto encontrado:', { projectId: project.id, projectName: project.name, userId: project.userId });`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

- [ ] **`src/lib/actions/file-actions.ts`**
  - [ ] Linha 267: `projectName: project.name,`
  - [ ] Linha 287: `projectName: project.name,`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

### Outros Serviços
- [ ] **`src/lib/services/projectService/supabase.ts`**
  - [ ] Linha 81: `logger.debug('[getProjectById] Projeto encontrado:', { id: project.id, name: project.name });`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

## 🗄️ Banco de Dados (Prioridade Alta)

### Schema do Supabase
- [ ] **Criar migration para remover coluna `name`**
  - [ ] Criar arquivo de migration SQL
  - [ ] Executar migration em ambiente de desenvolvimento
  - [ ] Testar em ambiente de staging
  - [ ] Executar migration em produção

### Scripts de Verificação
- [ ] **`scripts/test-migrated-functions.js`**
  - [ ] Linha 196: `console.log(`   - Nome: ${project.name}`);`
  - [ ] Substituir `project.name` por `project.nome_cliente_final`

## 📝 Documentação (Prioridade Baixa)

- [ ] **`docs/notifications-guide.md`**
  - [ ] Linhas 95, 105, 119: Atualizar exemplos que usam `project.name`
  - [ ] Substituir por `project.nome_cliente_final`

## 🧪 Testes (Prioridade Alta)

### Testes Funcionais
- [ ] **Testar sistema de e-mails**
  - [ ] Verificar se e-mails são enviados com nome correto do projeto
  - [ ] Testar notificações de mudança de status
  - [ ] Testar notificações de comentários

- [ ] **Testar sistema de notificações**
  - [ ] Verificar notificações internas
  - [ ] Testar notificações para admins
  - [ ] Testar notificações para clientes

- [ ] **Testar interface**
  - [ ] Verificar busca no Kanban
  - [ ] Verificar tabela de gerenciamento
  - [ ] Testar visualização expandida de projetos

- [ ] **Testar PDFs e relatórios**
  - [ ] Gerar PDFs de projetos
  - [ ] Verificar se nomes aparecem corretamente
  - [ ] Testar relatórios financeiros

## ⚠️ Cuidados Especiais

### Compatibilidade
- [ ] **Verificar se há dados em produção com `name` preenchido**
  - [ ] Fazer backup dos dados antes da migração
  - [ ] Verificar se algum projeto depende do campo `name`
  - [ ] Criar script de migração de dados se necessário

### Rollback
- [ ] **Plano de contingência**
  - [ ] Criar script para reverter mudanças
  - [ ] Manter backup da estrutura anterior
  - [ ] Documentar processo de rollback

## 📊 Status Geral

- [ ] **Fase 1: Preparação** (Análise e documentação)
- [ ] **Fase 2: Implementação** (Substituições no código)
- [ ] **Fase 3: Banco de dados** (Migration e limpeza)
- [ ] **Fase 4: Testes** (Validação completa)
- [ ] **Fase 5: Deploy** (Produção)

---

## 📋 Notas Importantes

1. **Order de execução**: Primeiro alterar o código, depois executar a migration do banco
2. **Ambiente**: Testar em desenvolvimento antes de aplicar em produção
3. **Backup**: Sempre fazer backup antes de mudanças em produção
4. **Comunicação**: Informar equipe sobre as mudanças antes do deploy

## 🗄️ SQL de Remoção da Coluna (EXECUTAR POR ÚLTIMO)

### ⚠️ IMPORTANTE: Executar APENAS APÓS todo o código estar funcionando

**Ordem de execução:**
1. ✅ Primeiro: Implementar todas as mudanças de código
2. ✅ Segundo: Deploy e testes completos em produção
3. ✅ Terceiro: Confirmar que tudo funciona perfeitamente
4. 🔥 **ÚLTIMO**: Executar SQL abaixo

### SQL para Desenvolvimento/Staging
```sql
-- Verificar se a coluna existe antes de remover
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name = 'name';

-- Backup da tabela (recomendado)
CREATE TABLE projects_backup_antes_remover_name AS 
SELECT * FROM projects;

-- Remover a coluna
ALTER TABLE projects DROP COLUMN IF EXISTS name;

-- Verificar que foi removida
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name = 'name';
```

### SQL para Produção (Mais Cauteloso)
```sql
-- 1. Fazer backup completo da tabela
CREATE TABLE projects_backup_$(date +%Y%m%d_%H%M%S) AS 
SELECT * FROM projects;

-- 2. Verificar quantos registros têm 'name' preenchido
SELECT 
    COUNT(*) as total_projects,
    COUNT(name) as projects_with_name,
    COUNT(nome_cliente_final) as projects_with_nome_cliente_final
FROM projects;

-- 3. Verificar se há inconsistências
SELECT id, name, nome_cliente_final 
FROM projects 
WHERE name IS NOT NULL 
  AND nome_cliente_final IS NOT NULL 
  AND name != nome_cliente_final
LIMIT 10;

-- 4. Se tudo estiver OK, remover a coluna
ALTER TABLE projects DROP COLUMN name;

-- 5. Verificar que foi removida
\d projects;
```

### 🚨 Checklist de Segurança SQL

- [ ] **Fazer backup completo da tabela projects**
- [ ] **Verificar que todo o código está funcionando sem usar 'name'**
- [ ] **Testar em ambiente de desenvolvimento primeiro**
- [ ] **Testar em ambiente de staging**
- [ ] **Executar em horário de baixo tráfego**
- [ ] **Ter plano de rollback preparado**
- [ ] **Monitorar aplicação após execução**

### 🔄 Plano de Rollback (Emergência)

Se algo der errado após remover a coluna:

```sql
-- Recriar a coluna
ALTER TABLE projects ADD COLUMN name TEXT;

-- Restaurar dados do backup (se necessário)
UPDATE projects 
SET name = b.name
FROM projects_backup_$(data_do_backup) b
WHERE projects.id = b.id;
```

---

**Data de criação**: 26/08/2025  
**Responsável**: Gabriel Casarin  
**Status**: Em planejamento