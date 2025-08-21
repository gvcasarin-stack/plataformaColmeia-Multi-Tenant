-- ==============================================
-- ATUALIZAR EMAIL DO USUÁRIO SUPER ADMIN
-- ==============================================

-- Atualizar email na tabela users
UPDATE public.users 
SET 
    email = 'gvcasarin@gmail.com',
    updated_at = NOW()
WHERE id = 'bbc5431d-f9a0-4554-865b-e5fd5d38c0d7';

-- Verificar se a atualização foi feita
SELECT 
    id,
    email,
    name,
    role,
    tenant_id,
    (SELECT name FROM public.organizations WHERE id = tenant_id) as organizacao
FROM public.users 
WHERE id = 'bbc5431d-f9a0-4554-865b-e5fd5d38c0d7';

SELECT '✅ Email do super admin atualizado com sucesso!' as status;
