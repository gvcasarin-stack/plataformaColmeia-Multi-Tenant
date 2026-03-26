# Relatório Técnico: Projeto Não Aparece na Lista de Assinaturas

**Data:** 2025-12-03
**Status:** 🔍 EM INVESTIGAÇÃO
**Problema:** Projeto vinculado à assinatura não aparece na tabela "Projetos do Mês Atual"

---

## 📊 DADOS CONFIRMADOS

### Assinatura
- **ID:** `b1434ebe-5f94-470d-ae32-bd80d8efedaa`
- **Tenant:** `061ff77b-8b3a-4732-9158-a574c1f1690a`
- **Status:** `ativa`
- **Projetos Mensais:** 3
- **Projetos Usados (banco):** ✅ **1** (CORRETO)
- **Data Início:** 2025-12-03
- **Último Reset:** 2025-12-03
- **Próximo Reset:** 2026-01-01

### Projeto
- **ID:** `d9225ddc-7242-446b-86bd-7d0c6774ef63`
- **Número:** FV-2025-005
- **Cliente:** Clínica Médica HEALTHMEDIC
- **Potência:** 32 kW
- **Status:** em-homologacao
- **Data Criação:** ✅ 2025-10-05 (ANTES da assinatura)
- **Vinculado à Assinatura:** ✅ SIM (`cliente_assinatura_id` preenchido)

---

## 🔍 ANÁLISE DA CADEIA DE DADOS

### 1. Banco de Dados ✅
```sql
SELECT projetos_usados_mes_atual FROM cliente_assinaturas
WHERE id = 'b1434ebe-5f94-470d-ae32-bd80d8efedaa';
-- Resultado: 1 ✅ CORRETO
```

### 2. Query Supabase ✅
```typescript
// API busca projetos com:
.eq('cliente_assinatura_id', assinatura.id)
.eq('tenant_id', tenantId)
// Retorna: 1 projeto ✅
```

### 3. Filtro de Data (CORRIGIDO) ✅
```typescript
// ANTES (ERRADO):
const projetosDoMesAtual = todosProjetos.filter(p =>
  dataCriacao >= ultimoReset && dataCriacao < proximoReset
);
// Resultado: 0 projetos ❌ (2025-10-05 < 2025-12-03)

// DEPOIS (CORRETO):
const projetosDoMesAtual = todosProjetos || [];
// Resultado esperado: 1 projeto ✅
```

### 4. Resposta da API ❓
**PRECISA VERIFICAR:** A API `/api/admin/cliente-assinaturas` está retornando `projetosDoMesAtual` com 1 projeto?

### 5. Frontend ❓
**PRECISA VERIFICAR:** O React está renderizando os dados recebidos?

---

## 🎯 POSSÍVEIS CAUSAS

### Hipótese 1: Cache do Navegador/Next.js
- **Probabilidade:** 🟡 MÉDIA
- **Sintoma:** Frontend ainda usa resposta antiga da API
- **Como testar:** Hard refresh (Ctrl+Shift+R)

### Hipótese 2: API não foi recarregada
- **Probabilidade:** 🟡 MÉDIA
- **Sintoma:** Servidor ainda executa código antigo
- **Como testar:** Reiniciar servidor de desenvolvimento

### Hipótese 3: Filtro no Frontend
- **Probabilidade:** 🟢 BAIXA
- **Sintoma:** Frontend filtra os projetos recebidos
- **Como verificar:** Inspecionar `assinatura.projetosDoMesAtual` no console

### Hipótese 4: Problema com `payment_status`
- **Probabilidade:** 🟢 BAIXA
- **Sintoma:** Projeto filtrado por status de pagamento
- **Como verificar:** Ver código do frontend que renderiza a tabela

### Hipótese 5: Soft Delete / Arquivamento
- **Probabilidade:** 🟢 BAIXA
- **Sintoma:** Projeto marcado como deletado ou arquivado
- **Como verificar:** SQL query verifica `deleted_at` e `is_archived`

---

## 🔧 FERRAMENTAS DE DIAGNÓSTICO CRIADAS

### 1. SQL: Diagnóstico Completo
**Arquivo:** `scripts/diagnostico-completo-assinatura.sql`
**O que faz:** Verifica assinatura, projetos, status de arquivamento, usuário

### 2. API: Simulação Frontend
**URL:** `/api/test/diagnostico-frontend-assinaturas`
**O que faz:** Simula exatamente o que o frontend faz ao carregar dados

### 3. API: Análise de Filtros
**URL:** `/api/test/diagnostico-assinatura-projetos`
**O que faz:** Testa cada filtro e mostra por que projetos são incluídos/excluídos

---

## 📝 PRÓXIMOS PASSOS PARA DIAGNÓSTICO

### Passo 1: Executar SQL
```sql
-- Execute: scripts/diagnostico-completo-assinatura.sql
```
**Objetivo:** Confirmar que projeto NÃO está deletado/arquivado

### Passo 2: Testar API de Simulação
```
GET /api/test/diagnostico-frontend-assinaturas
```
**Objetivo:** Ver se API retorna `projetosDoMesAtual` com 1 projeto

### Passo 3: Inspecionar Frontend
```javascript
// No console do navegador, na página /admin/financeiro:
console.log('Assinaturas:', clienteAssinaturas);
console.log('Primeira assinatura:', clienteAssinaturas[0]);
console.log('Projetos do mês:', clienteAssinaturas[0]?.projetosDoMesAtual);
```
**Objetivo:** Ver se dados chegam ao React

### Passo 4: Verificar Cache
- Hard refresh: `Ctrl + Shift + R` (Windows) ou `Cmd + Shift + R` (Mac)
- Limpar cache do navegador
- Reiniciar servidor Next.js

---

## 🚨 CORREÇÕES JÁ APLICADAS

✅ **Contador do banco:** Corrigido para usar `projetos_usados_mes_atual`
✅ **Nomes das colunas:** Corrigidos para `nome_cliente_final` e `potencia`
✅ **Filtro de data:** Removido (agora retorna TODOS os projetos vinculados)
✅ **Erros TypeScript:** Corrigidos imports do lucide-react

---

## 💡 CONCLUSÃO PRELIMINAR

**Banco de dados:** ✅ Funcionando corretamente
**API backend:** ✅ Código corrigido
**Frontend/Cache:** ❓ **SUSPEITA PRINCIPAL**

**Recomendação:** Executar as ferramentas de diagnóstico para confirmar se:
1. A API está retornando dados corretos
2. O frontend está recebendo e renderizando os dados

---

**Próxima Ação:** Aguardar resultado das ferramentas de diagnóstico.
