-- ==============================================
-- TESTES DE ROW LEVEL SECURITY (RLS)
-- ==============================================

-- IMPORTANTE: Execute estes comandos no SQL Editor do Supabase
-- para verificar se as políticas RLS estão funcionando corretamente

-- ==============================================
-- 1. VERIFICAR SE RLS ESTÁ HABILITADO
-- ==============================================

-- Verificar status RLS nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'clients', 'projects');

-- ==============================================
-- 2. LISTAR POLÍTICAS CRIADAS
-- ==============================================

-- Ver todas as políticas RLS criadas
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ==============================================
-- 3. TESTES FUNCIONAIS
-- ==============================================

-- NOTA: Para testar adequadamente, você precisará:
-- 1. Fazer login como usuário com role 'cliente'
-- 2. Fazer login como usuário com role 'admin' ou 'superadmin'
-- 3. Tentar as operações abaixo e verificar os resultados

-- Teste 1: Usuário comum tentando ver todos os usuários (deve falhar ou retornar apenas ele mesmo)
-- SELECT * FROM public.users;

-- Teste 2: Usuário comum tentando criar um cliente
-- INSERT INTO public.clients (name, email, phone, created_by) 
-- VALUES ('Cliente Teste', 'teste@exemplo.com', '11999999999', auth.uid());

-- Teste 3: Usuário comum tentando ver clientes de outros (deve retornar vazio)
-- SELECT * FROM public.clients WHERE created_by != auth.uid();

-- Teste 4: Admin tentando ver todos os usuários (deve funcionar)
-- SELECT * FROM public.users;

-- Teste 5: Admin tentando ver todos os clientes (deve funcionar)
-- SELECT * FROM public.clients;

-- ==============================================
-- 4. VERIFICAÇÕES DE INTEGRIDADE
-- ==============================================

-- Verificar se existem usuários de teste para diferentes roles
SELECT 
    id,
    email,
    full_name,
    role,
    created_at
FROM public.users 
ORDER BY role, created_at;

-- Verificar se existem dados de teste nas tabelas
SELECT 
    'users' as tabela, 
    COUNT(*) as total_registros 
FROM public.users
UNION ALL
SELECT 
    'clients' as tabela, 
    COUNT(*) as total_registros 
FROM public.clients
UNION ALL
SELECT 
    'projects' as tabela, 
    COUNT(*) as total_registros 
FROM public.projects;

-- ==============================================
-- 5. COMANDOS PARA RESET (SE NECESSÁRIO)
-- ==============================================

-- Para desabilitar RLS (apenas se necessário para debug)
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;

-- Para remover todas as políticas (apenas se necessário para reset)
-- DROP POLICY IF EXISTS "Allow individual user read access" ON public.users;
-- DROP POLICY IF EXISTS "Allow individual user update access" ON public.users;
-- DROP POLICY IF EXISTS "Allow admin/superadmin read access to all users" ON public.users;
-- DROP POLICY IF EXISTS "Allow admin/superadmin update access to all users" ON public.users;
-- DROP POLICY IF EXISTS "Allow authenticated users to create clients" ON public.clients;
-- DROP POLICY IF EXISTS "Allow users to read their own clients" ON public.clients;
-- DROP POLICY IF EXISTS "Allow users to update their own clients" ON public.clients;
-- DROP POLICY IF EXISTS "Allow users to delete their own clients" ON public.clients;
-- DROP POLICY IF EXISTS "Allow admin/superadmin full access to clients" ON public.clients;
-- DROP POLICY IF EXISTS "Allow authenticated users to create projects" ON public.projects;
-- DROP POLICY IF EXISTS "Allow users to read their own projects" ON public.projects;
-- DROP POLICY IF EXISTS "Allow users to update their own projects" ON public.projects;
-- DROP POLICY IF EXISTS "Allow users to delete their own projects" ON public.projects;
-- DROP POLICY IF EXISTS "Allow admin/superadmin full access to projects" ON public.projects;
