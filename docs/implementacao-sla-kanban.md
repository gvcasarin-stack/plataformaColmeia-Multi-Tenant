# Implementação de SLA (Prazos) no Kanban

**Data:** 14/01/2025
**Status:** Parcialmente implementado - Backend completo, Frontend pronto, aguardando execução de migration

---

## 📋 Resumo

Sistema de SLA (Service Level Agreement) para controle de prazos por etapa no Kanban. Permite configurar um prazo máximo em horas para cada status de projeto, com opção de ignorar finais de semana.

---

## ✅ O que foi implementado

### 1. **Banco de Dados**

#### Script SQL criado: `scripts/add-sla-fields-to-project-statuses.sql`

**Campos adicionados em `project_statuses`:**
- `sla_hours` (INTEGER, nullable): Prazo em horas para este status
- `sla_exclude_weekends` (BOOLEAN, default: true): Se ignora finais de semana no cálculo

**Campos adicionados em `projects`:**
- `status_changed_at` (TIMESTAMP, nullable): Quando o projeto mudou para o status atual
- `sla_expires_at` (TIMESTAMP, nullable): Quando o prazo SLA expira
- `sla_expired` (BOOLEAN, default: false): Flag indicando se o prazo foi ultrapassado

**Índice criado:**
- `idx_projects_sla_expired` para consultas otimizadas de projetos com SLA expirado

#### ⚠️ **AÇÃO NECESSÁRIA:**
```bash
# Execute o script SQL no banco de dados:
psql -h <host> -U <user> -d <database> -f scripts/add-sla-fields-to-project-statuses.sql
```

---

### 2. **Backend / API**

#### Arquivo: `src/app/api/project-statuses/route.ts`
- ✅ API GET atualizada para retornar campos `sla_hours` e `sla_exclude_weekends`

#### Arquivo: `src/app/api/project-statuses/[id]/route.ts`
- ✅ API PUT atualizada para aceitar e salvar configurações de SLA
- ✅ Validações implementadas (sla_hours deve ser positivo)

---

### 3. **Frontend / Interface**

#### Arquivo: `src/app/admin/preferencias/page.tsx`
- ✅ Página de Preferências refatorada com abas modernas (Geral, Projetos, Kanban, Financeiro)
- ✅ Seções expansíveis (collapsible) para melhor UX
- ✅ Nova aba "Kanban" com interface completa de configuração de SLA:
  - Lista todas as colunas do Kanban
  - Campo para configurar prazo em horas
  - Checkbox para ignorar finais de semana
  - Indicador visual de cor da coluna
  - Badge mostrando status padrão
  - Contador de projetos por status
  - Botões de ação (Cancelar/Salvar)

#### Arquivo: `src/lib/services/kanbanService.ts`
- ✅ Interface `ProjectStatusInfo` atualizada com campos SLA
- ✅ Função `getProjectStatuses()` retorna configurações de SLA
- ✅ Nova função `updateStatusSLA()` para salvar configurações

---

### 4. **Cartões do Kanban**

#### Arquivo: `src/components/kanban/KanbanBoard.tsx`
- ⚠️ Placeholder adicionado para badge de SLA nos cartões
- ❌ Lógica de cálculo de prazo **NÃO IMPLEMENTADA** ainda

---

## ❌ O que ainda falta implementar

### 1. **Calcular e exibir SLA nos cartões** (PENDENTE)

**Lógica necessária:**

```typescript
// Exemplo de função para calcular tempo restante
function calculateSLAStatus(project: Project, column: Column) {
  if (!column.slaHours || !project.status_changed_at) {
    return null; // Sem SLA configurado
  }

  const now = new Date();
  const statusChangedAt = new Date(project.status_changed_at);
  const slaExpiresAt = new Date(project.sla_expires_at);

  // Calcular diferença em milissegundos
  const msRemaining = slaExpiresAt.getTime() - now.getTime();
  const hoursRemaining = msRemaining / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    // Prazo expirado
    const hoursOverdue = Math.abs(hoursRemaining);
    return {
      status: 'expired',
      hoursOverdue: Math.floor(hoursOverdue),
      color: 'red'
    };
  }

  // Calcular percentual restante
  const totalHours = column.slaHours;
  const percentageRemaining = (hoursRemaining / totalHours) * 100;

  if (percentageRemaining < 25) {
    // Alerta (< 25% do prazo)
    return {
      status: 'warning',
      hoursRemaining: Math.floor(hoursRemaining),
      color: 'yellow'
    };
  }

  // Prazo OK
  return {
    status: 'ok',
    hoursRemaining: Math.floor(hoursRemaining),
    color: 'green'
  };
}
```

**Badge visual nos cartões:**

```tsx
{/* Badge de SLA */}
{(() => {
  const slaStatus = calculateSLAStatus(project, column);

  if (!slaStatus) return null;

  if (slaStatus.status === 'expired') {
    return (
      <div className="mt-2">
        <Badge className="w-full justify-center bg-red-100 text-red-700 border-red-300">
          <Clock className="h-3 w-3 mr-1" />
          ATRASADO {slaStatus.hoursOverdue}h
        </Badge>
      </div>
    );
  }

  if (slaStatus.status === 'warning') {
    return (
      <div className="mt-2">
        <Badge className="w-full justify-center bg-yellow-100 text-yellow-700 border-yellow-300">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {slaStatus.hoursRemaining}h restantes
        </Badge>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <Badge className="w-full justify-center bg-green-100 text-green-700 border-green-300">
        <Clock className="h-3 w-3 mr-1" />
        {slaStatus.hoursRemaining}h restantes
      </Badge>
    </div>
  );
})()}
```

---

### 2. **Atualizar `status_changed_at` e `sla_expires_at`** (PENDENTE)

Quando um projeto muda de status, precisa:

**Local:** Provavelmente em `src/lib/actions/project-actions.ts` ou onde projetos são atualizados

```typescript
async function updateProjectStatus(projectId: string, newStatus: string) {
  // 1. Buscar SLA do novo status
  const status = await getStatusInfo(newStatus);

  // 2. Calcular vencimento
  const now = new Date();
  let slaExpiresAt = null;

  if (status.sla_hours) {
    // Calcular data de expiração
    slaExpiresAt = new Date(now.getTime() + status.sla_hours * 60 * 60 * 1000);

    // Se ignorar fins de semana, ajustar
    if (status.sla_exclude_weekends) {
      slaExpiresAt = addBusinessHours(now, status.sla_hours);
    }
  }

  // 3. Atualizar projeto
  await supabase
    .from('projects')
    .update({
      status: newStatus,
      status_changed_at: now.toISOString(),
      sla_expires_at: slaExpiresAt?.toISOString() || null,
      sla_expired: false  // Resetar flag
    })
    .eq('id', projectId);
}

// Função helper para adicionar horas úteis (excluindo fins de semana)
function addBusinessHours(startDate: Date, hours: number): Date {
  const result = new Date(startDate);
  let remainingHours = hours;

  while (remainingHours > 0) {
    result.setHours(result.getHours() + 1);

    // Se não for fim de semana (0 = Domingo, 6 = Sábado)
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      remainingHours--;
    }
  }

  return result;
}
```

---

### 3. **Job/Cron para verificar SLAs expirados** (PENDENTE)

Criar um job que roda periodicamente (a cada 30min ou 1h) para:

1. Buscar projetos com `sla_expires_at < now()` e `sla_expired = false`
2. Marcar como `sla_expired = true`
3. Enviar notificações para responsáveis
4. Adicionar evento na timeline do projeto

**Possíveis implementações:**
- Vercel Cron Job (se hospedado na Vercel)
- Supabase Edge Function com trigger
- API route chamada por serviço externo (cron-job.org)

---

### 4. **Notificações** (PENDENTE)

Implementar sistema de notificações quando:
- Prazo está próximo de expirar (ex: falta 25% do tempo)
- Prazo expirou

---

## 🚀 Como usar (após executar migration)

### 1. Configurar SLA das colunas

1. Acesse **Admin > Preferências**
2. Clique na aba **Kanban**
3. Para cada coluna:
   - Digite o prazo em horas (ex: 24, 48, 72)
   - Marque "Ignorar finais de semana" se desejar
   - Deixe vazio para não aplicar prazo
4. Clique em **Salvar Configurações**

### 2. Visualizar SLA nos cartões (quando implementado)

- **Verde**: Prazo OK (mais de 25% do tempo restante)
- **Amarelo**: Alerta (menos de 25% do tempo restante)
- **Vermelho**: Atrasado (prazo expirado)

---

## 📊 Estrutura de arquivos modificados

```
src/
├── app/
│   ├── admin/
│   │   └── preferencias/
│   │       └── page.tsx                    ✅ Refatorado com abas + SLA
│   └── api/
│       └── project-statuses/
│           ├── route.ts                     ✅ GET com campos SLA
│           └── [id]/
│               └── route.ts                 ✅ PUT aceita SLA
├── components/
│   └── kanban/
│       └── KanbanBoard.tsx                  ⚠️ Placeholder para badge SLA
├── lib/
│   └── services/
│       └── kanbanService.ts                 ✅ Interface + função updateStatusSLA
└── types/
    └── project.ts                           (sem mudanças necessárias)

scripts/
└── add-sla-fields-to-project-statuses.sql   ✅ Migration SQL criada

docs/
└── implementacao-sla-kanban.md              📄 Este documento
```

---

## 🔍 Testes recomendados

Após executar a migration:

1. ✅ Acessar `/admin/preferencias` e verificar se a aba Kanban carrega
2. ✅ Configurar SLA de 24h em uma coluna e salvar
3. ✅ Verificar no banco se o valor foi salvo corretamente
4. ✅ Recarregar a página e ver se o valor persiste
5. ❌ Mover um projeto para a coluna com SLA e verificar cálculo (quando implementado)
6. ❌ Aguardar expiração e verificar notificação (quando implementado)

---

## 📝 Próximos passos recomendados

1. **Executar migration SQL** no banco de dados de produção
2. **Implementar lógica de cálculo de SLA** nos cartões do Kanban
3. **Atualizar status_changed_at** quando projeto muda de coluna
4. **Implementar job** para marcar projetos com SLA expirado
5. **Adicionar notificações** de prazo próximo/expirado
6. **Testar em ambiente de homologação** antes de produção

---

## ⚠️ Observações importantes

- Os campos SLA são **opcionais** por coluna (nullable)
- Se `sla_hours` for `null`, não há prazo para aquela coluna
- A flag `sla_exclude_weekends` só tem efeito se `sla_hours` estiver configurado
- O cálculo do prazo deve ser feito no **momento em que o projeto entra na coluna**
- Projetos que já estão em colunas antes da implementação **não terão prazo** (status_changed_at será null)

---

## 🐛 Possíveis problemas

1. **Migration já executada**: O script usa `ADD COLUMN IF NOT EXISTS`, é seguro executar múltiplas vezes
2. **Campos já existem**: Verificar se migration foi executada anteriormente
3. **Performance**: O índice `idx_projects_sla_expired` garante boas consultas

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs no console do navegador (F12)
2. Verificar logs do servidor (Vercel/Supabase)
3. Consultar este documento para estrutura esperada
