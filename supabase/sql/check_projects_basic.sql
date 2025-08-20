-- VERIFICAÇÃO BÁSICA - PROJETOS E USUÁRIOS
-- Execute este script primeiro

-- 1. Verificar se a tabela projects existe e tem dados
SELECT 'PROJETOS:' as tipo, COUNT(*) as total FROM public.projects;

-- 2. Verificar se há usuários em auth.users
SELECT 'AUTH USERS:' as tipo, COUNT(*) as total FROM auth.users;

-- 3. Verificar se há usuários em public.users
SELECT 'PUBLIC USERS:' as tipo, COUNT(*) as total FROM public.users;

-- 4. Mostrar alguns projetos (se existirem)
SELECT 
    'PROJETO EXEMPLO' as tipo,
    id,
    name,
    created_by,
    status
FROM public.projects 
LIMIT 3;

-- 5. Mostrar alguns usuários auth
SELECT 
    'USER AUTH EXEMPLO' as tipo,
    id,
    email
FROM auth.users 
LIMIT 3;

-- 6. Mostrar alguns usuários public
SELECT 
    'USER PUBLIC EXEMPLO' as tipo,
    id,
    email,
    role
FROM public.users 
LIMIT 3; 