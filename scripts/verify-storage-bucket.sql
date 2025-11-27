-- Script para APENAS VERIFICAR o estado do bucket project-files
-- NÃO FAZ NENHUMA ALTERAÇÃO!
--
-- Execute no SQL Editor do Supabase Dashboard

-- 1. Verificar se o bucket existe e suas configurações
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM
  storage.buckets
WHERE
  name = 'project-files';

-- 2. Verificar políticas RLS do bucket
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM
  pg_policies
WHERE
  tablename = 'objects'
  AND schemaname = 'storage';

-- 3. Listar alguns arquivos do bucket para verificar se existem
SELECT
  id,
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  metadata
FROM
  storage.objects
WHERE
  bucket_id = 'project-files'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar a URL de um arquivo específico
-- (pegue o 'name' de um dos arquivos listados acima e substitua abaixo)
SELECT
  bucket_id,
  name,
  CONCAT(
    'https://tylighnuuqtztntjsfxv.supabase.co/storage/v1/object/',
    CASE WHEN (SELECT public FROM storage.buckets WHERE name = bucket_id)
      THEN 'public/'
      ELSE 'authenticated/'
    END,
    bucket_id,
    '/',
    name
  ) as full_url
FROM
  storage.objects
WHERE
  bucket_id = 'project-files'
ORDER BY created_at DESC
LIMIT 5;
