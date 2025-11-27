# 🔧 Correção de Projetos Sem FK de Billing

**Data**: 2025-01-26
**Severidade**: 🟡 MÉDIA
**Status**: ✅ CORRIGIDO

---

## 📋 RESUMO EXECUTIVO

Foi identificado e corrigido um problema onde projetos criados com `billing_mode='pacote'` ou `billing_mode='assinatura'` não estavam sendo vinculados aos seus respectivos pacotes/assinaturas através das colunas FK (`cliente_pacote_id` e `cliente_assinatura_id`).

---

## 🐛 PROBLEMA IDENTIFICADO

### Situação

- **2 projetos** foram criados via pacote de cliente
- Os projetos **apareciam na aba Assinaturas** mas **não apareciam na aba Pacotes** do financeiro
- Análise revelou que os projetos tinham:
  - ✅ `billing_mode = 'pacote'` (correto)
  - ✅ `billing_snapshot` com dados do pacote (correto)
  - ✅ Contador de `projetos_usados` foi incrementado (correto)
  - ❌ `cliente_pacote_id = NULL` (PROBLEMA!)

### Causa Raiz

A API `src/app/api/projects/unified/route.ts` estava:
1. ✅ Buscando o pacote/assinatura corretamente
2. ✅ Validando disponibilidade e expirações
3. ✅ Decrementando contadores
4. ✅ Criando `billing_snapshot` com todos os dados
5. ❌ **MAS NÃO estava setando as colunas FK** (`cliente_pacote_id` e `cliente_assinatura_id`)

### Impacto

- ❌ Projetos "órfãos" não aparecem nas listagens de pacotes/assinaturas
- ❌ Impossível rastrear quais projetos pertencem a qual pacote/assinatura
- ❌ Relatórios financeiros incompletos
- ✅ Dados preservados no `billing_snapshot` (permitiu recuperação)

---

## ✅ CORREÇÕES APLICADAS

### 1. SQL para Corrigir Projetos Existentes

**Arquivo**: `scripts/fix-billing-fks-on-existing-projects.sql`

**O que faz**:
1. **Diagnóstico**: Identifica projetos órfãos (com billing_mode mas sem FK)
2. **Preview**: Mostra quais projetos serão corrigidos
3. **Correção de Pacotes**: Extrai `pacote_id` do `billing_snapshot` e preenche `cliente_pacote_id`
4. **Correção de Assinaturas**: Extrai `assinatura_id` do `billing_snapshot` e preenche `cliente_assinatura_id`
5. **Validação**: Verifica se ainda há projetos órfãos
6. **Relatório**: Mostra estatísticas finais

**Exemplo da correção**:
```sql
-- Corrigir projetos de pacotes órfãos
UPDATE projects
SET
  cliente_pacote_id = (billing_snapshot->>'pacote_id')::uuid,
  updated_at = NOW()
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot IS NOT NULL
  AND billing_snapshot->>'pacote_id' IS NOT NULL;
```

### 2. Correção na API Unified

**Arquivo**: `src/app/api/projects/unified/route.ts`

**Mudanças aplicadas**:

#### 2.1. Declaração de variáveis (Linha 307-308)
```typescript
// 🆕 ADICIONADO
let clientePacoteId: string | null = null;
let clienteAssinaturaId: string | null = null;
```

#### 2.2. Armazenar ID do Pacote (Linha 387-388)
```typescript
// 🆕 ADICIONADO - Quando billing_mode = 'pacote'
// ✅ Armazenar ID do pacote para FK
clientePacoteId = pacote.id;
```

#### 2.3. Armazenar ID da Assinatura (Linha 479-480)
```typescript
// 🆕 ADICIONADO - Quando billing_mode = 'assinatura'
// ✅ Armazenar ID da assinatura para FK
clienteAssinaturaId = assinatura.id;
```

#### 2.4. Adicionar FKs ao projectData (Linha 522-523)
```typescript
const projectData = {
  ...body,
  tenant_id: tenantId,
  status: body.status || 'nao-iniciado',
  pagamento: 'pendente',
  billing_mode: billingMode,
  billing_snapshot: billingSnapshot,
  cliente_pacote_id: clientePacoteId, // 🆕 ADICIONADO
  cliente_assinatura_id: clienteAssinaturaId, // 🆕 ADICIONADO
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

---

## 📝 INSTRUÇÕES PARA APLICAÇÃO

### Passo 1: Executar o SQL no Supabase

1. Acesse o **Supabase SQL Editor**
2. Abra o arquivo `scripts/fix-billing-fks-on-existing-projects.sql`
3. Execute o script completo
4. Verifique os logs/notices para confirmar:
   - ✅ Quantos projetos órfãos foram encontrados
   - ✅ Preview dos projetos que serão corrigidos
   - ✅ Quantos projetos foram vinculados
   - ✅ Se ainda há projetos órfãos (deve ser 0)

**IMPORTANTE**: Execute este script apenas UMA vez.

### Passo 2: Fazer Deploy do Código

As correções de código já estão aplicadas em:
- `src/app/api/projects/unified/route.ts`

Faça o deploy normalmente (Vercel, etc.).

### Passo 3: Testes de Validação

#### Teste 1: Validar Projetos Órfãos Foram Corrigidos
```bash
# Login como Admin
# Acesse /admin/financeiro -> Aba Pacotes
# Verifique se os 2 projetos agora aparecem
```

#### Teste 2: Criar Novo Projeto com Pacote
```bash
# Login como Cliente com pacote ativo
# Crie um novo projeto
# Acesse /admin/financeiro -> Aba Pacotes
# Verifique se o projeto aparece vinculado ao pacote
```

#### Teste 3: Criar Novo Projeto com Assinatura
```bash
# Login como Cliente com assinatura ativa
# Crie um novo projeto
# Acesse /admin/financeiro -> Aba Assinaturas
# Verifique se o projeto aparece vinculado à assinatura
```

---

## 🔍 VALIDAÇÃO TÉCNICA

### Queries de Verificação SQL

```sql
-- 1. Verificar se ainda há projetos órfãos de PACOTES
SELECT COUNT(*) as projetos_orfaos_pacote
FROM projects
WHERE billing_mode = 'pacote'
  AND cliente_pacote_id IS NULL
  AND billing_snapshot IS NOT NULL;
-- Deve retornar 0

-- 2. Verificar se ainda há projetos órfãos de ASSINATURAS
SELECT COUNT(*) as projetos_orfaos_assinatura
FROM projects
WHERE billing_mode = 'assinatura'
  AND cliente_assinatura_id IS NULL
  AND billing_snapshot IS NOT NULL;
-- Deve retornar 0

-- 3. Validar integridade dos FKs de PACOTES
SELECT p.id, p.number, p.cliente_pacote_id, cp.id as pacote_real
FROM projects p
LEFT JOIN cliente_pacotes cp ON p.cliente_pacote_id = cp.id
WHERE p.billing_mode = 'pacote'
  AND p.cliente_pacote_id IS NOT NULL
  AND cp.id IS NULL;
-- Deve retornar 0 linhas (todos os FKs devem existir)

-- 4. Validar integridade dos FKs de ASSINATURAS
SELECT p.id, p.number, p.cliente_assinatura_id, ca.id as assinatura_real
FROM projects p
LEFT JOIN cliente_assinaturas ca ON p.cliente_assinatura_id = ca.id
WHERE p.billing_mode = 'assinatura'
  AND p.cliente_assinatura_id IS NOT NULL
  AND ca.id IS NULL;
-- Deve retornar 0 linhas (todos os FKs devem existir)

-- 5. Estatísticas gerais
SELECT
  billing_mode,
  COUNT(*) as total_projetos,
  COUNT(cliente_pacote_id) as com_fk_pacote,
  COUNT(cliente_assinatura_id) as com_fk_assinatura,
  COUNT(*) FILTER (WHERE cliente_pacote_id IS NULL AND billing_mode = 'pacote') as pacotes_sem_fk,
  COUNT(*) FILTER (WHERE cliente_assinatura_id IS NULL AND billing_mode = 'assinatura') as assinaturas_sem_fk
FROM projects
WHERE billing_mode IN ('pacote', 'assinatura')
GROUP BY billing_mode;
```

---

## 📊 COMPARAÇÃO ANTES vs DEPOIS

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Projetos Órfãos** | ❌ 2 projetos sem FK | ✅ 0 projetos (todos vinculados) |
| **Visibilidade no Financeiro** | ❌ Não apareciam | ✅ Aparecem corretamente |
| **Rastreabilidade** | 🟡 Apenas via billing_snapshot | ✅ FK direto + snapshot |
| **Performance de Query** | 🟡 Scan em JSONB | ✅ Index em FK |
| **Integridade de Dados** | ❌ Inconsistente | ✅ Consistente |
| **Novos Projetos** | ❌ Criados sem FK | ✅ Criados com FK |

---

## 🚨 CHECKLIST DE VALIDAÇÃO

### Validação SQL
- [ ] Script SQL executado com sucesso
- [ ] 0 projetos órfãos de pacotes
- [ ] 0 projetos órfãos de assinaturas
- [ ] Todos os FKs de pacotes são válidos
- [ ] Todos os FKs de assinaturas são válidos

### Validação de Código
- [ ] Deploy realizado com sucesso
- [ ] Sem erros no log da aplicação
- [ ] Variáveis `clientePacoteId` e `clienteAssinaturaId` declaradas
- [ ] FKs sendo setados ao criar projeto

### Validação Funcional
- [ ] Projetos antigos aparecem na aba Pacotes
- [ ] Projetos antigos aparecem na aba Assinaturas
- [ ] Novo projeto com pacote é vinculado corretamente
- [ ] Novo projeto com assinatura é vinculado corretamente
- [ ] Contadores continuam funcionando (projetos_usados)

---

## 🎯 PONTOS DE ATENÇÃO

### ⚠️ Importante

1. **Não execute o SQL múltiplas vezes**: O script é idempotente, mas execute apenas uma vez por ambiente
2. **Backup recomendado**: Embora o script seja seguro, é sempre bom ter backup antes de UPDATE em massa
3. **Validar em homologação primeiro**: Execute em ambiente de testes antes de produção

### ✅ Garantias

1. **Dados preservados**: O `billing_snapshot` já continha todas as informações necessárias
2. **Sem perda de dados**: Apenas adicionamos FKs, não removemos nada
3. **Idempotente**: O script pode ser executado múltiplas vezes sem problemas
4. **Reversível**: Se necessário, pode-se setar as FKs como NULL novamente (não recomendado)

---

## 📞 SUPORTE

Em caso de dúvidas ou problemas:

1. Verifique os logs do Supabase para mensagens de erro
2. Execute as queries de verificação SQL
3. Verifique se o deploy foi bem-sucedido
4. Consulte este documento novamente

---

## 📝 CHANGELOG

| Data | Versão | Mudanças |
|------|--------|----------|
| 2025-01-26 | 1.0.0 | Correção inicial de projetos órfãos + API |

---

**Desenvolvido com extremo cuidado para garantir a integridade dos dados e o funcionamento correto do sistema de billing.**
