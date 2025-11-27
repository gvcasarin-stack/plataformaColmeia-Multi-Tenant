# 🐛 RELATÓRIO TÉCNICO: Bug na Criação de Projeto sem Pacote Ativo

**Data:** 27/11/2025
**Severidade:** 🔴 **CRÍTICA** - Bloqueia operação essencial do sistema
**Status:** ⚠️ Identificado - Aguardando correção

---

## 📋 RESUMO EXECUTIVO

O sistema está **bloqueando incorretamente** a criação de projetos quando o usuário possui `billing_mode = 'pacote'` mas não tem pacote ativo. O comportamento correto deveria ser **permitir a criação e cobrar como avulso**.

---

## 🔍 ANÁLISE DO PROBLEMA

### Comportamento Observado:

1. ✅ **Card de Informação** mostra corretamente: "Nenhum pacote ativo encontrado. Projetos serão cobrados como avulsos."
2. ❌ **API de Criação** retorna erro: "Nenhum pacote ativo encontrado" e **BLOQUEIA** a criação
3. ❌ Projeto **NÃO é criado** no banco de dados

### Comportamento Esperado:

1. ✅ Card informa que não há pacote ativo
2. ✅ API cria o projeto normalmente
3. ✅ Projeto é criado com `billing_mode = 'avulso'`
4. ✅ Notificações são enviadas (cliente + admin)

---

## 🔧 CAUSA RAIZ

**Arquivo:** `src/lib/actions/project-actions.ts`
**Linhas:** 1734-1740

### Código Problemático:

```typescript
// ✅ VALIDAÇÃO DE PACOTE
if (billingMode === 'pacote') {
  logger.info('[createProjectClientAction] Validando pacote do usuário...');

  // Buscar pacote ativo do usuário
  const { data: pacote, error: pacoteError } = await supabase
    .from('cliente_pacotes')
    .select(`
      *,
      pacote:pacotes_definicoes(*)
    `)
    .eq('user_id', ownerId)
    .eq('status', 'ativo')
    .single();

  // ❌ PROBLEMA: Retorna erro e bloqueia criação
  if (pacoteError || !pacote) {
    logger.warn('[createProjectClientAction] Nenhum pacote ativo encontrado para o usuário');
    return {
      error: 'Nenhum pacote ativo encontrado',
      message: 'Você precisa de um pacote ativo para criar projetos. Entre em contato com o administrador.'
    };
  }
```

### Por que está errado?

A lógica atual faz:
- **SE** `billing_mode = 'pacote'` E `!pacote_ativo` → **BLOQUEIA**

A lógica correta deveria ser:
- **SE** `billing_mode = 'pacote'` E `!pacote_ativo` → **CRIAR COMO AVULSO**

---

## 📊 CENÁRIOS AFETADOS

| Cenário | billing_mode | Pacote Ativo? | Comportamento Atual | Comportamento Correto |
|---------|--------------|---------------|---------------------|----------------------|
| 1 | `avulso` | N/A | ✅ Cria como avulso | ✅ Cria como avulso |
| 2 | `pacote` | ✅ Sim | ✅ Decrementa contador | ✅ Decrementa contador |
| 3 | `pacote` | ❌ Não (esgotado) | 🔴 **BLOQUEIA** | ✅ Cria como avulso |
| 4 | `pacote` | ❌ Não (expirado) | 🔴 **BLOQUEIA** | ✅ Cria como avulso |
| 5 | `pacote` | ❌ Não (inexistente) | 🔴 **BLOQUEIA** | ✅ Cria como avulso |
| 6 | `assinatura` | ✅ Sim | ✅ Decrementa contador | ✅ Decrementa contador |
| 7 | `assinatura` | ❌ Não (suspensa) | 🔴 **BLOQUEIA** | ✅ Cria como avulso |
| 8 | `assinatura` | ❌ Não (esgotada) | 🔴 **BLOQUEIA** | ✅ Cria como avulso |

**Total de cenários bloqueados:** 🔴 **4 de 8** (50% de falha!)

---

## 🎯 IMPACTO NO NEGÓCIO

### Problemas Causados:

1. **❌ Clientes Bloqueados**: Clientes com pacote expirado/esgotado não conseguem criar projetos
2. **❌ Perda de Receita**: Projetos que poderiam ser cobrados como avulso não são criados
3. **❌ Experiência Ruim**: Cliente vê mensagem "pode criar" mas sistema bloqueia
4. **❌ Suporte Sobrecarregado**: Clientes entram em contato reportando erro

### Fluxo de Erro Atual:

```
Cliente com pacote esgotado
  ↓
Abre modal de criação
  ↓
Card mostra: "Nenhum pacote ativo. Será cobrado como avulso." ✅
  ↓
Preenche todos os campos
  ↓
Clica "Criar Projeto"
  ↓
❌ ERRO: "Nenhum pacote ativo encontrado"
  ↓
❌ Projeto NÃO é criado
  ↓
Cliente frustrado 😠
```

---

## ✅ SOLUÇÃO PROPOSTA

### Alteração no Arquivo: `src/lib/actions/project-actions.ts`

**Linhas 1719-1799** (Validação de Pacote)

#### ANTES (Código Problemático):

```typescript
// ✅ VALIDAÇÃO DE PACOTE
if (billingMode === 'pacote') {
  const { data: pacote, error: pacoteError } = await supabase
    .from('cliente_pacotes')
    .select(`*,pacote:pacotes_definicoes(*)`)
    .eq('user_id', ownerId)
    .eq('status', 'ativo')
    .single();

  // ❌ BLOQUEIA criação
  if (pacoteError || !pacote) {
    return {
      error: 'Nenhum pacote ativo encontrado',
      message: 'Você precisa de um pacote ativo...'
    };
  }

  // Validações de expiração e quota...
  // Se passou, decrementa contador e cria snapshot
}
```

#### DEPOIS (Código Corrigido):

```typescript
// ✅ VALIDAÇÃO DE PACOTE
if (billingMode === 'pacote') {
  const { data: pacote, error: pacoteError } = await supabase
    .from('cliente_pacotes')
    .select(`*,pacote:pacotes_definicoes(*)`)
    .eq('user_id', ownerId)
    .eq('status', 'ativo')
    .single();

  // ✅ Se não tem pacote ativo, criar como AVULSO
  if (pacoteError || !pacote) {
    logger.warn('[createProjectClientAction] Nenhum pacote ativo - criando como AVULSO');

    // Mudar para modo avulso
    billingMode = 'avulso';
    billingSnapshot = {
      mode: 'avulso',
      potencia: potencia,
      valor_projeto: valorProjetoFinal,
      fallback_reason: 'pacote_nao_encontrado',
      original_mode: 'pacote',
      timestamp: new Date().toISOString()
    };

    // CONTINUA a criação (não retorna erro)
  }
  else {
    // Tem pacote ativo, validar expiração e quota
    // Se passar, decrementa contador e cria snapshot
  }
}
```

### Mesmo tratamento para Assinaturas (Linhas 1800-1889)

---

## 📝 CHECKLIST DE CORREÇÃO

- [ ] 1. Modificar validação de PACOTE (linhas 1719-1799)
  - [ ] Remover `return { error }` quando não encontrar pacote
  - [ ] Mudar `billingMode = 'avulso'` se não encontrar pacote
  - [ ] Criar snapshot com `fallback_reason`
  - [ ] Continuar com criação do projeto

- [ ] 2. Modificar validação de ASSINATURA (linhas 1800-1889)
  - [ ] Remover `return { error }` quando não encontrar assinatura
  - [ ] Mudar `billingMode = 'avulso'` se não encontrar assinatura
  - [ ] Criar snapshot com `fallback_reason`
  - [ ] Continuar com criação do projeto

- [ ] 3. Garantir que notificações sejam enviadas
  - [ ] Cliente: "Projeto criado como avulso"
  - [ ] Admin: "Cliente X criou projeto sem pacote ativo"

- [ ] 4. Testar cenários:
  - [ ] Cliente com pacote esgotado
  - [ ] Cliente com pacote expirado
  - [ ] Cliente com `billing_mode = 'pacote'` mas sem registro em `cliente_pacotes`
  - [ ] Cliente com assinatura suspensa
  - [ ] Cliente com assinatura esgotada

---

## 🔄 FLUXO CORRETO (APÓS CORREÇÃO)

```
Cliente com pacote esgotado
  ↓
Abre modal de criação
  ↓
Card mostra: "Pacote esgotado. Será cobrado como avulso." ⚠️
  ↓
Preenche todos os campos
  ↓
Clica "Criar Projeto"
  ↓
API detecta: billing_mode = 'pacote' mas !pacote_ativo
  ↓
✅ Muda para billing_mode = 'avulso'
  ↓
✅ Cria projeto com billing_snapshot.fallback_reason
  ↓
✅ Envia notificação para cliente: "Projeto criado como avulso"
  ↓
✅ Envia notificação para admin: "Cliente criou projeto sem pacote"
  ↓
✅ Projeto criado com sucesso!
  ↓
Cliente feliz 😊
```

---

## 🎯 MÉTRICAS DE SUCESSO (PÓS-CORREÇÃO)

### Cenários que devem funcionar:

| Métrica | Meta |
|---------|------|
| Taxa de sucesso de criação | 100% |
| Projetos bloqueados incorretamente | 0 |
| Notificações de fallback enviadas | 100% |
| Projetos avulsos criados quando pacote inativo | 100% |

---

## 🚀 PRIORIDADE DE IMPLEMENTAÇÃO

**Prioridade:** 🔴 **CRÍTICA** - Corrigir imediatamente

**Motivo:** Bloqueia funcionalidade essencial do sistema e causa perda de receita

**Tempo estimado:** 30-45 minutos
- 15 min: Implementar correção
- 15 min: Testar cenários
- 10 min: Commit e deploy
- 5 min: Validação em produção

---

## 📎 ARQUIVOS RELACIONADOS

1. **Arquivo Principal:** `src/lib/actions/project-actions.ts`
   - Função: `createProjectClientAction()`
   - Linhas afetadas: 1719-1889

2. **Serviço de Notificações:** `src/lib/services/billingNotificationService.ts`
   - Já implementado e pronto para uso

3. **API de Billing Status:** `src/app/api/user/[userId]/billing-status/route.ts`
   - Funcionando corretamente

4. **Componente Visual:** `src/components/project/BillingInfoCard.tsx`
   - Funcionando corretamente

---

## ✍️ AUTOR DO RELATÓRIO

**Sistema:** Claude Code
**Versão:** 4.5
**Data:** 27/11/2025
**Status:** Aguardando aprovação para correção
