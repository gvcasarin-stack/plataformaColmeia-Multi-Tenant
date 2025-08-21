-- =====================================================
-- CONFIGURAÇÃO SIMPLIFICADA DO SUPABASE STORAGE
-- =====================================================
-- Este script cria apenas os buckets necessários
-- As políticas RLS devem ser criadas via Dashboard

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
-- 2. VERIFICAÇÕES
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

-- Listar buckets criados
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id IN ('project-files', 'project-documents', 'user-avatars')
ORDER BY id;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 BUCKETS CRIADOS COM SUCESSO!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PRÓXIMOS PASSOS:';
  RAISE NOTICE '1. Vá para Storage no Dashboard do Supabase';
  RAISE NOTICE '2. Configure as políticas RLS manualmente';
  RAISE NOTICE '3. Teste upload/download de arquivos';
  RAISE NOTICE '';
  RAISE NOTICE '📁 BUCKETS DISPONÍVEIS:';
  RAISE NOTICE '   - project-files (público, 50MB)';
  RAISE NOTICE '   - project-documents (privado, 100MB)';
  RAISE NOTICE '   - user-avatars (público, 5MB)';
END $$;
