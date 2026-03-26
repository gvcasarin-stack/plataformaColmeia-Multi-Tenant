-- ============================================================
-- CORREÇÃO: Preencher owner_id em projetos legados
-- ============================================================
-- Problema: Projetos criados antes da implementação do campo
-- owner_id ficaram sem esse campo preenchido. O portal do cliente
-- usa owner_id para verificar permissão de acesso, bloqueando
-- clientes de acessar seus próprios projetos.
--
-- ⚠️  EXECUTE O SCRIPT DE DIAGNÓSTICO PRIMEIRO:
--     diagnostico-projetos-sem-owner-id.sql
--
-- ⚠️  EXECUTE CADA BLOCO SEPARADAMENTE e valide antes de continuar.
-- ============================================================


-- ============================================================
-- PARTE 1 (SEGURA): Projetos criados pelo próprio cliente
-- ============================================================
-- Para projetos onde created_by é um CLIENTE (role = 'cliente'),
-- owner_id deve ser igual a created_by.
-- Estes projetos já funcionam no portal (o fallback trata),
-- mas preencher owner_id garante consistência total.
--
-- IMPACTO ESPERADO: Baixo risco — apenas formaliza o que o
-- sistema já considera como verdade.
-- ============================================================

-- 1A. Preview (só leitura) — veja o que será alterado
SELECT
  p.id,
  p.number,
  p.nome_cliente_final,
  p.created_by   AS owner_id_que_sera_definido,
  u.name         AS nome_usuario,
  u.email
FROM projects p
JOIN users u ON u.id = p.created_by
WHERE p.owner_id IS NULL
  AND u.role = 'cliente'
  AND p.deleted_at IS NULL
ORDER BY p.created_at;

-- 1B. Correção — execute após validar o preview acima
/*
UPDATE projects
SET
  owner_id   = created_by,
  updated_at = NOW()
WHERE owner_id IS NULL
  AND created_by IN (
    SELECT id FROM users WHERE role = 'cliente'
  )
  AND deleted_at IS NULL;
*/


-- ============================================================
-- PARTE 2 (REQUER ATENÇÃO): Projetos criados por admins
-- ============================================================
-- Estes projetos têm created_by = admin.id e owner_id = null.
-- NÃO é possível determinar automaticamente quem é o cliente
-- dono sem análise manual, pois não há coluna direta ligando
-- o projeto a um cliente específico quando criado por admin.
--
-- OPÇÕES:
--   A) Identificar manualmente o cliente pelo nome do projeto
--      e preencher owner_id individualmente (recomendado)
--   B) Se o projeto não pertence a nenhum cliente específico,
--      manter owner_id = null (projeto interno/administrativo)
-- ============================================================

-- 2A. Lista de projetos sem owner_id criados por admins para análise manual
SELECT
  p.id                       AS project_id,
  p.number                   AS numero,
  p.nome_cliente_final       AS nome_cliente_no_projeto,
  p.tenant_id,
  p.created_at,
  u.name                     AS admin_que_criou,
  u.email                    AS email_admin,
  -- Sugestão: buscar cliente pelo nome do projeto (coincidência aproximada)
  (
    SELECT uc.id
    FROM users uc
    WHERE uc.role = 'cliente'
      AND uc.tenant_id = p.tenant_id
      AND (
        uc.name ILIKE '%' || SPLIT_PART(p.nome_cliente_final, ' ', 1) || '%'
        OR uc.email ILIKE '%' || SPLIT_PART(p.nome_cliente_final, ' ', 1) || '%'
      )
    LIMIT 1
  )                          AS possivel_cliente_id
FROM projects p
JOIN users u ON u.id = p.created_by
WHERE p.owner_id IS NULL
  AND u.role IN ('admin', 'superadmin', 'colaborador')
  AND p.deleted_at IS NULL
ORDER BY p.tenant_id, p.created_at DESC;


-- 2B. Correção individual para projetos específicos
-- Substitua os UUIDs pelos valores corretos após análise manual
/*
UPDATE projects
SET
  owner_id   = '<UUID_DO_CLIENTE_DONO>',
  updated_at = NOW()
WHERE id = '<UUID_DO_PROJETO>'
  AND owner_id IS NULL;  -- cláusula de segurança: só atualiza se ainda NULL
*/


-- ============================================================
-- VERIFICAÇÃO FINAL: Conferir estado após correções
-- ============================================================
SELECT
  u.role                     AS role_criador,
  COUNT(p.id)                AS total_projetos,
  COUNT(p.id) FILTER (WHERE p.owner_id IS NULL)     AS ainda_sem_owner_id,
  COUNT(p.id) FILTER (WHERE p.owner_id IS NOT NULL) AS com_owner_id
FROM projects p
LEFT JOIN users u ON u.id = p.created_by
WHERE p.deleted_at IS NULL
GROUP BY u.role
ORDER BY total_projetos DESC;
