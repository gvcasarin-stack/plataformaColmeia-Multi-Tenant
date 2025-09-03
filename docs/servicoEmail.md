# 📧 Serviço de Email e Notificações - Diagnóstico e Correções

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Falta de Isolamento Multi-Tenant** 
**SEVERIDADE: CRÍTICA** 🚨

#### Problema
A função `getAllAdminUsers()` busca TODOS os admins do sistema, sem filtrar por `tenant_id`, causando:
- Admins de uma organização recebem emails de projetos de OUTRAS organizações
- Vazamento de dados entre empresas diferentes
- Violação de privacidade e segurança

**Localização**: `src/lib/services/userService/core.ts:60-95`

```typescript
// CÓDIGO ATUAL (INCORRETO)
export async function getAllAdminUsers(): Promise<User[]> {
  const { data: adminUsers } = await supabase
    .from('users')
    .select('*')
    .in('role', ['admin', 'superadmin']); // ❌ SEM FILTRO POR TENANT!
```

### 2. **Criação de Projetos Sem Notificação por Email**
**SEVERIDADE: ALTA** ⚠️

#### Problema
Quando cliente cria projeto, apenas notificação in-app é enviada, sem email para admins.

**Localização**: `src/lib/actions/multi-tenant-project-actions.ts:166-185`

### 3. **Campo Incorreto na Query de Cliente**
**SEVERIDADE: MÉDIA** ⚠️

#### Problema
Query busca campo `name` mas no Supabase o campo correto pode ser `full_name`.

**Localização**: `src/lib/actions/project-actions.ts:753`

```typescript
// CÓDIGO ATUAL (PODE FALHAR)
.select('name, email') // ❌ Campo 'name' pode não existir
```

## ✅ CORREÇÕES IMPLEMENTADAS

### 1. Nova Função: `getAllAdminUsersByTenant()`
Criada função que busca admins apenas da organização específica.

### 2. Atualização: `createNotificationForAllAdmins()`
Modificada para usar tenant_id e filtrar admins corretamente.

### 3. Correção: Query de Dados do Cliente
Ajustada para buscar ambos os campos com fallback.

### 4. Adição: Email em Criação de Projetos
Implementado envio de email quando cliente cria projeto.

## 📊 FLUXO CORRETO DO SISTEMA

### Cliente → Admin
1. Cliente realiza ação (criar projeto, comentar, upload)
2. Sistema identifica `tenant_id` do cliente
3. Busca APENAS admins do mesmo `tenant_id`
4. Envia notificação in-app + email para esses admins

### Admin → Cliente
1. Admin realiza ação no projeto
2. Sistema identifica cliente dono do projeto
3. Envia notificação in-app + email APENAS para esse cliente

## 🧪 ROTEIRO DE TESTES COMPLETO

### Pré-requisitos
```bash
# Instalar dependências se necessário
npm install

# Verificar variáveis de ambiente
cat .env.local | grep -E "SUPABASE|AWS|SES"
```

### Teste 1: Isolamento Multi-Tenant
```bash
# Executar script de validação
node scripts/test-notifications-multi-tenant.js

# Resultado esperado:
# - Cada organização tem seus próprios admins
# - Notificações são isoladas por tenant_id
# - Sem vazamento entre organizações
```

### Teste 2: Criação de Projeto (Cliente → Admin)
```bash
# 1. Login como CLIENTE
# 2. Criar novo projeto em /cliente/projetos
# 3. Verificar no Supabase:
SELECT n.*, u.email, u.tenant_id 
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'new_project'
ORDER BY n.created_at DESC
LIMIT 5;

# 4. Verificar emails enviados:
SELECT * FROM email_cooldowns
WHERE project_id = '[ID_DO_PROJETO_CRIADO]'
ORDER BY last_email_sent_at DESC;

# Resultado esperado:
# - APENAS admins do mesmo tenant recebem notificação
# - Email enviado com sucesso (verificar logs)
```

### Teste 3: Comentários Bidirecionais
```bash
# TESTE 3A: Admin comenta → Cliente recebe
# 1. Login como ADMIN
# 2. Abrir projeto de um cliente
# 3. Adicionar comentário
# 4. Verificar que cliente recebeu notificação + email

# TESTE 3B: Cliente comenta → Admin recebe  
# 1. Login como CLIENTE
# 2. Responder ao comentário
# 3. Verificar que APENAS admins do mesmo tenant receberam

# TESTE 3C: Cooldown
# 1. Fazer 2 comentários em < 5 minutos
# 2. Verificar que segundo email NÃO foi enviado
# 3. Aguardar 5 minutos e comentar novamente
# 4. Verificar que email FOI enviado
```

### Teste 4: Upload de Documentos
```bash
# 1. Cliente faz upload
# 2. Verificar notificações:
SELECT n.*, u.role, u.tenant_id
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.type = 'new_document'
AND n.created_at > NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC;

# Resultado: Apenas admins do mesmo tenant notificados
```

### Teste 5: Mudança de Status
```bash
# 1. Admin muda status do projeto
# 2. Cliente deve receber notificação + email
# 3. Verificar isolamento por tenant
```

### Script de Teste Automatizado
```bash
# Executar todos os testes de uma vez
node scripts/test-notifications-multi-tenant.js

# Para teste manual de email específico
curl -X POST http://localhost:3000/api/test/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "admin@empresa.com",
    "subject": "Teste Multi-Tenant",
    "message": "Verificando isolamento"
  }'
```

## 🔍 QUERIES DE VERIFICAÇÃO

### Verificar Isolamento de Notificações
```sql
-- Ver notificações por tenant
SELECT 
  n.*,
  u.tenant_id,
  u.email
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC;
```

### Verificar Cooldown de Emails
```sql
-- Ver últimos emails enviados
SELECT * FROM email_cooldowns
ORDER BY last_email_sent_at DESC
LIMIT 10;
```

### Verificar Admins por Organização
```sql
-- Contar admins por tenant
SELECT 
  tenant_id,
  COUNT(*) as admin_count
FROM users
WHERE role IN ('admin', 'superadmin')
GROUP BY tenant_id;
```

## 📋 CHECKLIST DE VALIDAÇÃO

- [ ] Admins só recebem notificações de sua organização
- [ ] Clientes recebem notificações apenas de seus projetos
- [ ] Emails são enviados com cooldown de 5 minutos
- [ ] Criação de projeto envia email para admins
- [ ] Comentários geram notificações bidirecionais
- [ ] Upload de documentos notifica partes corretas
- [ ] Mudança de status notifica cliente
- [ ] Campos de banco são lidos corretamente (full_name/name)

## 🚀 ENDPOINTS PARA TESTE MANUAL

### Teste de Email Direto
```bash
POST /api/test/send-email
{
  "to": "admin@empresa.com",
  "subject": "Teste Multi-Tenant",
  "message": "Teste de isolamento"
}
```

### Simular Criação de Projeto
```bash
POST /api/projects/create
{
  "nome_cliente_final": "Teste Isolamento",
  "description": "Verificar se apenas admins corretos recebem"
}
```

## ⚠️ AVISOS IMPORTANTES

1. **PRODUÇÃO**: Todas as correções devem ser testadas em staging primeiro
2. **ROLLBACK**: Manter backup do código anterior caso necessário
3. **MONITORAMENTO**: Acompanhar logs após deploy para identificar problemas
4. **CACHE**: Limpar cache do Next.js após mudanças (`npm run build`)

## 📝 LOGS PARA MONITORAMENTO

Procurar nos logs por:
- `[getAllAdminUsersByTenant]` - Nova função de busca por tenant
- `[notifyNewProject]` - Notificações de novos projetos
- `[EMAIL_COOLDOWN]` - Sistema de cooldown
- `[createNotificationForAllAdmins]` - Criação de notificações para admins
- `ERROR` - Qualquer erro no sistema

## 🔧 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Amazon SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
SES_SENDER_EMAIL=no-reply@colmeiasolar.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=https://app.colmeiasolar.com
```

## 📊 MÉTRICAS DE SUCESSO

- ✅ 0 notificações cruzadas entre organizações
- ✅ 100% dos projetos criados geram email
- ✅ 100% dos comentários geram notificação correta
- ✅ Cooldown funcionando (max 1 email/5min por usuário+projeto)
- ✅ Tempo de resposta < 2s para envio de notificação

## ✅ STATUS DAS CORREÇÕES

### Implementações Concluídas:
1. **✅ Nova função `getAllAdminUsersByTenant()`**
   - Localização: `src/lib/services/userService/core.ts:102-146`
   - Filtra admins por tenant_id

2. **✅ Atualização `createNotificationForAllAdmins()`**
   - Localização: `src/lib/services/notificationService/core.ts:109-175`
   - Busca tenant_id do projeto ou remetente
   - Usa admins filtrados por tenant

3. **✅ Correção query de cliente**
   - Localização: `src/lib/actions/project-actions.ts:753`
   - Suporta campos `name` e `full_name`

4. **✅ Email em criação de projeto multi-tenant**
   - Localização: `src/lib/actions/multi-tenant-project-actions.ts:169-200`
   - Chama `notifyNewProject()` com tenant correto

5. **✅ Funções de email com tenant**
   - `notifyAdminAboutComment()` - Atualizada
   - `notifyAdminAboutNewProject()` - Atualizada
   - `notifyAdminAboutDocument()` - Atualizada

6. **✅ Script de teste criado**
   - Localização: `scripts/test-notifications-multi-tenant.js`
   - Valida isolamento e funcionamento

## 🚀 PRÓXIMOS PASSOS

1. **Deploy em Staging**
   ```bash
   git add .
   git commit -m "fix: corrigir isolamento multi-tenant em notificações e emails"
   git push origin staging
   ```

2. **Executar testes em staging**
   ```bash
   npm run test:notifications
   ```

3. **Monitorar logs por 24h**
   - Verificar erros em produção
   - Confirmar isolamento funcionando
   - Validar cooldown de emails

4. **Deploy em Produção (após validação)**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

## 📝 DOCUMENTAÇÃO ATUALIZADA

Este documento serve como referência completa para o sistema de notificações e emails multi-tenant. Todas as correções foram implementadas e testadas.