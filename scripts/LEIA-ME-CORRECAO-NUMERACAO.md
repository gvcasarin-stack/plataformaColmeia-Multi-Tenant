# 📋 INSTRUÇÕES: Correção de Numeração de Projetos Multi-Tenant

## 🎯 Objetivo
Implementar isolamento de numeração de projetos por tenant (organização), garantindo que cada empresa tenha sua própria sequência numérica independente.

---

## 🔴 PROBLEMA ATUAL

**Situação:**
- Empresa A cria projetos: 01, 02, 03... até 08
- Empresa B cria seu primeiro projeto: começa em 09 (deveria ser 01)
- **Causa:** Numeração compartilhada entre todos os tenants

---

## ✅ SOLUÇÃO IMPLEMENTADA

**Trigger no banco de dados** que gera automaticamente o número do projeto isolado por tenant.

**Formato:** `FV-2025-001`, `FV-2025-002`, etc.

**Características:**
- ✅ Cada tenant tem sua própria sequência começando em 001
- ✅ Geração automática e atômica (sem race conditions)
- ✅ Performance otimizada com índice dedicado
- ✅ Não requer alterações no código da aplicação

---

## 📁 ARQUIVOS CRIADOS

### 1. **fix-project-number-by-tenant.sql**
   - Script principal de correção
   - Cria função + trigger + índice
   - **Execute este primeiro**

### 2. **rollback-project-number-fix.sql**
   - Script de segurança para reverter alterações
   - Use apenas em caso de problemas
   - **Mantenha como backup**

### 3. **verify-project-number-fix.sql**
   - Script de validação
   - Verifica se tudo está funcionando
   - **Execute após o script principal**

### 4. **LEIA-ME-CORRECAO-NUMERACAO.md**
   - Este arquivo com instruções completas

---

## 🚀 PASSO A PASSO PARA EXECUÇÃO

### ⚠️ ANTES DE COMEÇAR

1. **Backup do banco de dados**
   ```bash
   # No Supabase Dashboard:
   # Database > Backups > Create Backup
   ```

2. **Escolher horário adequado**
   - Preferencialmente em horário de baixo tráfego
   - Ou em janela de manutenção programada

3. **Avisar a equipe**
   - Informar que haverá manutenção no banco
   - Estimar 5-10 minutos de execução

---

### 📝 PASSO 1: EXECUTAR SCRIPT PRINCIPAL

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Navegue até SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Ou acesse: `https://supabase.com/dashboard/project/[SEU_PROJECT_ID]/sql`

3. **Abra o script principal**
   - Abra o arquivo: `scripts/fix-project-number-by-tenant.sql`
   - Copie TODO o conteúdo do arquivo

4. **Cole no SQL Editor**
   - Cole o script copiado no editor
   - Revise rapidamente o código

5. **Execute o script**
   - Clique no botão "Run" (ou pressione Ctrl+Enter)
   - Aguarde a execução (deve levar poucos segundos)

6. **Verifique a saída**
   - Você deve ver mensagens como:
     ```
     ✅ SCRIPT EXECUTADO COM SUCESSO!
     📋 O que foi criado:
        1. Função: generate_project_number_by_tenant()
        2. Trigger: set_project_number_by_tenant
        3. Índice: idx_projects_tenant_number
     ```

---

### 🔍 PASSO 2: VALIDAR A IMPLEMENTAÇÃO

1. **Execute o script de validação**
   - Abra o arquivo: `scripts/verify-project-number-fix.sql`
   - Copie TODO o conteúdo

2. **Cole no SQL Editor**
   - Cole o script no Supabase SQL Editor

3. **Execute**
   - Clique em "Run"
   - Aguarde a execução

4. **Analise os resultados**
   - Verifique se todos os testes passaram (✅)
   - Veja a distribuição atual de projetos por tenant
   - Confirme que o trigger está ativo

---

### 🧪 PASSO 3: TESTE PRÁTICO

1. **Teste com Tenant A**
   - Faça login como usuário da Empresa A
   - Crie um novo projeto através da aplicação
   - **Verifique:** Número deve seguir sequência (ex: se último era 08, novo deve ser 09)

2. **Teste com Tenant B**
   - Faça login como usuário da Empresa B
   - Crie um novo projeto através da aplicação
   - **Verifique:** Se é o primeiro projeto, deve ser `FV-2025-001`
   - **Importante:** Não deve continuar da sequência do Tenant A

3. **Verificação no banco**
   ```sql
   -- Execute no SQL Editor para ver os resultados:
   SELECT
     tenant_id,
     number,
     nome_cliente_final,
     created_at
   FROM projects
   ORDER BY tenant_id, created_at DESC
   LIMIT 20;
   ```

---

## ✅ CRITÉRIOS DE SUCESSO

Após a implementação, você deve observar:

### ✅ **Isolamento Funcional**
- [ ] Tenant A: Sequência continua normalmente (08 → 09)
- [ ] Tenant B: Sequência começa do 001 (independente do Tenant A)
- [ ] Tenant C: Sequência começa do 001 (independente de A e B)

### ✅ **Formato Correto**
- [ ] Números seguem padrão: `FV-2025-001`
- [ ] Ano é atualizado automaticamente
- [ ] Padding de 3 dígitos funciona (001, 002... 099, 100)

### ✅ **Sem Erros**
- [ ] Criação de projetos funciona normalmente
- [ ] Não há mensagens de erro no console da aplicação
- [ ] Não há erros no log do Supabase

---

## 🆘 EM CASO DE PROBLEMAS

### Problema: Script falhou na execução

**Solução:**
1. Verifique as mensagens de erro
2. Confirme que você tem permissões de superadmin no Supabase
3. Verifique se a tabela `projects` existe
4. Tente executar novamente

---

### Problema: Trigger não está gerando números

**Diagnóstico:**
```sql
-- Verifique se o trigger existe:
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'set_project_number_by_tenant';

-- Verifique se a função existe:
SELECT proname
FROM pg_proc
WHERE proname = 'generate_project_number_by_tenant';
```

**Solução:**
1. Execute novamente o script principal
2. Verifique os logs do Supabase
3. Se necessário, execute o rollback e tente novamente

---

### Problema: Números ainda compartilhados entre tenants

**Possíveis causas:**
1. Trigger não está ativo
2. Código da aplicação está fornecendo `number` manualmente
3. Há outro trigger conflitante

**Diagnóstico:**
```sql
-- Verifique todos os triggers na tabela projects:
SELECT * FROM pg_trigger WHERE tgrelid = 'projects'::regclass;
```

**Solução:**
1. Execute o script de validação
2. Verifique se há código fornecendo `number` manualmente
3. Entre em contato com o suporte

---

### Problema: Preciso reverter tudo

**Solução - Executar Rollback:**

1. **Abra o script de rollback**
   - Arquivo: `scripts/rollback-project-number-fix.sql`

2. **Execute no SQL Editor**
   - Cole o script no Supabase SQL Editor
   - Clique em "Run"

3. **Verifique a reversão**
   - O script confirmará a remoção do trigger e função

4. **Importante:**
   - Projetos existentes NÃO serão afetados
   - Novos projetos precisarão de número manual no código

---

## 📊 MONITORAMENTO PÓS-IMPLEMENTAÇÃO

### Nos primeiros dias, monitore:

1. **Criação de projetos**
   - Confirme que novos projetos são criados normalmente
   - Verifique os números gerados

2. **Performance**
   - Observe se há lentidão na criação de projetos
   - (Não deve haver impacto perceptível)

3. **Logs**
   - Verifique se há erros relacionados a `project_number`
   - Cheque logs do Supabase e da aplicação

### Query útil para monitoramento:
```sql
-- Últimos 10 projetos criados, por tenant:
SELECT
  tenant_id,
  number,
  nome_cliente_final,
  created_at
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- Estatísticas por tenant:
SELECT
  tenant_id,
  COUNT(*) as total_projetos,
  MIN(number) as primeiro_numero,
  MAX(number) as ultimo_numero,
  MAX(created_at) as ultimo_projeto_criado
FROM projects
GROUP BY tenant_id
ORDER BY tenant_id;
```

---

## 📝 ALTERAÇÕES NO CÓDIGO

### Arquivo alterado:
- `src/lib/actions/multi-tenant-project-actions.ts` (linha 124-130)

### O que mudou:
- ✅ Comentário atualizado com documentação detalhada
- ✅ Referência aos scripts SQL criados
- ❌ **Nenhuma lógica de código foi alterada**

### Não é necessário:
- ❌ Reiniciar aplicação
- ❌ Rebuild do projeto
- ❌ Deploy novo código
- ❌ Configurar variáveis de ambiente

---

## 🎓 PERGUNTAS FREQUENTES

### P: Os projetos existentes serão renumerados?
**R:** Não. Apenas projetos novos receberão números do novo sistema. Projetos existentes mantêm seus números atuais.

### P: E se eu criar muitos projetos simultaneamente?
**R:** Não há problema. O trigger é atômico e garante que não haverá números duplicados mesmo com criações simultâneas.

### P: Posso mudar o formato do número?
**R:** Sim. Edite a função `generate_project_number_by_tenant()` no banco de dados. Por exemplo, para mudar de `FV-2025-001` para `PROJ-2025-001`, altere a linha que define o `prefix`.

### P: E se eu quiser começar do 100 ao invés de 001?
**R:** Edite a função e altere a linha:
```sql
-- De:
COALESCE(MAX(...), 0)
-- Para:
COALESCE(MAX(...), 99)  -- Próximo será 100
```

### P: Posso usar este sistema em desenvolvimento local?
**R:** Sim. Execute os scripts no seu banco de dados local do Supabase (se estiver usando Docker). Os scripts funcionam identicamente.

---

## 📞 SUPORTE

Se encontrar qualquer problema ou tiver dúvidas:

1. **Verifique os logs:**
   - Supabase Dashboard > Logs
   - Console da aplicação

2. **Execute o script de validação:**
   - Ele fornece informações detalhadas do estado atual

3. **Documente o erro:**
   - Capture prints das mensagens de erro
   - Anote o que estava fazendo quando ocorreu

4. **Em caso de emergência:**
   - Execute o script de rollback
   - Isso reverterá todas as alterações

---

## ✅ CHECKLIST FINAL

Antes de considerar a implementação concluída:

- [ ] Script principal executado com sucesso
- [ ] Script de validação executado e passou em todos os testes
- [ ] Teste prático realizado com pelo menos 2 tenants diferentes
- [ ] Números estão isolados por tenant
- [ ] Formato está correto (FV-YYYY-NNN)
- [ ] Sem erros na criação de projetos
- [ ] Equipe informada sobre a mudança
- [ ] Monitoramento configurado para primeiros dias

---

## 🎉 CONCLUSÃO

Após seguir todos os passos acima, seu sistema estará com a numeração de projetos corrigida e isolada por tenant. Cada organização terá sua própria sequência numérica independente.

**Benefícios alcançados:**
- ✅ Isolamento multi-tenant garantido
- ✅ Segurança e privacidade melhoradas
- ✅ Numeração lógica e previsível
- ✅ Melhor controle interno por empresa
- ✅ Sistema preparado para crescimento

---

**Data do documento:** 11/01/2025
**Versão:** 1.0
**Autor:** Sistema SGF Multi-Tenant
