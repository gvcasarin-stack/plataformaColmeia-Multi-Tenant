-- =====================================================
-- Script: Adicionar permissão can_view_assinaturas
-- Para: TODOS os colaboradores em TODOS os tenants
-- =====================================================

-- 1. Verificar quantos colaboradores serão afetados
SELECT
  COUNT(*) as total_colaboradores,
  COUNT(CASE WHEN permissions::jsonb ? 'can_view_assinaturas' THEN 1 END) as ja_tem_permissao,
  COUNT(CASE WHEN NOT (permissions::jsonb ? 'can_view_assinaturas') THEN 1 END) as precisa_adicionar
FROM users
WHERE role = 'colaborador'
  AND status = 'active';

-- 2. Listar colaboradores que precisam da atualização
SELECT
  id,
  email,
  name,
  tenant_id,
  role,
  permissions::jsonb ? 'can_view_assinaturas' as tem_permissao
FROM users
WHERE role = 'colaborador'
  AND status = 'active'
  AND NOT (permissions::jsonb ? 'can_view_assinaturas')
ORDER BY created_at DESC;

-- 3. Atualizar TODOS os colaboradores que não têm a permissão
UPDATE users
SET
  permissions = jsonb_set(
    permissions::jsonb,
    '{can_view_assinaturas}',
    'false'::jsonb
  ),
  updated_at = NOW()
WHERE role = 'colaborador'
  AND status = 'active'
  AND NOT (permissions::jsonb ? 'can_view_assinaturas');

-- 4. Verificar resultado da atualização
SELECT
  COUNT(*) as total_colaboradores_atualizados
FROM users
WHERE role = 'colaborador'
  AND status = 'active'
  AND permissions::jsonb ? 'can_view_assinaturas';

-- 5. Mostrar alguns exemplos de colaboradores atualizados
SELECT
  id,
  email,
  name,
  tenant_id,
  role,
  permissions
FROM users
WHERE role = 'colaborador'
  AND status = 'active'
  AND permissions::jsonb ? 'can_view_assinaturas'
ORDER BY updated_at DESC
LIMIT 10;
