-- Script para debug da tabela projects
-- Verificar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se há dados na tabela
SELECT COUNT(*) as total_projects FROM public.projects;

-- Verificar alguns projetos de exemplo
SELECT 
    id,
    name,
    number,
    created_by,
    status,
    created_at,
    updated_at
FROM public.projects 
LIMIT 5;

-- Verificar se há projetos para um usuário específico (substitua pelo ID do usuário)
-- SELECT * FROM public.projects WHERE created_by = 'USER_ID_HERE';

-- Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects';

-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'projects'; 