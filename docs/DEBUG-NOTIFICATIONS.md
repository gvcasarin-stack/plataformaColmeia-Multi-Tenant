# 🔍 GUIA DE DEBUG - SISTEMA DE NOTIFICAÇÕES E EMAILS

## 🚨 PROBLEMA ATUAL
- Notificações in-app não estão funcionando
- Emails não estão sendo enviados
- Sistema multi-tenant pode estar com problemas

## 🧪 APIs DE TESTE CRIADAS

### 1. **Diagnóstico Geral do Sistema**
```bash
GET /api/debug/system-diagnosis

# Teste via curl:
curl http://localhost:3000/api/debug/system-diagnosis

# O que verifica:
- ✅ Variáveis de ambiente (AWS, Supabase, etc)
- ✅ Conexão com banco de dados
- ✅ Contagem de registros
- ✅ Estrutura multi-tenant
- ✅ Serviços disponíveis
```

### 2. **Teste Isolado de Email**
```bash
POST /api/debug/test-email-isolated

# Teste via curl:
curl -X POST http://localhost:3000/api/debug/test-email-isolated \
  -H "Content-Type: application/json" \
  -d '{
    "to": "seu-email@teste.com",
    "subject": "Teste Isolado",
    "message": "Este é um teste direto do SES"
  }'

# O que testa:
- ✅ Envio direto via Amazon SES
- ✅ Sem dependências de notificações
- ✅ Logs detalhados de cada etapa
```

### 3. **Teste Isolado de Notificação**
```bash
POST /api/debug/test-notification-isolated

# Teste via curl:
curl -X POST http://localhost:3000/api/debug/test-notification-isolated \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "ID_DE_UM_USUARIO_VALIDO",
    "title": "Teste de Notificação",
    "message": "Esta é uma notificação de teste",
    "projectId": "ID_DE_UM_PROJETO_OPCIONAL"
  }'

# O que testa:
- ✅ Criação direta no banco Supabase
- ✅ Verificação de usuário
- ✅ Sem envio de email
```

### 4. **Teste de Fluxo de Comentário**
```bash
POST /api/debug/test-comment-flow

# Teste via curl:
curl -X POST http://localhost:3000/api/debug/test-comment-flow \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ID_DO_PROJETO",
    "authorId": "ID_DO_AUTOR",
    "commentText": "Este é um comentário de teste",
    "isAdmin": false
  }'

# O que testa:
- ✅ Todo o fluxo de comentário
- ✅ Verificação de tenant
- ✅ Determinação de destinatários
- ✅ Criação de notificações
- ✅ Envio de emails
```

## 📋 PASSO A PASSO DE DEBUG

### PASSO 1: Diagnóstico Inicial
```bash
# 1. Executar diagnóstico completo
curl http://localhost:3000/api/debug/system-diagnosis

# Verificar:
# - Todas as variáveis de ambiente estão OK?
# - Banco de dados está conectado?
# - Quantos usuários/projetos/notificações existem?
# - Há usuários/projetos sem tenant_id?
```

### PASSO 2: Teste de Email Isolado
```bash
# 2. Testar apenas o envio de email
curl -X POST http://localhost:3000/api/debug/test-email-isolated \
  -H "Content-Type: application/json" \
  -d '{
    "to": "seu-email-real@gmail.com",
    "subject": "Teste Debug Email",
    "message": "Se você receber este email, o SES está funcionando"
  }'

# Se FALHAR:
# - Verificar AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY
# - Verificar AWS_REGION (deve ser us-east-1 ou outra região do SES)
# - Verificar SES_SENDER_EMAIL (email verificado no SES)
# - Ver logs no console para erro específico
```

### PASSO 3: Teste de Notificação Isolada
```bash
# 3. Primeiro, pegar um userId válido
# No Supabase, executar:
SELECT id, email, role, tenant_id FROM users LIMIT 5;

# Usar um dos IDs para testar:
curl -X POST http://localhost:3000/api/debug/test-notification-isolated \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "COLE_O_ID_AQUI",
    "title": "Teste Notificação Debug",
    "message": "Esta notificação deve aparecer no banco"
  }'

# Verificar no Supabase:
SELECT * FROM notifications 
WHERE title = 'Teste Notificação Debug' 
ORDER BY created_at DESC;
```

### PASSO 4: Teste de Fluxo Completo
```bash
# 4. Pegar IDs reais para teste
# No Supabase:
SELECT p.id as project_id, p.created_by as client_id, p.tenant_id, p.name
FROM projects p
LIMIT 5;

# Pegar um admin do mesmo tenant:
SELECT id, email, role, tenant_id 
FROM users 
WHERE role IN ('admin', 'superadmin')
AND tenant_id = 'TENANT_ID_DO_PROJETO';

# Testar fluxo:
curl -X POST http://localhost:3000/api/debug/test-comment-flow \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ID_DO_PROJETO",
    "authorId": "ID_DO_ADMIN",
    "commentText": "Teste completo de comentário",
    "isAdmin": true
  }'
```

## 🔍 VERIFICAÇÕES NO BANCO

### Verificar Estrutura Multi-Tenant
```sql
-- Usuários sem tenant
SELECT COUNT(*) as usuarios_sem_tenant 
FROM users 
WHERE tenant_id IS NULL;

-- Projetos sem tenant
SELECT COUNT(*) as projetos_sem_tenant 
FROM projects 
WHERE tenant_id IS NULL;

-- Distribuição de admins por tenant
SELECT tenant_id, COUNT(*) as qtd_admins
FROM users
WHERE role IN ('admin', 'superadmin')
GROUP BY tenant_id;
```

### Verificar Notificações Recentes
```sql
-- Últimas 10 notificações
SELECT 
  n.id,
  n.type,
  n.title,
  n.created_at,
  u.email as usuario,
  u.tenant_id
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;
```

### Verificar Cooldown de Emails
```sql
-- Emails em cooldown
SELECT 
  ec.*,
  u.email,
  p.name as project_name
FROM email_cooldowns ec
LEFT JOIN users u ON ec.user_id = u.id
LEFT JOIN projects p ON ec.project_id = p.id
WHERE ec.last_email_sent_at > NOW() - INTERVAL '5 minutes';
```

## 🛠️ PROBLEMAS COMUNS E SOLUÇÕES

### Problema 1: "Cannot read properties of undefined"
**Causa:** Função esperando campo que não existe
**Solução:** Verificar campos no banco (name vs full_name)

### Problema 2: "Bucket not found"
**Causa:** Bucket do Supabase Storage não existe
**Solução:** Criar bucket 'project-files' no Supabase

### Problema 3: Emails não chegam
**Possíveis causas:**
1. Credenciais AWS incorretas
2. Email remetente não verificado no SES
3. SES em modo sandbox (só envia para emails verificados)
4. Cooldown ativo (aguardar 5 minutos)

### Problema 4: Notificações cruzadas entre tenants
**Causa:** Funções não filtram por tenant_id
**Solução:** Usar getAllAdminUsersByTenant() ao invés de getAllAdminUsers()

## 📊 MONITORAMENTO EM TEMPO REAL

### Logs do Servidor
```bash
# Acompanhar logs em tempo real
npm run dev

# Filtrar logs específicos
npm run dev 2>&1 | grep "TEST-EMAIL"
npm run dev 2>&1 | grep "TEST-NOTIFICATION"
npm run dev 2>&1 | grep "SYSTEM-DIAGNOSIS"
```

### Verificar Vercel Logs
1. Acessar: https://vercel.com/gvcasarin-gmailcoms-projects/sgv-sistema-codigo
2. Ir em "Functions" -> "Logs"
3. Filtrar por "error" ou buscar pelos prefixos de debug

## 🎯 CHECKLIST DE VALIDAÇÃO

- [ ] Diagnóstico geral retorna todos os checks verdes
- [ ] Email isolado é enviado e recebido
- [ ] Notificação isolada é criada no banco
- [ ] Fluxo de comentário cria notificação correta
- [ ] Apenas usuários do mesmo tenant recebem notificações
- [ ] Cooldown de 5 minutos funciona
- [ ] Logs não mostram erros críticos

## 💡 DICAS DE DEBUG

1. **Sempre verificar os logs do console** - Os prefixos ajudam a filtrar:
   - 🔍 [TEST-EMAIL-ISOLATED]
   - 🔔 [TEST-NOTIFICATION-ISOLATED]
   - 💬 [TEST-COMMENT-FLOW]
   - 🏥 [SYSTEM-DIAGNOSIS]

2. **Testar em ordem** - Começar pelo mais simples (email isolado) até o mais complexo (fluxo completo)

3. **Verificar tenant_id sempre** - Principal causa de problemas em sistemas multi-tenant

4. **Usar IDs reais do banco** - Não inventar IDs, sempre pegar do Supabase

5. **Aguardar cooldown** - Se testou email, aguardar 5 minutos antes de testar novamente