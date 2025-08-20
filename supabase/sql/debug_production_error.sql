-- =====================================================
-- DEBUG: ERRO 500 EM PRODUÇÃO - CRIAÇÃO DE PROJETOS
-- =====================================================

-- 1. Verificar se a tabela projects existe e sua estrutura
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- 3. Listar políticas RLS ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'projects';

-- 4. Verificar se há projetos existentes
SELECT COUNT(*) as total_projects FROM public.projects;

-- 5. Testar inserção simples (como service role)
-- ATENÇÃO: Execute apenas se necessário para debug
/*
INSERT INTO public.projects (
    name,
    number,
    created_by,
    empresa_integradora,
    nome_cliente_final,
    distribuidora,
    potencia,
    status,
    prioridade
) VALUES (
    'Teste Debug',
    'TEST-2024-999',
    '00000000-0000-0000-0000-000000000000', -- UUID fictício
    'Empresa Teste',
    'Cliente Teste',
    'Distribuidora Teste',
    100.0,
    'Não Iniciado',
    'Baixa'
);
*/

-- 6. Verificar constraints que podem estar falhando
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'projects'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 7. Verificar se usuários existem na tabela users
SELECT COUNT(*) as total_users FROM public.users;

-- 8. TESTE RÁPIDO: Desabilitar RLS temporariamente
-- CUIDADO: Use apenas para debug, reabilite depois!
-- ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- 9. APÓS TESTE: Reabilitar RLS
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RESULTADOS ESPERADOS:
-- =====================================================
-- 1. Tabela deve ter todos os campos necessários
-- 2. RLS deve estar habilitado (rowsecurity = true)
-- 3. Deve haver políticas para INSERT
-- 4. Constraints de FK devem estar corretas
-- 5. Tabela users deve ter registros

RAISE NOTICE '✅ Debug queries executadas. Verifique os resultados acima.'; 