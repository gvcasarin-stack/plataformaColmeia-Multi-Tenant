-- ============================================================
-- DIAGNÓSTICO: Projetos sem owner_id — causa raiz do erro
-- "Você não tem permissão para acessar este projeto"
-- ============================================================
-- ⚠️  Script SOMENTE LEITURA — não altera nenhum dado.
-- Execute no painel SQL do Supabase antes de aplicar a correção.
-- ============================================================


-- 1️⃣ VISÃO GERAL: Quantos projetos têm owner_id null por role do criador
SELECT
  u.role                         AS role_criador,
  COUNT(p.id)                    AS total_projetos,
  COUNT(p.id) FILTER (WHERE p.owner_id IS NULL)     AS sem_owner_id,
  COUNT(p.id) FILTER (WHERE p.owner_id IS NOT NULL) AS com_owner_id
FROM projects p
LEFT JOIN users u ON u.id = p.created_by
GROUP BY u.role
ORDER BY total_projetos DESC;


-- 2️⃣ DETALHE: Projetos com owner_id NULL criados por ADMINS/COLABORADORES
-- Estes são os projetos que bloqueiam o acesso do cliente no portal
SELECT
  p.id                           AS project_id,
  p.number                       AS numero,
  p.nome_cliente_final           AS nome_cliente,
  p.status,
  p.created_at,
  p.tenant_id,
  p.created_by,
  u.role                         AS role_criador,
  u.name                         AS nome_criador,
  u.email                        AS email_criador,
  p.owner_id                     -- deve ser NULL para aparecer aqui
FROM projects p
LEFT JOIN users u ON u.id = p.created_by
WHERE p.owner_id IS NULL
  AND u.role IN ('admin', 'superadmin', 'colaborador')
  AND p.deleted_at IS NULL
ORDER BY p.tenant_id, p.created_at DESC;


-- 3️⃣ DETALHE: Projetos com owner_id NULL criados por CLIENTES
-- Estes projetos já funcionam corretamente (fallback owner_id || created_by)
-- mas idealmente deveriam ter owner_id preenchido para consistência
SELECT
  p.id                           AS project_id,
  p.number                       AS numero,
  p.nome_cliente_final           AS nome_cliente,
  p.created_at,
  p.tenant_id,
  p.created_by                   AS client_id,
  u.name                         AS nome_cliente_usuario,
  u.email                        AS email_cliente
FROM projects p
LEFT JOIN users u ON u.id = p.created_by
WHERE p.owner_id IS NULL
  AND u.role = 'cliente'
  AND p.deleted_at IS NULL
ORDER BY p.tenant_id, p.created_at DESC;


-- 4️⃣ VERIFICAÇÃO DO PROJETO ESPECÍFICO DO BUG REPORTADO
-- Substitua o UUID abaixo pelo ID do projeto que gerou o erro na screenshot
SELECT
  p.id,
  p.number,
  p.nome_cliente_final,
  p.tenant_id,
  p.created_by,
  u_creator.role   AS role_criador,
  u_creator.name   AS nome_criador,
  u_creator.email  AS email_criador,
  p.owner_id,
  u_owner.name     AS nome_owner,
  u_owner.email    AS email_owner,
  p.deleted_at
FROM projects p
LEFT JOIN users u_creator ON u_creator.id = p.created_by
LEFT JOIN users u_owner   ON u_owner.id   = p.owner_id
WHERE p.id = 'db4077db-7f26-463b-83d4-bc95876ec74d';  -- ID da screenshot
