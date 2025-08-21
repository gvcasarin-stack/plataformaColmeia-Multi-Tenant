-- ==============================================
-- VERIFICAÇÃO DO STATUS ATUAL DAS TABELAS
-- ==============================================

-- Listar todas as tabelas existentes
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar especificamente se a tabela clients existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
        ) 
        THEN '❌ PROBLEMA: Tabela clients ainda existe'
        ELSE '✅ SUCESSO: Tabela clients não existe (como esperado)'
    END as status_clients;

-- Verificar se a coluna client_id existe na tabela projects
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'client_id'
        ) 
        THEN '❌ PROBLEMA: Coluna client_id ainda existe em projects'
        ELSE '✅ SUCESSO: Coluna client_id não existe em projects (como esperado)'
    END as status_projects_client_id;

-- Verificar estrutura da tabela projects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- Contar registros em cada tabela
SELECT 
    'users' as tabela,
    COUNT(*) as total_registros
FROM public.users
UNION ALL
SELECT 
    'projects' as tabela,
    COUNT(*) as total_registros
FROM public.projects
UNION ALL
SELECT 
    'active_sessions' as tabela,
    COUNT(*) as total_registros
FROM public.active_sessions
UNION ALL
SELECT 
    'configs' as tabela,
    COUNT(*) as total_registros
FROM public.configs
UNION ALL
SELECT 
    'notifications' as tabela,
    COUNT(*) as total_registros
FROM public.notifications
ORDER BY tabela;
