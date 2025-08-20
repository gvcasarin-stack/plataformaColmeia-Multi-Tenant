-- =====================================================
-- RESTABELECER RLS NA TABELA PROJECTS
-- =====================================================

-- Reabilitar Row Level Security na tabela projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Verificar se foi reabilitado corretamente
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- Verificar se as políticas ainda estão ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;

-- Resultado esperado: rowsecurity = true
RAISE NOTICE '✅ RLS reabilitado na tabela projects'; 