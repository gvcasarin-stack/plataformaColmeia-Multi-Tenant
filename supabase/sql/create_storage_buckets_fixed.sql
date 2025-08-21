-- =====================================================
-- CONFIGURAÇÃO DO SUPABASE STORAGE
-- =====================================================
-- Este script cria os buckets necessários para o sistema
-- e configura as políticas de acesso adequadas
--
-- INSTRUÇÕES:
-- 1. Copie todo o conteúdo deste arquivo
-- 2. Cole no SQL Editor do Supabase Dashboard
-- 3. Execute o script completo

-- =====================================================
-- 1. CRIAR BUCKETS
-- =====================================================

-- Bucket para arquivos de projetos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  true, -- Público para facilitar acesso
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Bucket para documentos de projetos (mais restritivo)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-documents',
  'project-documents',
  false, -- Privado, requer autenticação
  104857600, -- 100MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Bucket para avatares de usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true, -- Público
  5242880, -- 5MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. POLÍTICAS RLS PARA STORAGE
-- =====================================================

-- =====================================================
-- 2.1 POLÍTICAS PARA project-files
-- =====================================================

-- Permitir que usuários autenticados vejam arquivos de projetos
CREATE POLICY "Allow authenticated users to view project files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files' AND 
    auth.role() = 'authenticated'
  );

-- Permitir que admins/superadmins façam upload de arquivos
CREATE POLICY "Allow admin/superadmin to upload project files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files' AND
    (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
  );

-- Permitir que admins/superadmins deletem arquivos
CREATE POLICY "Allow admin/superadmin to delete project files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files' AND
    (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
  );

-- Permitir que admins/superadmins atualizem arquivos
CREATE POLICY "Allow admin/superadmin to update project files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'project-files' AND
    (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
  );

-- =====================================================
-- 2.2 POLÍTICAS PARA project-documents
-- =====================================================

-- Permitir que usuários vejam documentos de seus próprios projetos
CREATE POLICY "Allow users to view their project documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-documents' AND
    auth.role() = 'authenticated' AND
    (
      -- Admins/superadmins podem ver todos
      (auth.jwt()->>'role')::text IN ('admin', 'superadmin') OR
      -- Clientes podem ver apenas documentos de projetos que criaram
      (
        (auth.jwt()->>'role')::text = 'cliente' AND
        (storage.foldername(name))[1] IN (
          SELECT p.id::text 
          FROM public.projects p 
          WHERE p.created_by = auth.uid()
        )
      )
    )
  );

-- Permitir que admins/superadmins façam upload de documentos
CREATE POLICY "Allow admin/superadmin to upload project documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-documents' AND
    (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
  );

-- Permitir que admins/superadmins deletem documentos
CREATE POLICY "Allow admin/superadmin to delete project documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-documents' AND
    (auth.jwt()->>'role')::text IN ('admin', 'superadmin')
  );

-- =====================================================
-- 2.3 POLÍTICAS PARA user-avatars
-- =====================================================

-- Permitir que usuários vejam todos os avatares
CREATE POLICY "Allow authenticated users to view avatars" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'user-avatars' AND 
    auth.role() = 'authenticated'
  );

-- Permitir que usuários façam upload de seus próprios avatares
CREATE POLICY "Allow users to upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir que usuários atualizem seus próprios avatares
CREATE POLICY "Allow users to update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir que usuários deletem seus próprios avatares
CREATE POLICY "Allow users to delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'user-avatars' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- 3. VERIFICAÇÕES E LOGS
-- =====================================================

-- Verificar se os buckets foram criados
DO $$
BEGIN
  RAISE NOTICE 'Verificando buckets criados...';
  
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-files') THEN
    RAISE NOTICE '✅ Bucket project-files criado com sucesso';
  ELSE
    RAISE NOTICE '❌ Falha ao criar bucket project-files';
  END IF;
  
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-documents') THEN
    RAISE NOTICE '✅ Bucket project-documents criado com sucesso';
  ELSE
    RAISE NOTICE '❌ Falha ao criar bucket project-documents';
  END IF;
  
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') THEN
    RAISE NOTICE '✅ Bucket user-avatars criado com sucesso';
  ELSE
    RAISE NOTICE '❌ Falha ao criar bucket user-avatars';
  END IF;
END $$;

-- Listar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- =====================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON SCHEMA storage IS 'Schema do Supabase Storage para gerenciamento de arquivos';

-- Comentários nos buckets
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 52428800
WHERE id = 'project-files';

UPDATE storage.buckets 
SET 
  public = false,
  file_size_limit = 104857600
WHERE id = 'project-documents';

UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 5242880
WHERE id = 'user-avatars';

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 CONFIGURAÇÃO DO SUPABASE STORAGE CONCLUÍDA!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 BUCKETS CRIADOS:';
  RAISE NOTICE '   - project-files (público, 50MB, múltiplos tipos)';
  RAISE NOTICE '   - project-documents (privado, 100MB, documentos)';
  RAISE NOTICE '   - user-avatars (público, 5MB, imagens)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 POLÍTICAS RLS CONFIGURADAS:';
  RAISE NOTICE '   - Admins: acesso total a todos os buckets';
  RAISE NOTICE '   - Clientes: acesso limitado aos próprios projetos';
  RAISE NOTICE '   - Usuários: podem gerenciar próprios avatares';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 PRÓXIMO PASSO: Testar upload/download de arquivos!';
END $$;
