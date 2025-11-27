-- Atualizar permissions do colaborador Carlos para incluir can_view_assinaturas
UPDATE users
SET permissions = jsonb_set(
  permissions::jsonb,
  '{can_view_assinaturas}',
  'false'
)
WHERE email = 'casarin166@yahoo.com.br'
AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

-- Verificar resultado
SELECT
  id,
  email,
  role,
  permissions
FROM users
WHERE email = 'casarin166@yahoo.com.br';
