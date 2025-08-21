# 🔒 Configuração Manual das Políticas RLS do Storage

## 📋 Após executar o SQL dos buckets

Depois de executar `supabase/sql/create_storage_buckets_simple.sql`, você precisa configurar as políticas RLS manualmente via Dashboard.

## 🚀 Passo a Passo

### 1️⃣ **Acessar Storage no Dashboard**

1. Vá para: `https://supabase.com/dashboard/project/[SEU_PROJECT_ID]`
2. Clique em **Storage** no menu lateral
3. Você deve ver os 3 buckets criados:
   - `project-files`
   - `project-documents` 
   - `user-avatars`

### 2️⃣ **Configurar Políticas para project-files**

1. **Clique no bucket `project-files`**
2. **Vá para a aba "Policies"**
3. **Clique em "New Policy"**

#### **Política 1: Visualizar arquivos (SELECT)**
\`\`\`sql
-- Nome: Allow authenticated users to view project files
-- Operação: SELECT
-- Target roles: authenticated

bucket_id = 'project-files' AND auth.role() = 'authenticated'
\`\`\`

#### **Política 2: Upload de arquivos (INSERT)**
\`\`\`sql
-- Nome: Allow admin/superadmin to upload project files  
-- Operação: INSERT
-- Target roles: authenticated

bucket_id = 'project-files' AND (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
\`\`\`

#### **Política 3: Deletar arquivos (DELETE)**
\`\`\`sql
-- Nome: Allow admin/superadmin to delete project files
-- Operação: DELETE
-- Target roles: authenticated

bucket_id = 'project-files' AND (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
\`\`\`

#### **Política 4: Atualizar arquivos (UPDATE)**
\`\`\`sql
-- Nome: Allow admin/superadmin to update project files
-- Operação: UPDATE
-- Target roles: authenticated

bucket_id = 'project-files' AND (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
\`\`\`

### 3️⃣ **Configurar Políticas para project-documents**

1. **Clique no bucket `project-documents`**
2. **Vá para a aba "Policies"**
3. **Clique em "New Policy"**

#### **Política 1: Visualizar documentos (SELECT)**
\`\`\`sql
-- Nome: Allow users to view their project documents
-- Operação: SELECT
-- Target roles: authenticated

bucket_id = 'project-documents' AND auth.role() = 'authenticated' AND (
  (auth.jwt()->>'role')::text IN ('admin', 'superadmin') OR
  (
    (auth.jwt()->>'role')::text = 'cliente' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM public.projects p WHERE p.created_by = auth.uid()
    )
  )
)
\`\`\`

#### **Política 2: Upload de documentos (INSERT)**
\`\`\`sql
-- Nome: Allow admin/superadmin to upload project documents
-- Operação: INSERT
-- Target roles: authenticated

bucket_id = 'project-documents' AND (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
\`\`\`

#### **Política 3: Deletar documentos (DELETE)**
\`\`\`sql
-- Nome: Allow admin/superadmin to delete project documents
-- Operação: DELETE
-- Target roles: authenticated

bucket_id = 'project-documents' AND (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
\`\`\`

### 4️⃣ **Configurar Políticas para user-avatars**

1. **Clique no bucket `user-avatars`**
2. **Vá para a aba "Policies"**
3. **Clique em "New Policy"**

#### **Política 1: Visualizar avatares (SELECT)**
\`\`\`sql
-- Nome: Allow authenticated users to view avatars
-- Operação: SELECT
-- Target roles: authenticated

bucket_id = 'user-avatars' AND auth.role() = 'authenticated'
\`\`\`

#### **Política 2: Upload de avatar próprio (INSERT)**
\`\`\`sql
-- Nome: Allow users to upload their own avatar
-- Operação: INSERT
-- Target roles: authenticated

bucket_id = 'user-avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
\`\`\`

#### **Política 3: Atualizar avatar próprio (UPDATE)**
\`\`\`sql
-- Nome: Allow users to update their own avatar
-- Operação: UPDATE
-- Target roles: authenticated

bucket_id = 'user-avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
\`\`\`

#### **Política 4: Deletar avatar próprio (DELETE)**
\`\`\`sql
-- Nome: Allow users to delete their own avatar
-- Operação: DELETE
-- Target roles: authenticated

bucket_id = 'user-avatars' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text
\`\`\`

## ✅ **Verificação Final**

Após configurar todas as políticas:

1. **Vá para cada bucket**
2. **Verifique se as políticas aparecem na aba "Policies"**
3. **Teste upload de um arquivo pequeno**

## 🎯 **Resumo das Permissões**

### **project-files (público)**
- ✅ Todos os usuários autenticados podem **visualizar**
- ✅ Apenas admins/superadmins podem **upload/delete/update**

### **project-documents (privado)**
- ✅ Admins/superadmins podem **ver todos**
- ✅ Clientes podem **ver apenas de seus projetos**
- ✅ Apenas admins/superadmins podem **upload/delete**

### **user-avatars (público)**
- ✅ Todos os usuários autenticados podem **visualizar**
- ✅ Usuários podem **gerenciar apenas seu próprio avatar**

## 🚨 **Importante**

- **Teste cada política** após criar
- **Verifique se não há conflitos** entre políticas
- **Use o SQL Editor** para testar queries se necessário

---

**🎉 Após configurar todas as políticas, o Storage estará 100% funcional!**
