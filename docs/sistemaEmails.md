# Sistema de Emails - Plataforma Colmeia Solar

## 📧 Visão Geral

A Plataforma Colmeia Solar possui um sistema complexo de notificações por email que opera em múltiplas camadas. Este documento mapeia **TODOS** os sistemas de email da aplicação.

> **⚠️ IMPORTANTE**: Este sistema tem cooldown de 5 minutos por usuário+projeto para evitar spam de emails.

---

## 🏗️ Arquitetura do Sistema

### 📊 **1. SISTEMA PRINCIPAL DE EMAILS**
**Localização**: `src/lib/services/emailService.ts`

#### Função Central:
```typescript
export async function sendEmail(
  to: string | string[],
  subject: string,
  htmlBody: string,
  sourceEmail?: string
): Promise<boolean>
```
- **Status**: ✅ **COM cooldown via `sendEmailWithCooldown`**
- **SES Client**: `sesClient.send(new SendEmailCommand(params))`
- **Uso**: Sistema principal para todas as notificações de projetos

#### Função de Cooldown:
```typescript
async function sendEmailWithCooldown(
  recipientUserId: string,
  projectId: string, 
  recipientEmail: string,
  subject: string,
  htmlBody: string
): Promise<boolean>
```

---

## 📧 Funções Especializadas (COM cooldown)

### 1. **Notificações de Comentários**
```typescript
export async function sendEmailNotificationForComment(
  projectId: string,
  commentId: string,
  commentText: string,
  author: User,
  projectOwnerUserId?: string
): Promise<void>
```
- **Status**: ✅ **COM cooldown** (linhas 504, 509)
- **Fluxo**: Cliente comenta → Notifica admins | Admin comenta → Notifica cliente
- **Usado por**: `commentService/core.ts`, `projectService/core.ts`

### 2. **Notificações de Documentos**
```typescript
export async function sendEmailNotificationForDocument(
  projectId: string,
  fileName: string,
  uploader: User,
  projectOwnerUserId?: string
): Promise<void>
```
- **Status**: ✅ **COM cooldown** (linhas 603, 608)
- **Fluxo**: Upload de documento → Notifica partes interessadas

### 3. **Server Actions (COM cooldown)**
**Localização**: `src/lib/actions/notification-email-actions.ts`

- `sendAdminCommentEmail()` → `notifyUserOfNewComment()` ✅
- `sendClientCommentEmail()` → `notifyAdminAboutComment()` ✅  
- `sendAdminDocumentEmail()` → `notifyUserOfNewDocument()` ✅
- `sendClientDocumentEmail()` → `notifyAdminAboutDocument()` ✅
- `sendNewProjectEmail()` → `notifyAdminAboutNewProject()` ✅
- `sendStatusChangeEmail()` → `notifyStatusChangeV2()` ✅

---

## 🚨 APIs QUE ENVIAM EMAILS DIRETO (SEM cooldown)

### ❌ **1. API `/api/emails/send-template`**
**Localização**: `src/app/api/emails/send-template/route.ts`

```typescript
const sendEmailCommand = new SendEmailCommand({
  Source: senderEmail,
  Destination: { ToAddresses: [email] },
  Message: { /* ... */ }
});
const response = await sesClient.send(sendEmailCommand);
```

- **Status**: ❌ **SEM cooldown** - **PROBLEMA PRINCIPAL!**
- **Usado por**: `/api/notifications/project-created/route.ts` (linha 125)
- **Problema**: Envia emails direto via SES sem verificar cooldown

### ❌ **2. API `/api/emails/send`**
**Localização**: `src/app/api/emails/send/route.ts`

```typescript
const { sendEmail } = await import('@/lib/services/emailService');
const result = await sendEmail(email, subject, message);
```

- **Status**: ⚠️ **Usa função com cooldown, mas pode ser chamada externamente**

### ✅ **3. APIs de Teste (múltiplas) - ⚠️ USADAS EM PRODUÇÃO**
- `/api/test-ses/route.ts` - ❌ SEM cooldown (depreciada)
- `/api/test-ses/test-admin-email/route.ts` - ✅ **COM cooldown** (linha 173-174)
- `/api/test-ses/test-new-project/route.ts` - ✅ **COM cooldown** (linha 171-172)
- `/api/test/send-email/route.ts` - ✅ **COM cooldown** (linha 140-141)

**⚠️ IMPORTANTE**: Estas APIs de "teste" estão sendo **usadas em produção** pela interface administrativa:
- Página: `/admin/ferramentas/email` → chama `/api/emails/send`
- Ferramentas de teste do sistema → chamam APIs test-*

**IDs de Projeto para Cooldown**:
- `test-email-api` - Para `/api/test/send-email`
- `test-admin-email-api` - Para `/api/test-ses/test-admin-email`  
- `test-new-project-api` - Para `/api/test-ses/test-new-project`

### ❌ **4. API de Registro**
**Localização**: `src/app/api/auth/register-client/route.ts`

```typescript
const emailSent = await sendEmail(email, subject, htmlContent);
```

- **Status**: ⚠️ **Usa função principal, mas pode não ter projectId**

---

## 🔥 **Firebase Functions (Sistema Paralelo)**

### **Cloud Functions**
**Localização**: `functions/src/utils/email-service.ts`

```typescript
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody: string
): Promise<boolean>
```

- **Status**: ✅ **Sistema separado** (Firebase)
- **Uso**: Sistema de notificações Firebase
- **SES**: `AWS.SES().sendEmail(params).promise()`

---

## 📍 **Pontos de Entrada Principais**

### 1. **Comentários de Projeto**
**Fluxo**: `addCommentAction` → `notifyNewComment` → `sendEmailNotification`

### 2. **Upload de Arquivos**
**Fluxo**: `/api/storage/notify-upload-success` → `sendEmailNotificationForDocument`

### 3. **Mudanças de Status**
**Fluxo**: Server actions → `notifyStatusChangeV2`

### 4. **Novos Projetos**
**Fluxo**: `/api/notifications/project-created` → **DUPLO ENVIO!**
1. `notifyAdminAboutNewProject()` ✅ **COM cooldown**
2. `fetch('/api/emails/send-template')` ❌ **SEM cooldown** - **PROBLEMA!**

---

## 🎯 **Sistema de Cooldown**

### **Tabela Supabase**: `email_cooldowns`
```sql
CREATE TABLE email_cooldowns (
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    last_email_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, project_id)
);
```

### **Funções de Cooldown**:
```typescript
// Verifica se está em cooldown
async function isUserInEmailCooldown(userId: string, projectId: string): Promise<boolean>

// Atualiza timestamp após envio
async function updateEmailCooldown(userId: string, projectId: string): Promise<boolean>

// Envia com verificação de cooldown
async function sendEmailWithCooldown(...)
```

### **Regra**: 5 minutos por combinação `(user_id, project_id)`

---

## 🚨 **PROBLEMAS IDENTIFICADOS**

### **1. DUPLO ENVIO** 
`/api/notifications/project-created/route.ts` faz:
- ✅ Envio COM cooldown via `notifyAdminAboutNewProject`
- ❌ Envio SEM cooldown via `/api/emails/send-template`

### **2. APIs DIRETAS**
Múltiplas APIs enviando emails direto via SES sem cooldown

### **3. SISTEMA FILESERVICE VAZIO**
`src/lib/services/fileService/index.ts` - função `sendEmailNotificationForDocument` está vazia (só retorna `true`)

---

## 📊 **Templates de Email**

**Localização**: `src/lib/services/emailService.ts` → `emailTemplates`

```typescript
export const emailTemplates = {
  commentAdded: (projectName, projectNumber, authorName, commentText, projectUrl) => {...},
  documentAdded: (projectName, projectNumber, documentName, projectUrl) => {...},
  statusChange: (projectName, projectNumber, oldStatus, newStatus, projectUrl) => {...},
  newProject: (projectName, projectNumber, clientName, projectUrl, potencia?, distribuidora?) => {...}
};
```

---

## 🛠️ **CONFIGURAÇÃO**

### **AWS SES**
- **Client**: `@aws-sdk/client-ses`
- **Região**: Via `AWS_CONFIG.getRegion()`
- **Email origem**: Via `AWS_CONFIG.getSESSourceEmail()`

### **Variáveis de Ambiente**
```env
AWS_REGION=southamerica-east1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SES_SOURCE_EMAIL=noreply@colmeiasolar.com
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## 📝 **FLUXO IDEAL (COM cooldown)**

1. **Ação do usuário** (comentário, upload, mudança status)
2. **Verificar cooldown** no Supabase
3. **Se em cooldown** → Pular envio, retornar `true`
4. **Se não em cooldown** → Enviar email via SES
5. **Atualizar timestamp** na tabela `email_cooldowns`

---

## ✅ **CORREÇÕES APLICADAS**

### **1. ✅ Removido duplo envio**
- `/api/notifications/project-created/route.ts` - removido chamada duplicada para `/api/emails/send-template`

### **2. ✅ Implementado cooldown nas APIs diretas**
- `/api/emails/send-template` - implementado cooldown quando `userId` e `projectId` fornecidos
- `/api/test/send-email` - implementado cooldown completo
- `/api/test-ses/test-admin-email` - implementado cooldown completo  
- `/api/test-ses/test-new-project` - implementado cooldown completo

### **3. ⚠️ Função vazia identificada**
- `sendEmailNotificationForDocument` no `fileService` - confirmado ser dummy (só retorna `true`)

### **4. 🔥 CORREÇÃO RACE CONDITION - Ordem das operações**
**Problema identificado**: A função RPC `try_claim_email_slot` atualizava o timestamp ANTES de confirmar o envio do email, causando inconsistências.

**Solução implementada**:
- ✅ **Nova função**: `check_email_cooldown()` - Apenas verifica cooldown (sem atualizar)
- ✅ **Nova função**: `update_email_cooldown_after_send()` - Atualiza APENAS após envio confirmado
- ✅ **Novo fluxo**: Verificar → Enviar → Atualizar (ordem correta)

**Arquivos alterados**:
- `supabase/sql/fix_email_cooldown_race_condition.sql` - Novas funções RPC
- `src/lib/services/emailService.ts` - Fluxo corrigido em 3 etapas
- `src/app/api/debug/test-cooldown-fixed/route.ts` - API para testar correção

---

## 📚 **DEPENDÊNCIAS**

```json
{
  "@aws-sdk/client-ses": "SES v3 SDK",
  "@supabase/supabase-js": "Cooldown storage",
  "firebase-admin": "Cloud Functions",
  "firebase-functions": "Cloud Functions"
}
```

---

*Documentação criada em: Janeiro 2025*  
*Última atualização: Sistema de cooldown implementado*  
*Status: ⚠️ Correções pendentes para APIs diretas*