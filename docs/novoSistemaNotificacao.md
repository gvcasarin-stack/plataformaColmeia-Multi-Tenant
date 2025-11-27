# Novo Sistema de Notificações - Baseado em Responsável do Projeto

## Objetivo

Implementar sistema de notificações inteligente que reduz ruído e direciona notificações apenas para os membros relevantes, baseado na existência ou não de um responsável atribuído ao projeto.

---

## Especificação Completa

### Princípios Fundamentais

1. **Quem EXECUTA a ação → NÃO recebe notificação**
2. **Quem SOFRE a ação → RECEBE notificação**
3. **Cliente SEMPRE é notificado das ações dos admins** (exceto quando ele mesmo executou)
4. **Projetos sem responsável = ALERTA para toda equipe**
5. **Projetos com responsável = Canal direto cliente ↔ responsável**

---

## Matriz de Notificações

```
┌────────────────────────────┬──────────┬───────┬────────┬────────────┬─────────┐
│ AÇÃO                       │ Superadm │ Admin │ Colab  │ Responsáv  │ Cliente │
├────────────────────────────┼──────────┼───────┼────────┼────────────┼─────────┤
│ Cliente cria projeto       │    ✅    │  ✅   │   ❌   │     -      │   ❌*   │
│ Cliente age (sem resp)     │    ✅    │  ✅   │   ✅   │     -      │   ❌*   │
│ Cliente age (com resp)     │    ❌    │  ❌   │   ❌   │    ✅      │   ❌*   │
│ Responsável age            │    ❌    │  ❌   │   ❌   │    ❌*     │   ✅    │
│ Outro admin age            │    ❌    │  ❌   │   ❌   │    ✅      │   ✅    │
│ Status muda                │    ❌    │  ❌   │   ❌   │    ❌*     │   ✅    │
│ Atribui responsável        │   ❌**   │ ❌**  │   ❌   │    ✅      │   ❌    │
│ Transfere responsável      │   ❌**   │ ❌**  │   ❌   │  ✅(ambos) │   ❌    │
└────────────────────────────┴──────────┴───────┴────────┴────────────┴─────────┘

Legenda:
✅ Notificado
❌ NÃO notificado
❌* Não notificado (autor da ação)
❌** Não notificado (executor da ação)
- Não aplicável
```

---

## Cenários Detalhados

### 1️⃣ PROJETO NOVO (recém-criado, sem responsável)

**Situação**: Cliente cria um novo projeto

**Quem é notificado**:
- ✅ Admins (role: 'admin')
- ✅ Superadmin (role: 'superadmin')

**Quem NÃO é notificado**:
- ❌ Colaboradores (role: 'colaborador')
- ❌ Cliente (ele criou, já sabe)

**Justificativa**: Apenas admins e superadmin podem atribuir responsáveis. Colaboradores só trabalham quando atribuídos.

---

### 2️⃣ PROJETO SEM RESPONSÁVEL (existe, mas ninguém assumiu)

**Situação**: Cliente age (comenta ou envia documento) em projeto sem responsável

**Quem é notificado**:
- ✅ Admins (role: 'admin')
- ✅ Superadmin (role: 'superadmin')
- ✅ Colaboradores (role: 'colaborador')

**Quem NÃO é notificado**:
- ❌ Cliente (ele agiu, já sabe)

**Justificativa**: Projeto órfão = ALERTA MÁXIMO. Todos precisam ver que tem cliente esperando. Qualquer um pode assumir responsabilidade.

---

### 3️⃣ PROJETO COM RESPONSÁVEL - Cliente age

**Situação**: Cliente comenta ou envia documento em projeto que tem responsável

**Quem é notificado**:
- ✅ APENAS o responsável (admin_responsible_id)

**Quem NÃO é notificado**:
- ❌ Outros admins
- ❌ Superadmin
- ❌ Colaboradores
- ❌ Cliente (ele agiu, já sabe)

**Justificativa**: Canal direto cliente ↔ responsável. Reduz ruído para outros membros.

---

### 4️⃣ PROJETO COM RESPONSÁVEL - Responsável age

**Situação**: Responsável comenta ou envia documento

**Quem é notificado**:
- ✅ APENAS o cliente

**Quem NÃO é notificado**:
- ❌ Responsável (ele agiu, já sabe)
- ❌ Outros admins
- ❌ Superadmin
- ❌ Colaboradores

**Justificativa**: Cliente precisa saber das atualizações. Equipe interna não precisa.

---

### 5️⃣ PROJETO COM RESPONSÁVEL - Outro admin age

**Situação**: Admin/Colaborador diferente do responsável comenta ou envia documento

**Quem é notificado**:
- ✅ Responsável do projeto
- ✅ Cliente

**Quem NÃO é notificado**:
- ❌ Quem agiu (já sabe)
- ❌ Outros admins
- ❌ Superadmin

**Justificativa**: Responsável precisa saber que alguém mexeu no projeto dele. Cliente vê transparência/colaboração da equipe.

---

### 6️⃣ MUDANÇA DE STATUS

**Situação**: Admin/Responsável muda status do projeto

**Quem é notificado**:
- ✅ APENAS o cliente

**Quem NÃO é notificado**:
- ❌ Quem mudou (já sabe)
- ❌ Responsável (geralmente é quem muda)
- ❌ Outros admins

**Justificativa**: Status é informação para cliente acompanhar evolução. Equipe interna já sabe.

---

### 7️⃣ ATRIBUIÇÃO DE RESPONSÁVEL (primeira vez)

**Situação**: Admin/Superadmin atribui responsável para projeto que não tinha

**Quem é notificado**:
- ✅ APENAS o novo responsável

**Quem NÃO é notificado**:
- ❌ Quem atribuiu (executou a ação, já sabe)
- ❌ Cliente (mudança interna)
- ❌ Outros admins

**Justificativa**: Responsável precisa saber que pegou novo projeto. Atribuição é processo interno.

---

### 8️⃣ TRANSFERÊNCIA DE RESPONSABILIDADE

**Situação**: Admin/Superadmin transfere responsabilidade de A para B

**Quem é notificado**:
- ✅ Admin A (removido) - recebe: "Você foi removido como responsável"
- ✅ Admin B (atribuído) - recebe: "Você foi atribuído como responsável"

**Quem NÃO é notificado**:
- ❌ Quem transferiu (executou a ação, já sabe)
- ❌ Cliente (mudança interna)
- ❌ Outros admins

**Justificativa**: Ambos precisam saber da mudança. A partir deste momento, A para de receber notificações do projeto e B começa a receber.

---

## Checklist de Implementação

### Fase 1: Análise e Preparação

- [x] Documentar especificação completa
- [ ] Identificar todos os pontos de criação de notificações no código
- [ ] Mapear funções que precisam ser alteradas
- [ ] Criar funções auxiliares para determinar destinatários

### Fase 2: Funções Auxiliares (criar novas)

- [ ] Criar `getNotificationRecipients()` - determina quem deve receber notificação
  - Parâmetros: projectId, actionType, actorId, actorRole
  - Retorna: lista de user IDs que devem ser notificados

- [ ] Criar `hasResponsible()` - verifica se projeto tem responsável
  - Parâmetros: projectId
  - Retorna: boolean + responsibleId (se existir)

- [ ] Criar `getAdminsAndSuperadmins()` - busca apenas admins + superadmin (não colaboradores)
  - Parâmetros: tenantId
  - Retorna: lista de admins + superadmin

- [ ] Criar `getAllAdminRoles()` - busca todos (admins + superadmin + colaboradores)
  - Parâmetros: tenantId
  - Retorna: lista de todos membros administrativos

### Fase 3: Atualizar Core de Notificações

**Arquivo**: `src/lib/services/notificationService/core.ts`

- [ ] Modificar `createNotificationForAllAdmins()`:
  - Adicionar parâmetro: `projectId` (obrigatório)
  - Adicionar parâmetro: `excludeAuthor` (já existe, manter)
  - Adicionar lógica: verificar se projeto tem responsável
  - Se SEM responsável: notificar todos (admins + colaboradores + superadmin)
  - Se COM responsável: notificar APENAS o responsável
  - Sempre excluir o autor da ação

- [ ] Adicionar `createNotificationForResponsible()`:
  - Nova função específica para notificar apenas o responsável
  - Parâmetros: projectId, notificationData
  - Verifica se projeto tem responsável
  - Cria notificação apenas para ele

### Fase 4: Atualizar Helpers de Notificação

**Arquivo**: `src/lib/services/notificationService/helpers.ts`

- [ ] Modificar `notifyNewProject()`:
  - Buscar apenas admins + superadmin (excluir colaboradores)
  - Usar `getAdminsAndSuperadmins()` ao invés de `getAllAdminUsersByTenant()`

- [ ] Modificar `notifyNewComment()`:
  - Verificar se projeto tem responsável
  - Se cliente comenta:
    - SEM responsável: notificar todos (admins + colaboradores + superadmin)
    - COM responsável: notificar APENAS o responsável
  - Se admin comenta:
    - Se é o responsável: notificar apenas cliente
    - Se é OUTRO admin: notificar responsável + cliente
  - Sempre excluir o autor

- [ ] Modificar `notifyNewDocument()`:
  - Verificar se projeto tem responsável
  - Se cliente envia:
    - SEM responsável: notificar todos (admins + colaboradores + superadmin)
    - COM responsável: notificar APENAS o responsável
  - Se admin envia:
    - Se é o responsável: notificar apenas cliente
    - Se é OUTRO admin: notificar responsável + cliente
  - Sempre excluir o autor

- [ ] Modificar `notifyStatusChange()`:
  - Sempre notificar APENAS o cliente
  - Nunca notificar equipe interna (quem mudou já sabe)

### Fase 5: Atualizar Serviço de E-mail

**Arquivo**: `src/lib/services/emailService.ts`

- [ ] Modificar `notifyAdminAboutComment()`:
  - Verificar se projeto tem responsável
  - SEM responsável: enviar para todos (admins + colaboradores + superadmin)
  - COM responsável: enviar APENAS para o responsável
  - Sempre excluir o autor (authorId)

- [ ] Modificar `notifyAdminAboutNewProject()`:
  - Buscar apenas admins + superadmin (excluir colaboradores)
  - Enviar e-mail apenas para esses

- [ ] Modificar `notifyAdminAboutDocument()`:
  - Verificar se projeto tem responsável
  - SEM responsável: enviar para todos (admins + colaboradores + superadmin)
  - COM responsável: enviar APENAS para o responsável

- [ ] Manter `notifyUserOfNewComment()`:
  - Já notifica apenas o cliente, está correto

- [ ] Manter `notifyUserOfNewDocument()`:
  - Já notifica apenas o cliente, está correto

- [ ] Manter `notifyStatusChangeV2()`:
  - Já notifica apenas o cliente, está correto

### Fase 6: Notificações de Atribuição de Responsável

**Novos endpoints ou lógica em**: `src/app/components/project-view/project-responsible-admin.tsx` (onde atribui responsável)

- [ ] Criar notificação quando responsável é atribuído (primeira vez):
  - Notificar APENAS o novo responsável
  - NÃO notificar quem atribuiu
  - Mensagem: "Você foi atribuído como responsável do projeto #X"

- [ ] Criar notificação quando responsável é transferido:
  - Notificar o responsável ANTIGO: "Você foi removido como responsável"
  - Notificar o responsável NOVO: "Você foi atribuído como responsável"
  - NÃO notificar quem transferiu

- [ ] Criar notificação quando responsável é removido (sem substituição):
  - Notificar APENAS o responsável removido
  - Mensagem: "Você foi removido como responsável do projeto #X"

### Fase 7: Funções de Suporte no Banco de Dados

**Verificar se já existem queries ou criar novas**:

- [ ] Query para buscar `admin_responsible_id` de um projeto
- [ ] Query para buscar apenas admins e superadmins (excluir colaboradores)
- [ ] Query para buscar todos os membros administrativos (incluir colaboradores)

### Fase 8: Testes

- [ ] Testar: Cliente cria projeto → apenas admins + superadmin notificados
- [ ] Testar: Cliente comenta sem responsável → todos notificados
- [ ] Testar: Cliente comenta com responsável → apenas responsável notificado
- [ ] Testar: Responsável comenta → apenas cliente notificado
- [ ] Testar: Outro admin comenta → responsável + cliente notificados
- [ ] Testar: Status muda → apenas cliente notificado
- [ ] Testar: Atribui responsável → apenas novo responsável notificado
- [ ] Testar: Transfere responsável → ambos notificados (antigo + novo)
- [ ] Testar: E-mails seguem mesma lógica das notificações in-app
- [ ] Testar: Cooldown de e-mail continua funcionando

### Fase 9: Validação e Refinamento

- [ ] Revisar logs de notificações (devLog)
- [ ] Confirmar que nenhum autor recebe notificação da própria ação
- [ ] Confirmar que cliente sempre é notificado das ações de admins
- [ ] Confirmar que projetos sem responsável geram alerta para todos
- [ ] Confirmar que projetos com responsável têm canal direto

---

## Arquivos que serão modificados

### Core (notificações in-app)
1. `src/lib/services/notificationService/core.ts`
   - `createNotificationForAllAdmins()` - modificar lógica baseada em responsável

2. `src/lib/services/notificationService/helpers.ts`
   - `notifyNewProject()` - filtrar apenas admins + superadmin
   - `notifyNewComment()` - adicionar lógica de responsável
   - `notifyNewDocument()` - adicionar lógica de responsável
   - `notifyStatusChange()` - manter apenas cliente (já está correto)

### E-mail
3. `src/lib/services/emailService.ts`
   - `notifyAdminAboutComment()` - adicionar lógica de responsável
   - `notifyAdminAboutNewProject()` - filtrar apenas admins + superadmin
   - `notifyAdminAboutDocument()` - adicionar lógica de responsável

### Interface (atribuição de responsável)
4. `src/app/components/project-view/project-responsible-admin.tsx`
   - Adicionar notificações ao atribuir/remover/transferir responsável

### Utilitários (possivelmente criar)
5. `src/lib/services/userService/core.ts` (verificar se funções já existem)
   - Garantir que existe função para buscar apenas admins + superadmin
   - Garantir que existe função para buscar todos (incluindo colaboradores)

---

## Regras de Negócio - Resumo

### Para Notificações IN-APP:

```javascript
function getNotificationRecipients(projectId, actionType, actorId, actorRole) {
  const project = getProject(projectId);
  const hasResponsible = !!project.admin_responsible_id;

  // Regra 1: NUNCA notificar o autor da ação
  let recipients = [];

  switch(actionType) {
    case 'new_project':
      // Apenas admins + superadmin
      recipients = getAdminsAndSuperadmins(project.tenant_id);
      break;

    case 'client_comment':
    case 'client_document':
      if (hasResponsible) {
        // Apenas o responsável
        recipients = [project.admin_responsible_id];
      } else {
        // Todos (admins + colaboradores + superadmin)
        recipients = getAllAdminRoles(project.tenant_id);
      }
      break;

    case 'admin_comment':
    case 'admin_document':
      if (actorId === project.admin_responsible_id) {
        // Responsável agiu: notificar apenas cliente
        recipients = [project.created_by];
      } else {
        // Outro admin agiu: notificar responsável + cliente
        recipients = [project.admin_responsible_id, project.created_by];
      }
      break;

    case 'status_change':
      // Sempre apenas o cliente
      recipients = [project.created_by];
      break;

    case 'assign_responsible':
      // Apenas o novo responsável
      recipients = [newResponsibleId];
      break;

    case 'transfer_responsible':
      // Antigo + novo responsável
      recipients = [oldResponsibleId, newResponsibleId];
      break;
  }

  // Filtrar o autor
  return recipients.filter(id => id !== actorId);
}
```

### Para E-mails:

Seguir EXATAMENTE a mesma lógica das notificações in-app, com cooldown de 5 minutos por usuário+projeto.

---

## Observações Importantes

1. **Backward compatibility**: Sistema deve continuar funcionando se projeto não tiver campo `admin_responsible_id` (tratar como "sem responsável")

2. **Cooldown de e-mail**: Manter sistema atual de cooldown de 5 minutos. Funciona bem para evitar spam.

3. **Logs**: Manter logs detalhados (devLog) para debug, especialmente nos primeiros dias após implementação.

4. **Colaboradores podem ser responsáveis**: Um colaborador pode ser atribuído como responsável de um projeto. Neste caso, ele recebe notificações como qualquer outro responsável.

5. **Superadmin não tem privilégio especial**: Superadmin só recebe notificações de:
   - Projetos novos
   - Projetos sem responsável quando cliente age
   - NÃO recebe de projetos com responsável (mesma regra que outros admins)

6. **Cliente sempre no loop**: Cliente SEMPRE é notificado das ações dos admins no projeto dele, independente de quem é o responsável.

7. **Transparência**: Quando outro admin age em projeto com responsável, AMBOS (responsável + cliente) são notificados para transparência.

---

## Métricas de Sucesso

Após implementação, validar:

- ✅ Redução de 70-90% no volume de notificações para membros não envolvidos
- ✅ Cliente continua recebendo 100% das notificações relevantes
- ✅ Projetos órfãos ficam visíveis para toda equipe
- ✅ Zero notificações duplicadas (autor recebendo própria ação)
- ✅ Cooldown de e-mail continua funcionando
- ✅ Nenhum erro ou quebra no fluxo existente

---

## Rollback Plan

Se algo der errado:

1. **Git revert**: Todos os arquivos modificados estão versionados
2. **Variável de feature flag**: Considerar criar `ENABLE_SMART_NOTIFICATIONS=true/false` para ligar/desligar novo sistema
3. **Logs detalhados**: Logs permitirão identificar problemas rapidamente

---

**Data de Criação**: 2025-01-15
**Status**: Pronto para implementação
**Complexidade**: Alta (múltiplos arquivos, lógica complexa)
**Risco**: Médio (notificações são críticas, mas não afetam dados do projeto)
