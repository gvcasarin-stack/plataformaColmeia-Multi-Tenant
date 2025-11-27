# 👥 Sistema de Colaboradores - Implementação

## 🎯 Objetivo
Criar sistema de roles diferenciado entre **Administrador** e **Colaborador**, permitindo controle granular de permissões através de checkboxes na interface de gerenciamento de equipe.

---

## 📋 Requisitos Funcionais

### **Tipos de Usuário Admin:**

1. **Administrador (role: 'admin')**
   - Acesso total a todas as funcionalidades
   - Todas as permissões marcadas por padrão
   - Pode gerenciar equipe e financeiro

2. **Colaborador (role: 'colaborador')**
   - Acesso limitado baseado em permissões
   - Por padrão, **NÃO** tem acesso a:
     - ❌ Financeiro
     - ❌ Equipe
     - ⚠️ Painel (limitado - sem faturamento)
   - Por padrão, **TEM** acesso a:
     - ✅ Projetos (criar, editar, visualizar)
     - ✅ Clientes (visualizar, editar)
     - ✅ Notificações
     - ✅ Preferências pessoais

3. **Colaborador Personalizado**
   - Pode ter qualquer combinação de permissões
   - Exemplo: Colaborador Financeiro (só acessa financeiro)
   - Exemplo: Colaborador de Projetos (só gerencia projetos)

---

## 🗂️ Estrutura de Permissões

### **Campo `permissions` (JSONB) na tabela `users`:**

```json
{
  "can_view_dashboard": true,           // Ver painel
  "can_view_dashboard_financials": false, // Ver faturamento no painel
  "can_create_projects": true,          // Criar projetos
  "can_edit_projects": true,            // Editar projetos
  "can_delete_projects": false,         // Deletar projetos
  "can_view_clients": true,             // Ver clientes
  "can_edit_clients": true,             // Editar clientes
  "can_view_financials": false,         // Acessar aba Financeiro
  "can_manage_team": false,             // Acessar aba Equipe
  "can_edit_preferences": true          // Editar preferências da organização
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **FASE 1: Banco de Dados** 🗄️

- [ ] **1.1** Criar migration para adicionar 'colaborador' ao enum/constraint de `role`
  - Arquivo: `scripts/add-colaborador-role.sql`
  - Ação: `ALTER TABLE users` para aceitar novo valor

- [ ] **1.2** Criar script de validação da estrutura
  - Arquivo: `scripts/verify-colaborador-role.sql`
  - Testa se constraint aceita 'colaborador'

- [ ] **1.3** Criar script de rollback (segurança)
  - Arquivo: `scripts/rollback-colaborador-role.sql`
  - Remove 'colaborador' do constraint se necessário

---

### **FASE 2: Tipos TypeScript** 📝

- [ ] **2.1** Atualizar tipo `UserRole` em `src/types/user.ts`
  - Adicionar `'colaborador'` como opção válida
  - Manter retrocompatibilidade

- [ ] **2.2** Criar tipo `UserPermissions` detalhado
  - Definir interface com todas as permissões
  - Incluir JSDoc com descrições

- [ ] **2.3** Atualizar tipo `User` para incluir permissions tipadas
  - Garantir que permissions seja do tipo correto
  - Não quebrar código existente

---

### **FASE 3: Interface - Modal de Adicionar Membro** 🎨

- [ ] **3.1** Localizar componente do modal
  - Arquivo: `src/app/admin/equipe/page.tsx` (linha do screenshot)
  - Identificar onde está o select de "Função"

- [ ] **3.2** Adicionar seção de Permissões com checkboxes
  - Posição: Entre "Departamento" e "Telefone"
  - Componente: `<PermissionsCheckboxes>`

- [ ] **3.3** Criar componente `PermissionsCheckboxes`
  - Arquivo: `src/components/admin/PermissionsCheckboxes.tsx`
  - Props: `role, permissions, onChange`

- [ ] **3.4** Implementar lógica de checkboxes
  - Se role = 'admin': todas marcadas + desabilitadas
  - Se role = 'colaborador': aplicar preset padrão
  - Permitir alteração manual das permissões

- [ ] **3.5** Criar presets de permissões
  - Preset "Administrador": tudo true
  - Preset "Colaborador Padrão": financeiro e equipe false
  - Preset "Colaborador Financeiro": só financeiro true
  - Preset "Colaborador Projetos": só projetos true

---

### **FASE 4: API de Criação/Edição de Membros** 🔌

- [ ] **4.1** Atualizar API `/api/admin/team-members/route.ts` (POST)
  - Aceitar campo `permissions` no body
  - Salvar permissions no banco corretamente

- [ ] **4.2** Atualizar API `/api/admin/team-members/[id]/route.ts` (PATCH)
  - Permitir atualização de permissions
  - Validar estrutura do JSON

- [ ] **4.3** Adicionar validação de permissions
  - Garantir que todas as chaves estão presentes
  - Valores são boolean

---

### **FASE 5: Middleware de Autenticação** 🔐

- [ ] **5.1** Atualizar `src/middleware.ts`
  - Aceitar `role = 'colaborador'` em rotas `/admin/*`
  - Linha atual que verifica: buscar `role === 'admin'`

- [ ] **5.2** Adicionar verificação de permissões específicas (opcional)
  - Bloquear `/admin/financeiro` se `can_view_financials = false`
  - Bloquear `/admin/equipe` se `can_manage_team = false`

---

### **FASE 6: AdminLayout - Navegação** 🧭

- [ ] **6.1** Atualizar `src/app/admin/layout.tsx`
  - Obter `user.permissions` do contexto
  - Filtrar tabs baseado em permissions

- [ ] **6.2** Implementar lógica de exibição de tabs
  - Painel: sempre visível (mas conteúdo varia)
  - Projetos: se `can_view_projects` (assumir true se não especificado)
  - Clientes: se `can_view_clients` (assumir true se não especificado)
  - Financeiro: se `can_view_financials = true`
  - Equipe: se `can_manage_team = true`
  - Notificações: sempre visível
  - Preferências: sempre visível (mas conteúdo varia)

---

### **FASE 7: Páginas - Controle de Acesso** 🚪

- [ ] **7.1** Atualizar `/admin/painel/page.tsx`
  - Ocultar seção de faturamento se `can_view_dashboard_financials = false`
  - Mostrar cards de projetos e atividades normalmente

- [ ] **7.2** Atualizar `/admin/financeiro/page.tsx`
  - Adicionar verificação no topo da página
  - Redirecionar para painel se sem permissão

- [ ] **7.3** Atualizar `/admin/equipe/page.tsx`
  - Adicionar verificação no topo da página
  - Redirecionar para painel se sem permissão

- [ ] **7.4** Atualizar `/admin/preferencias/page.tsx`
  - Ocultar configurações de tenant se `can_edit_preferences = false`
  - Permitir edição de preferências pessoais sempre

---

### **FASE 8: APIs - Verificação de Permissões** 🔒

- [ ] **8.1** Criar helper de verificação de permissões
  - Arquivo: `src/lib/utils/check-permissions.ts`
  - Função: `checkUserPermission(user, permission)`

- [ ] **8.2** Atualizar APIs de projetos
  - `POST /api/projects`: verificar `can_create_projects`
  - `PATCH /api/projects/[id]`: verificar `can_edit_projects`
  - `DELETE /api/projects/[id]`: verificar `can_delete_projects`

- [ ] **8.3** Atualizar APIs financeiras
  - Todas as rotas em `/api/admin/billing/*`: verificar `can_view_financials`

- [ ] **8.4** Atualizar APIs de equipe
  - Todas as rotas em `/api/admin/team-members/*`: verificar `can_manage_team`

---

### **FASE 9: AuthContext - Carregar Permissões** 🔄

- [ ] **9.1** Atualizar `src/lib/contexts/AuthContext.tsx`
  - Garantir que `user.permissions` é carregado do banco
  - Incluir no estado do contexto

- [ ] **9.2** Criar hook `usePermissions()`
  - Facilita acesso às permissões em qualquer componente
  - Retorna objeto com flags booleanas

---

### **FASE 10: Testes e Validação** 🧪

- [ ] **10.1** Teste: Criar administrador
  - Verificar que todas permissões estão `true`
  - Confirmar acesso total

- [ ] **10.2** Teste: Criar colaborador padrão
  - Verificar permissões corretas (financeiro e equipe `false`)
  - Confirmar acesso limitado

- [ ] **10.3** Teste: Login como colaborador
  - Login em `/admin/login` funciona
  - Tabs de Financeiro e Equipe ocultas
  - Painel sem faturamento

- [ ] **10.4** Teste: Colaborador tenta acessar rota bloqueada
  - Navegar diretamente para `/admin/financeiro`
  - Deve ser redirecionado ou ver mensagem de erro

- [ ] **10.5** Teste: Editar permissões de colaborador
  - Adicionar permissão de financeiro
  - Verificar que tab aparece após reload

- [ ] **10.6** Teste: APIs respeitam permissões
  - Colaborador sem `can_delete_projects` tenta deletar
  - Deve receber erro 403

---

### **FASE 11: Documentação e Scripts** 📚

- [ ] **11.1** Criar guia de uso para administradores
  - Como adicionar colaboradores
  - Como configurar permissões personalizadas

- [ ] **11.2** Atualizar README ou docs principais
  - Documentar sistema de roles
  - Explicar estrutura de permissions

---

## 🎨 UI/UX - Checkboxes de Permissões

### **Design do componente no modal:**

```
┌─────────────────────────────────────────┐
│  Função: [Colaborador ▼]                │
├─────────────────────────────────────────┤
│  📋 Permissões de Acesso:               │
│                                         │
│  ☑ Painel Completo                      │
│  ☐ Painel Limitado (sem faturamento)   │
│                                         │
│  ☑ Projetos                             │
│    ☑ Criar projetos                     │
│    ☑ Editar projetos                    │
│    ☐ Deletar projetos                   │
│                                         │
│  ☑ Clientes                             │
│    ☑ Visualizar clientes                │
│    ☑ Editar clientes                    │
│                                         │
│  ☐ Financeiro                           │
│  ☐ Equipe                               │
│  ☑ Preferências                         │
└─────────────────────────────────────────┘
```

---

## 🔐 Segurança

### **Considerações importantes:**

1. ✅ **Verificação no backend:** Sempre verificar permissões nas APIs, não confiar apenas no frontend
2. ✅ **Fallback seguro:** Se permissão não existir, assumir `false` por padrão
3. ✅ **Auditoria:** Registrar mudanças de permissões (quem alterou, quando)
4. ✅ **Superadmin:** Manter role `superadmin` com acesso total sempre
5. ⚠️ **Produção:** Testar extensivamente em staging antes de aplicar

---

## 🚀 Ordem de Execução Recomendada

### **Dia 1: Fundação**
1. FASE 1: Banco de Dados (1h)
2. FASE 2: Tipos TypeScript (30min)
3. FASE 5: Middleware (30min)
4. Testar login básico de colaborador

### **Dia 2: Interface**
5. FASE 3: Modal de Permissões (2h)
6. FASE 4: APIs de criação/edição (1h)
7. Testar criação de colaborador com permissões

### **Dia 3: Navegação e Páginas**
8. FASE 6: AdminLayout (1h)
9. FASE 7: Páginas (2h)
10. Testar navegação e acesso

### **Dia 4: APIs e Finalização**
11. FASE 8: APIs com verificação (2h)
12. FASE 9: AuthContext (30min)
13. FASE 10: Testes completos (2h)

### **Dia 5: Documentação e Deploy**
14. FASE 11: Documentação (1h)
15. Testes finais em staging
16. Deploy para produção

---

## ⚠️ AVISOS IMPORTANTES

### **ANTES DE COMEÇAR:**
- [ ] ✅ Fazer backup completo do banco de dados
- [ ] ✅ Testar em ambiente de staging primeiro
- [ ] ✅ Avisar equipe sobre alterações
- [ ] ✅ Ter plano de rollback pronto

### **DURANTE IMPLEMENTAÇÃO:**
- [ ] ⚠️ Não alterar lógica de `role = 'cliente'` existente
- [ ] ⚠️ Manter retrocompatibilidade com admins existentes
- [ ] ⚠️ Testar cada fase antes de prosseguir
- [ ] ⚠️ Commitar código frequentemente

### **APÓS IMPLEMENTAÇÃO:**
- [ ] ✅ Monitorar logs por 24h
- [ ] ✅ Verificar se admins existentes ainda funcionam
- [ ] ✅ Documentar mudanças no changelog
- [ ] ✅ Treinar equipe no novo sistema

---

## 📊 Estimativas

| Fase | Tempo Estimado | Complexidade |
|------|---------------|--------------|
| Banco de Dados | 1h | Baixa |
| Tipos TypeScript | 30min | Baixa |
| Interface Modal | 2-3h | Média |
| APIs | 1-2h | Média |
| Middleware | 30min | Baixa |
| AdminLayout | 1h | Média |
| Páginas | 2h | Média |
| APIs Verificação | 2-3h | Alta |
| AuthContext | 30min | Baixa |
| Testes | 2-3h | Alta |
| Documentação | 1h | Baixa |
| **TOTAL** | **13-18h** | - |

---

## ✅ Critérios de Sucesso

A implementação será considerada bem-sucedida quando:

1. ✅ Colaborador consegue fazer login em `/admin/login`
2. ✅ Colaborador vê apenas tabs permitidas
3. ✅ Colaborador não consegue acessar rotas bloqueadas
4. ✅ APIs retornam 403 para ações sem permissão
5. ✅ Administrador mantém acesso total (retrocompatibilidade)
6. ✅ Permissões podem ser editadas via interface
7. ✅ Sistema é estável em produção por 48h

---

**Data de criação:** 11/01/2025
**Versão:** 1.0
**Status:** 📋 Planejamento completo - Pronto para implementação
