-- VERIFICAÇÃO ESPECÍFICA - CONTAGEM E RELAÇÃO
-- Execute este script e me mostre TODOS os resultados

-- 1. CONTAGEM TOTAL DE PROJETOS
SELECT COUNT(*) as total_projetos FROM public.projects;

-- 2. CONTAGEM TOTAL DE USUÁRIOS AUTH
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- 3. CONTAGEM TOTAL DE USUÁRIOS PUBLIC
SELECT COUNT(*) as total_public_users FROM public.users;

-- 4. VERIFICAR SE HÁ PROJETOS PARA O CLIENTE ESPECÍFICO
SELECT COUNT(*) as projetos_do_cliente 
FROM public.projects 
WHERE created_by = '0f5fa1f4-16af-4e8c-b178-5b099c256e0c';

-- 5. VERIFICAR TODOS OS PROJETOS (SE EXISTIREM)
SELECT 
    id,
    name,
    number,
    created_by,
    status,
    created_at
FROM public.projects 
ORDER BY created_at DESC;

-- 6. VERIFICAR RELAÇÃO USUÁRIO-PROJETO
SELECT 
    p.id as projeto_id,
    p.name as projeto_nome,
    p.created_by,
    u.email as usuario_email,
    u.role as usuario_role
FROM public.projects p
LEFT JOIN public.users u ON p.created_by = u.id
ORDER BY p.created_at DESC;
