-- ============================================
-- DIAGNÓSTICO COMPLETO: Assinatura + Projetos
-- ============================================

-- 1. VERIFICAR ASSINATURA ATIVA
SELECT
    'ASSINATURA' as tipo,
    id,
    user_id,
    plano_id,
    tenant_id,
    status,
    projetos_mensais,
    projetos_usados_mes_atual,
    data_inicio,
    ultimo_reset,
    proximo_reset,
    created_at
FROM cliente_assinaturas
WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND status = 'ativa';

-- 2. VERIFICAR PROJETOS VINCULADOS À ASSINATURA
SELECT
    'PROJETO_VINCULADO' as tipo,
    p.id,
    p.number,
    p.nome_cliente_final,
    p.potencia,
    p.status,
    p.payment_status as pagamento,
    p.created_at as data_criacao,
    p.cliente_assinatura_id,
    p.tenant_id,
    p.deleted_at,
    p.is_archived
FROM projects p
WHERE p.cliente_assinatura_id = 'b1434ebe-5f94-470d-ae32-bd80d8efedaa'
    AND p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY p.created_at DESC;

-- 3. VERIFICAR SE HÁ PROJETOS ARQUIVADOS OU DELETADOS
SELECT
    'PROJETOS_PROBLEMATICOS' as tipo,
    p.id,
    p.number,
    p.nome_cliente_final,
    p.cliente_assinatura_id,
    CASE
        WHEN p.deleted_at IS NOT NULL THEN 'DELETADO'
        WHEN p.is_archived = true THEN 'ARQUIVADO'
        ELSE 'OK'
    END as problema,
    p.deleted_at,
    p.is_archived,
    p.created_at
FROM projects p
WHERE p.cliente_assinatura_id = 'b1434ebe-5f94-470d-ae32-bd80d8efedaa'
    AND (p.deleted_at IS NOT NULL OR p.is_archived = true);

-- 4. CONTAR PROJETOS POR STATUS
SELECT
    'CONTAGEM_STATUS' as tipo,
    COUNT(*) as total,
    CASE
        WHEN deleted_at IS NOT NULL THEN 'deletado'
        WHEN is_archived = true THEN 'arquivado'
        ELSE 'ativo'
    END as categoria
FROM projects
WHERE cliente_assinatura_id = 'b1434ebe-5f94-470d-ae32-bd80d8efedaa'
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
GROUP BY categoria;

-- 5. VERIFICAR USUÁRIO DONO DA ASSINATURA
SELECT
    'USUARIO_ASSINATURA' as tipo,
    u.id,
    u.name,
    u.email,
    u.company_name,
    u.billing_mode,
    u.tenant_id
FROM users u
WHERE u.id = 'b772107b-bfa8-48e7-81ac-995331e66623';
