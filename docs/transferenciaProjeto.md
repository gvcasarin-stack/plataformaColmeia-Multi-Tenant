# 📋 Plano de Implementação: Criação de Projetos pelo Admin + Transferência de Propriedade

## 🎯 Objetivo
Permitir que administradores criem projetos e definam o proprietário (próprio admin ou cliente existente), com possibilidade futura de transferir a propriedade.

---

## 📊 Fases de Implementação

### **FASE 1: Preparação do Backend (Banco de Dados)**
**Objetivo:** Adicionar campo `owner_id` e preparar estrutura

- [ ] 1.1. Criar migration para adicionar coluna `owner_id` na tabela `projects`
  - Tipo: `uuid`
  - Nullable: `false`
  - Foreign key: `users(id)`
  - Default: usar `created_by` como fallback

- [ ] 1.2. Criar migration para adicionar coluna `ownership_history` (JSONB)
  - Tipo: `jsonb`
  - Nullable: `true`
  - Default: `[]`

- [ ] 1.3. Migrar dados existentes
  - `UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL`
  - Verificar integridade dos dados

- [ ] 1.4. Testar queries de busca com `owner_id`
  - Dashboard cliente: `WHERE owner_id = userId`
  - Dashboard admin: `WHERE tenant_id = tenantId`

---

### **FASE 2: Atualizar API de Criação de Projetos**
**Objetivo:** API aceitar `owner_id` no payload

- [ ] 2.1. Atualizar `/api/projects/route.ts` (POST)
  - Adicionar campo `owner_id` no body
  - Validar que `owner_id` pertence ao tenant
  - Validar que `owner_id` é usuário ativo
  - Se não informado, usar `created_by` como default

- [ ] 2.2. Adicionar validações de segurança
  - ✅ Verificar se owner_id existe na tabela users
  - ✅ Verificar se owner_id.tenant_id === current_tenant_id
  - ✅ Verificar se owner_id.status === 'active'

- [ ] 2.3. Criar evento de timeline
  - Adicionar no `timeline_events`: "Projeto criado por [admin] para [owner]"

- [ ] 2.4. Testar API com Postman/Thunder Client
  - Criar projeto com owner_id = adminId
  - Criar projeto com owner_id = clientId
  - Verificar erros de validação

---

### **FASE 3: Botão "Novo Projeto" em /admin/projetos**
**Objetivo:** Adicionar botão ao lado de "Adicionar Coluna"

- [ ] 3.1. Verificar arquivo `/src/app/admin/projetos/page.tsx`
  - Localizar onde fica botão "Adicionar Coluna"

- [ ] 3.2. Adicionar botão "Novo Projeto"
  - Ícone: `PlusCircle` ou `FileText`
  - Texto: "Novo Projeto"
  - Cor: Verde/Laranja (destaque)
  - Posição: Ao lado de "Adicionar Coluna"

- [ ] 3.3. Adicionar estado do modal
  ```typescript
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  ```

- [ ] 3.4. Verificar permissões
  - Apenas admin e superadmin veem o botão
  - Colaboradores NÃO veem
  - Clientes NÃO veem (já tem o modal próprio)

---

### **FASE 4: Adaptar Modal de Criação de Projeto**
**Objetivo:** Modal único que se adapta ao role do usuário

#### **4.1. Localizar Modal Atual do Cliente**
- [ ] Encontrar componente `CreateProjectModal` ou similar
- [ ] Verificar todos os campos atuais
- [ ] Documentar estrutura atual (NÃO ALTERAR)

#### **4.2. Adicionar Props de Adaptação**
- [ ] Adicionar prop `isAdmin?: boolean`
- [ ] Adicionar prop `currentUserId: string`
- [ ] Adicionar prop `tenantId: string`

#### **4.3. Buscar Lista de Clientes (Admin)**
- [ ] Criar função para buscar clientes do tenant
  ```typescript
  const fetchClients = async () => {
    const response = await fetch('/api/admin/clients')
    const clients = await response.json()
    setClients(clients)
  }
  ```

- [ ] Executar apenas se `isAdmin === true`

#### **4.4. Adicionar Campo "Proprietário" (Apenas Admin)**
- [ ] Criar seção condicional `{isAdmin && (...)}`
- [ ] Adicionar Select com opções:
  - Opção 1 (default): Minha conta (adminId)
  - Opções 2+: Clientes do tenant

- [ ] Estilizar com:
  - Border-top (separador visual)
  - Ícone de usuário
  - Descrição de cada opção
  - Texto de ajuda/dica

#### **4.5. Manter Campos do Cliente Intactos**
- [ ] ✅ NÃO alterar nenhum campo existente
- [ ] ✅ NÃO alterar validações existentes
- [ ] ✅ NÃO alterar comportamento para cliente
- [ ] ✅ Apenas ADICIONAR seção nova para admin

#### **4.6. Lógica de Submissão**
- [ ] Se cliente: `owner_id = userId` (comportamento atual)
- [ ] Se admin: `owner_id = selectedOwnerId` (do select)
- [ ] Empresa Integradora: sempre `organization.name`

---

### **FASE 5: Integração e Testes**
**Objetivo:** Garantir que tudo funciona

#### **5.1. Testes como Admin**
- [ ] Admin cria projeto para si mesmo
  - ✅ owner_id = adminId
  - ✅ Projeto aparece em "Meus Projetos"
  - ✅ empresaIntegradora = nome da organização

- [ ] Admin cria projeto para cliente existente
  - ✅ owner_id = clientId
  - ✅ Projeto NÃO aparece em "Meus Projetos" do admin
  - ✅ Projeto aparece em "Meus Projetos" do cliente
  - ✅ Cliente recebe notificação

- [ ] Admin tenta criar com owner_id inválido
  - ✅ API retorna erro 400
  - ✅ Mostra mensagem de erro no frontend

#### **5.2. Testes como Cliente**
- [ ] Cliente cria projeto (comportamento atual)
  - ✅ owner_id = clientId (automático)
  - ✅ NÃO vê campo "Proprietário"
  - ✅ Modal igual ao anterior (sem mudanças)
  - ✅ Projeto aparece em "Meus Projetos"

#### **5.3. Testes como Colaborador**
- [ ] Colaborador NÃO vê botão "Novo Projeto"
- [ ] Colaborador vê todos os projetos do tenant (sem criar)

#### **5.4. Testes de Dashboard/Filtros**
- [ ] Dashboard cliente filtra por `owner_id`
- [ ] Dashboard admin mostra todos do tenant
- [ ] Kanban admin mostra todos os projetos
- [ ] Contadores de projetos estão corretos

---

### **FASE 6: Polimento e Documentação**
**Objetivo:** Refinar detalhes e documentar

- [ ] 6.1. Adicionar tooltip no botão "Novo Projeto"
  - Texto: "Criar projeto para você ou para um cliente"

- [ ] 6.2. Melhorar feedback visual
  - Loading state no select de clientes
  - Empty state se não houver clientes
  - Mensagem de sucesso diferenciada

- [ ] 6.3. Adicionar logs de auditoria
  - Registrar quem criou
  - Registrar para quem criou
  - Timestamp da criação

- [ ] 6.4. Documentar mudanças
  - Atualizar este arquivo com resultados
  - Registrar decisões tomadas
  - Adicionar screenshots (opcional)

---

## 🚀 Próximas Fases (Futuro)

### **FASE 7: Funcionalidade de Transferência** (NÃO IMPLEMENTAR AGORA)
- [ ] Criar botão "Transferir Propriedade" na visualização do projeto
- [ ] Criar modal de transferência
- [ ] Criar API `/api/projects/[id]/transfer-ownership`
- [ ] Adicionar histórico de transferências
- [ ] Notificações de transferência

---

## ⚠️ Checklist de Segurança

- [ ] ✅ Validar tenant_id em todas as operações
- [ ] ✅ Verificar permissões (apenas admin/superadmin cria)
- [ ] ✅ Validar owner_id pertence ao tenant
- [ ] ✅ Verificar owner_id está ativo
- [ ] ✅ Prevenir SQL injection
- [ ] ✅ Sanitizar inputs
- [ ] ✅ Logs de auditoria

---

## 📝 Notas de Implementação

### **Decisões Tomadas:**
1. ✅ Modal único adaptável (não criar modal separado)
2. ✅ owner_id sempre preenchido (nunca NULL)
3. ✅ Admin é proprietário padrão (sem "temporário")
4. ✅ empresaIntegradora = organization.name (sempre)
5. ✅ Não alterar modal do cliente (apenas adicionar para admin)

### **Estrutura de Dados:**
```typescript
interface Project {
  id: string;
  tenant_id: string;           // Nunca muda
  owner_id: string;            // Proprietário atual
  created_by: string;          // Quem criou (histórico)
  admin_responsible_id: string; // Responsável técnico
  empresaIntegradora: string;  // Nome da organização
  // ... outros campos
}
```

### **Fluxo de Criação:**
```
Admin clica "Novo Projeto"
  ↓
Modal abre com campo "Proprietário"
  ↓
Admin escolhe: Minha conta (default) OU Cliente X
  ↓
Preenche dados do projeto
  ↓
Submit → API valida owner_id
  ↓
Projeto criado com owner_id definido
  ↓
Notificação enviada (se for para cliente)
```

---

## ✅ Status Geral

- [ ] **FASE 1:** Preparação Backend - PENDENTE
- [ ] **FASE 2:** Atualizar API - PENDENTE
- [ ] **FASE 3:** Botão "Novo Projeto" - PENDENTE
- [ ] **FASE 4:** Adaptar Modal - PENDENTE
- [ ] **FASE 5:** Testes - PENDENTE
- [ ] **FASE 6:** Polimento - PENDENTE

---

**Data de Criação:** 2025-01-24
**Última Atualização:** 2025-01-24
**Status:** 🟡 Planejamento Concluído - Aguardando Implementação
