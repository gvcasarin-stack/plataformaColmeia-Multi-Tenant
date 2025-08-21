# 🧪 **GUIA RÁPIDO DE TESTE - Notificações**

**Data**: Janeiro 2025  
**Status**: ✅ Pronto para testar após correções Vercel

---

## 🚀 **PROBLEMAS CORRIGIDOS**

### **✅ Erro 1: Sintaxe queries.ts**
- **Problema**: Faltava uma chave `}` no final do arquivo
- **Solução**: Adicionadas funções restantes com sintaxe correta

### **✅ Erro 2: Server-only no emailService**
- **Problema**: EmailService sendo importado em componentes cliente
- **Solução**: Importação dinâmica condicional apenas no servidor

---

## 🧪 **TESTES RECOMENDADOS**

### **1. Teste Básico - Deploy**
1. ✅ Verificar se a aplicação faz deploy na Vercel
2. ✅ Acessar a aplicação sem erros

### **2. Teste Notificação - Projeto Criado**
1. Faça login como **cliente**
2. Crie um novo projeto
3. **Verifique**: Admins receberam notificação in-app
4. **Verifique**: Admins receberam e-mail

### **3. Teste Notificação - Comentário**
1. Acesse um projeto existente
2. Adicione um comentário
3. **Verifique**: Notificação in-app para cliente/admins
4. **Verifique**: E-mail para cliente/admins

### **4. Teste Notificação - Documento**
1. Acesse um projeto existente
2. Faça upload de um arquivo
3. **Verifique**: Notificação in-app para cliente/admins
4. **Verifique**: E-mail para cliente/admins

### **5. Teste Notificação - Status**
1. Faça login como **admin**
2. Altere status de um projeto
3. **Verifique**: Cliente recebeu notificação in-app
4. **Verifique**: Cliente recebeu e-mail

---

## ⚡ **TESTE RÁPIDO NO CONSOLE**

Se quiser testar rapidamente via console do navegador:

\`\`\`javascript
// 1. Teste buscar notificações (na página admin ou cliente)
// Abra DevTools > Console e execute:

fetch('/api/notifications/user', { 
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('Notificações:', data));

// 2. Teste contador não lidas
fetch('/api/notifications/unread-count')
.then(r => r.json())
.then(data => console.log('Não lidas:', data));
\`\`\`

---

## 🎯 **INDICADORES DE SUCESSO**

### **✅ Tudo funcionando se:**
- ✅ Deploy na Vercel sem erros
- ✅ Páginas carregam normalmente
- ✅ Notificações aparecem no sino (header)
- ✅ E-mails chegam na caixa de entrada
- ✅ Logs no console mostram atividade

### **❌ Problemas possíveis:**
- ❌ Erro 500 nas páginas → Verificar logs Vercel
- ❌ Notificações não aparecem → Verificar tabela Supabase
- ❌ E-mails não chegam → Verificar configuração AWS SES

---

## 📧 **E-MAILS DE TESTE**

### **Templates Implementados:**
1. **Projeto Criado** → E-mail para admins
2. **Comentário Adicionado** → E-mail para cliente/admins  
3. **Documento Adicionado** → E-mail para cliente/admins
4. **Status Alterado** → E-mail para cliente

### **Remetente Configurado:**
- `no-reply@colmeiasolar.com` (AWS SES)

---

## 🔧 **CONFIGURAÇÕES NECESSÁRIAS**

### **Variáveis de Ambiente (Vercel):**
\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AWS SES
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SES_SENDER_EMAIL=no-reply@colmeiasolar.com
\`\`\`

---

## 🚨 **SE ALGO DER ERRADO**

### **1. Erro de Build/Deploy:**
- Verificar logs completos na Vercel
- Conferir variáveis de ambiente
- Verificar sintaxe TypeScript

### **2. Notificações não funcionam:**
- Verificar tabela `notifications` no Supabase
- Conferir permissões RLS
- Verificar logs do server

### **3. E-mails não chegam:**
- Verificar configuração AWS SES
- Verificar domínio remetente verificado
- Conferir quota de envio AWS

---

**🎯 STATUS: PRONTO PARA DEPLOY E TESTE** ✅
