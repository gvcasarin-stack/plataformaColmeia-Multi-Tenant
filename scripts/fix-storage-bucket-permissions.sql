-- Script para verificar e corrigir permissões do bucket project-files no Supabase Storage
--
-- Execute este script no SQL Editor do Supabase Dashboard
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 1. Verificar se o bucket existe e se é público
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

-- 2. Tornar o bucket público (se ainda não for)
UPDATE storage.buckets
SET public = true
WHERE name = 'project-files';

-- 3. Criar políticas RLS para permitir acesso aos arquivos
-- Política para SELECT (leitura) - permitir acesso público aos arquivos
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-files');

-- Política para INSERT (upload) - apenas usuários autenticados
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-files'
  AND auth.role() = 'authenticated'
);

-- Política para DELETE - apenas o dono ou admin
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-files'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  )
);

-- Verificar as políticas criadas
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
