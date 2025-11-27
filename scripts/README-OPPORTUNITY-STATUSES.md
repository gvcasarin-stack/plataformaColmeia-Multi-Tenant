# Scripts de Configuração do Funil de Vendas (Opportunity Statuses)

## 📋 Visão Geral

Esta pasta contém scripts SQL para configurar e corrigir os status do funil de vendas (opportunity_statuses) no sistema multi-tenant.

## 🎯 Ordem Correta dos Status

Os status padrão do funil de vendas seguem esta ordem:

| Position | Nome             | Cor       | Descrição                           |
|----------|------------------|-----------|-------------------------------------|
| 0        | Novo Lead        | `#10B981` | Lead recém-capturado                |
| 1        | Qualificação     | `#3B82F6` | Lead em processo de qualificação    |
| 2        | Proposta Enviada | `#8B5CF6` | Proposta comercial enviada          |
| 3        | Negociação       | `#F59E0B` | Em negociação ativa                 |
| 4        | Ganho            | `#22C55E` | Negócio fechado com sucesso (✅)    |
| 5        | Perdido          | `#EF4444` | Oportunidade perdida (❌)           |

## 📄 Scripts Disponíveis

### 1. `fix-opportunity-statuses-order.sql`

**Quando usar:** Para corrigir a ordem e adicionar status faltantes em UM tenant específico.

**O que faz:**
- Verifica se "Novo Lead" e "Qualificação" existem
- Cria os status faltantes se necessário
- Corrige a ordem (position) de todos os status
- Atualiza apenas o tenant especificado

**Como usar:**
1. Abra o arquivo `fix-opportunity-statuses-order.sql`
2. **IMPORTANTE:** Localize a linha `v_tenant_id UUID := '...'`
3. Substitua pelo seu `tenant_id` correto
4. Execute o script no Supabase SQL Editor

**Exemplo:**
```sql
-- Antes de executar, ajuste o tenant_id:
v_tenant_id UUID := '061ff77b-8b3a-4732-9158-a574c1f1690a';
```

---

### 2. `populate-opportunity-statuses-all-tenants.sql`

**Quando usar:** Para popular status padrão em TODOS os tenants que ainda não têm status configurados.

**O que faz:**
- Percorre todos os tenants do sistema
- Para cada tenant SEM status, cria os 6 status padrão
- Pula tenants que já possuem status configurados
- Útil para novos tenants ou migração em massa

**Como usar:**
1. Abra o arquivo `populate-opportunity-statuses-all-tenants.sql`
2. Execute diretamente no Supabase SQL Editor
3. Não precisa alterar nenhum valor

**Segurança:**
- ✅ Só cria status em tenants que não têm nenhum status
- ✅ Nunca sobrescreve configurações existentes
- ✅ Cada tenant mantém suas customizações

---

## 🔍 Como Verificar o Resultado

Após executar qualquer script, use esta query para verificar:

```sql
SELECT
    o.slug AS tenant,
    os.name AS status_name,
    os.position,
    os.color,
    os.is_won,
    os.is_lost
FROM opportunity_statuses os
INNER JOIN organizations o ON os.tenant_id = o.id
WHERE o.id = 'SEU_TENANT_ID_AQUI' -- Opcional: filtrar por tenant
ORDER BY os.position;
```

**Resultado esperado:**
```
 position | status_name       | color   | is_won | is_lost
----------+-------------------+---------+--------+---------
    0     | Novo Lead         | #10B981 | false  | false
    1     | Qualificação      | #3B82F6 | false  | false
    2     | Proposta Enviada  | #8B5CF6 | false  | false
    3     | Negociação        | #F59E0B | false  | false
    4     | Ganho             | #22C55E | true   | false
    5     | Perdido           | #EF4444 | false  | true
```

---

## 🎨 Customização por Tenant

### ✅ O que cada tenant PODE customizar:

- ✅ Nomes dos status (ex: "Qualificação" → "Análise Técnica")
- ✅ Cores dos status
- ✅ Ordem dos status (position)
- ✅ Adicionar novos status personalizados
- ✅ Remover status que não usa
- ✅ Marcar status como "ganho" ou "perdido"

### 🔒 O que é ISOLADO por tenant:

- 🔒 Cada tenant tem seus próprios status na tabela `opportunity_statuses`
- 🔒 O campo `tenant_id` garante isolamento completo
- 🔒 RLS (Row Level Security) impede acesso entre tenants
- 🔒 Um tenant nunca vê os status de outro tenant

---

## 📊 Estrutura da Tabela

```sql
CREATE TABLE opportunity_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) NOT NULL,         -- Formato: #RRGGBB
    position INTEGER NOT NULL,          -- Ordem no kanban (0-N)
    is_default BOOLEAN DEFAULT false,
    is_final BOOLEAN DEFAULT false,
    is_won BOOLEAN DEFAULT false,       -- Status de "ganho"
    is_lost BOOLEAN DEFAULT false,      -- Status de "perdido"
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚨 Importante

1. **Backup antes de executar:** Sempre faça backup antes de executar scripts SQL
2. **Teste primeiro:** Execute em ambiente de homologação antes de produção
3. **Verifique o tenant_id:** Confirme o tenant_id correto antes de executar
4. **Não delete status com oportunidades:** Se um status tem oportunidades vinculadas, não delete-o
5. **Mantenha "Ganho" e "Perdido":** São status importantes para métricas

---

## 🔄 Fluxo Recomendado

### Para um novo tenant:
1. O sistema cria automaticamente os status padrão quando o tenant acessa `/admin/funil-vendas` pela primeira vez
2. Ou use o script `populate-opportunity-statuses-all-tenants.sql` para popular em massa

### Para corrigir um tenant existente:
1. Use o script `fix-opportunity-statuses-order.sql`
2. Ajuste o `tenant_id`
3. Execute e verifique

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do Supabase
2. Confirme que o `tenant_id` está correto
3. Verifique se há oportunidades vinculadas aos status antes de deletar
