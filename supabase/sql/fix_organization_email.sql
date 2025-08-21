-- ==============================================
-- CORRIGIR EMAIL DE CONTATO DA ORGANIZAÇÃO
-- ==============================================

-- Atualizar email de contato da organização SGF
UPDATE public.organizations 
SET 
    contact_email = 'gvcasarin@gmail.com',
    billing_email = 'gvcasarin@gmail.com',
    updated_at = NOW()
WHERE id = 'e6ccd2e2-ea97-4aed-8a6d-feb1bbc59f2b';

-- Verificar se foi atualizado
SELECT 
    id,
    name,
    slug,
    plan,
    contact_email,
    billing_email,
    status
FROM public.organizations 
WHERE id = 'e6ccd2e2-ea97-4aed-8a6d-feb1bbc59f2b';

SELECT '✅ Email de contato da organização atualizado com sucesso!' as status;
