# 🔍 RELATÓRIO TÉCNICO: Billing Não Aparecendo na Interface

**Data:** 24/11/2025
**Problema Reportado:** Projetos criados em pacotes não exibem informações de billing na aba financeiro, apenas mostram valor avulso

---

## 📊 EVIDÊNCIAS DO BANCO DE DADOS

### ✅ Projetos que FUNCIONARAM (22-23/11):
```
FV-2025-349 (23/11 19:33) - billing_mode: "pacote" ✅
  - pacote_nome: "Pacote Elite (ATÉ 15KW)"
  - projetos_usados_antes: 0
  - projetos_usados_depois: 1

FV-2025-348 (22/11 17:18) - billing_mode: "pacote" ✅
  - pacote_nome: "Pacote Ouro"
  - projetos_usados_antes: 1
  - projetos_usados_depois: 2

FV-2025-347 (22/11 17:01) - billing_mode: "pacote" ✅
  - pacote_nome: "Pacote Ouro"
  - projetos_usados_antes: 0
  - projetos_usados_depois: 1
```

### ❌ Projetos que NÃO FUNCIONARAM (19-22/11):
```
FV-2025-346 (22/11 14:02) - billing_mode: NULL ❌
FV-2025-345 (22/11 13:55) - billing_mode: NULL ❌
FV-2025-344 (22/11 13:13) - billing_mode: NULL ❌
FV-2025-342 (19/11 21:18) - billing_mode: NULL ❌
```

**OBSERVAÇÃO CRÍTICA:** Existe uma quebra temporal clara:
- Antes de 22/11 17:01 → billing_mode = NULL
- Depois de 22/11 17:01 → billing_mode = "pacote" ✅

---

## 🔎 HIPÓTESES INVESTIGADAS

### ❌ HIPÓTESE 1: Código não está salvando billing_mode
**Status:** DESCARTADA

**Evidência:**
- Linhas 1924-1926 da `project-actions.ts` mostram que `billing_mode` e `billing_snapshot` são ADICIONADOS ao `projectData`
- Projetos 347, 348 e 349 provam que o código ESTÁ funcionando

**Conclusão:** O código está correto e funcionando desde 22/11 17:01

---

### ❌ HIPÓTESE 2: Query não está retornando billing_mode
**Status:** DESCARTADA

**Evidência:**
- Projetos 347, 348 e 349 retornam `billing_mode` e `billing_snapshot` corretamente
- As queries foram atualizadas para incluir esses campos (supabase.ts linhas 79-80, 166-167, 343-344)

**Conclusão:** As queries estão corretas

---

### ❌ HIPÓTESE 3: useState está descartando billing_mode
**Status:** DESCARTADA

**Evidência:**
- Linhas 298-300 de `expanded-project-view.tsx` adicionam `billing_mode` e `billing_snapshot` ao useState
- O componente está preparado para exibir (linhas 1736-1794)

**Conclusão:** O componente está correto

---

### ⚠️ HIPÓTESE 4: Migration foi executada APÓS alguns projetos serem criados
**Status:** **MUITO PROVÁVEL - CAUSA RAIZ**

**Evidência Temporal:**
```
22/11 13:13 - Projeto 344 criado → billing_mode: NULL
22/11 13:55 - Projeto 345 criado → billing_mode: NULL
22/11 14:02 - Projeto 346 criado → billing_mode: NULL
------- ALGO ACONTECEU AQUI (migration?) -------
22/11 17:01 - Projeto 347 criado → billing_mode: "pacote" ✅
22/11 17:18 - Projeto 348 criado → billing_mode: "pacote" ✅
23/11 19:33 - Projeto 349 criado → billing_mode: "pacote" ✅
```

**Análise:**
- Há um gap de ~3 horas entre 14:02 e 17:01
- Todos os projetos ANTES desse gap têm billing_mode = NULL
- Todos os projetos DEPOIS desse gap têm billing_mode preenchido

**Possíveis Cenários:**

#### CENÁRIO A: Migration executada às 17:00 do dia 22/11
- A migration `add-billing-fields-to-projects.sql` adiciona as colunas, mas **não preenche valores existentes**
- Projetos criados ANTES não têm como ter billing_mode porque a coluna não existia
- Projetos criados DEPOIS têm billing_mode porque a coluna já existe

#### CENÁRIO B: Deploy do código às 17:00 do dia 22/11
- O código com billing validation foi deployado às 17:00
- Projetos criados ANTES usaram código antigo (sem billing)
- Projetos criados DEPOIS usaram código novo (com billing)

---

### ⚠️ HIPÓTESE 5: Alguns projetos foram criados via API antiga
**Status:** POSSÍVEL

**Evidência:**
- O sistema possui múltiplas formas de criar projetos
- Pode existir uma rota API antiga que não inclui billing validation

**Para Verificar:**
- Qual API foi usada para criar os projetos 344, 345, 346?
- Foi via botão "Novo Projeto" do cliente?
- Foi via botão "Novo Projeto" do admin?
- Foi via importação/script?

---

## 🎯 CAUSA RAIZ MAIS PROVÁVEL

### **Os projetos foram criados ANTES da implementação do billing estar ativa no ambiente**

**Cenário Reconstruído:**

1. **19-22/11 (manhã/tarde):** Sistema rodando SEM billing validation
   - Projetos 344, 345, 346 criados
   - Colunas `billing_mode` e `billing_snapshot` ainda NÃO existiam na tabela

2. **22/11 ~17:00:** Migration executada OU Deploy realizado
   - Colunas `billing_mode` e `billing_snapshot` adicionadas à tabela
   - Código de validação ativado

3. **22/11 17:01+:** Sistema rodando COM billing validation
   - Projetos 347, 348, 349 criados
   - Campos `billing_mode` e `billing_snapshot` preenchidos corretamente

---

## 🔬 TESTES PARA CONFIRMAR

### TESTE 1: Verificar se a coluna existia antes
```sql
-- Verificar histórico de criação das colunas
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('billing_mode', 'billing_snapshot');
```

### TESTE 2: Verificar se há uma API antiga
```bash
# Procurar por outras rotas de criação de projeto
grep -r "projects.*insert" src/app/api/
```

### TESTE 3: Criar um NOVO projeto AGORA
- Criar projeto para cliente com pacote
- Verificar se billing_mode aparece no banco
- Verificar se aparece na interface

---

## 📋 VERIFICAÇÕES ADICIONAIS NECESSÁRIAS

### 1. Confirmar horário do deploy/migration
**Pergunta para o usuário:**
- Quando você executou a migration `add-billing-fields-to-projects.sql`?
- Foi no dia 22/11 por volta das 17:00?

### 2. Verificar se há múltiplas rotas de criação
**Arquivos a verificar:**
- `/api/projects/route.ts` - Rota principal
- `/api/projects/unified/route.ts` - Rota unificada
- Qualquer outra rota que possa criar projetos

### 3. Verificar logs da aplicação
**Buscar logs de:**
- Projetos 344, 345, 346 (que falharam)
- Projetos 347, 348, 349 (que funcionaram)
- Comparar qual código foi executado

---

## 💡 SOLUÇÕES PROPOSTAS

### SOLUÇÃO 1: Migrar projetos antigos (se aplicável)
Se os projetos 344, 345, 346 foram criados ANTES da implementação:
```sql
-- Atualizar projetos antigos com billing_mode = 'avulso'
UPDATE projects
SET
  billing_mode = 'avulso',
  billing_snapshot = jsonb_build_object(
    'mode', 'avulso',
    'potencia', potencia,
    'valor_projeto', valor_projeto,
    'timestamp', created_at
  )
WHERE billing_mode IS NULL
  AND created_at < '2025-11-22 17:00:00';
```

### SOLUÇÃO 2: Investigar API antiga
Se existe uma API que não valida billing:
- Encontrar essa rota
- Adicionar billing validation
- Ou desativar essa rota

### SOLUÇÃO 3: Teste definitivo
Criar um NOVO projeto AGORA para:
- Confirmar que funciona
- Descartar problemas de cache
- Validar que a implementação está ativa

---

## ⚠️ PERGUNTA CRÍTICA PARA O USUÁRIO

**Os projetos 344, 345 e 346 foram criados HOJE (24/11) ou foram criados nos dias 19-22/11?**

Se foram criados nos dias 19-22/11:
- É NORMAL que não tenham billing_mode
- A funcionalidade não estava ativa ainda

Se foram criados HOJE (24/11):
- Temos um problema real
- Precisa investigação mais profunda

---

## 📌 PRÓXIMOS PASSOS RECOMENDADOS

1. **CONFIRMAR:** Quando os projetos 344, 345, 346 foram criados?
2. **TESTAR:** Criar um NOVO projeto AGORA e verificar
3. **DECIDIR:** Se migrar projetos antigos ou deixar como está
4. **DOCUMENTAR:** Quando a funcionalidade foi ativada em produção

---

**Relatório gerado em:** 24/11/2025
**Próxima ação:** Aguardando confirmação do usuário sobre as datas
