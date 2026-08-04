-- Reconciliação: para projetos cuja linha do tempo está desatualizada em
-- relação ao status atual, adiciona UM evento novo trazendo a timeline pro
-- presente. NÃO apaga nem altera nenhuma linha existente — só acrescenta um
-- evento novo, claramente identificado como reconciliação automática.
--
-- Seguro para rodar mais de uma vez (idempotente): só insere se ainda não
-- existir nenhum evento de status, para aquele projeto, com new_status igual
-- ao status atual.
--
-- Cobre os dois casos encontrados no diagnóstico:
--   a) timeline tem um evento de status, mas ele diverge do status atual
--   b) timeline não tem nenhum evento de status pra aquele projeto (o INSERT
--      original falhou silenciosamente, ou o projeto é anterior à existência
--      da tabela project_timeline_events)

INSERT INTO project_timeline_events (
  project_id, tenant_id, type, content, old_status, new_status,
  visibility, metadata, created_at
)
SELECT
  p.id,
  p.tenant_id,
  'status',
  'Linha do tempo reconciliada com o status atual do projeto (' ||
    COALESCE(ps_new.name, p.status) || ').',
  lse.new_status,       -- último status conhecido pela timeline (pode ser nulo)
  p.status,             -- status atual e real do projeto
  'all',
  jsonb_build_object(
    'isSystemGenerated', true,
    'isStatusChange', true,
    'source', 'reconciliation_2026-08-04'
  ),
  now()
FROM projects p
LEFT JOIN LATERAL (
  SELECT new_status
  FROM project_timeline_events
  WHERE project_id = p.id AND type = 'status'
  ORDER BY created_at DESC
  LIMIT 1
) lse ON true
LEFT JOIN project_statuses ps_new
  ON ps_new.tenant_id = p.tenant_id AND ps_new.slug = p.status
WHERE
  -- só projetos que já mudaram de status ao menos uma vez
  p.status_changed_at IS NOT NULL
  -- e cuja timeline está desatualizada (evento mais recente diverge, ou não existe nenhum)
  AND (lse.new_status IS DISTINCT FROM p.status)
  -- proteção de idempotência: não reconcilia de novo se já existe evento
  -- apontando pro status atual
  AND NOT EXISTS (
    SELECT 1 FROM project_timeline_events e
    WHERE e.project_id = p.id AND e.type = 'status' AND e.new_status = p.status
  );
