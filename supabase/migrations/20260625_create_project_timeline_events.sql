-- Tabela dedicada para eventos da linha do tempo de projetos
-- Substitui o array JSONB timeline_events na tabela projects
-- Benefícios: consultas eficientes, sem sobrescrita em updates parciais, histório preservado
CREATE TABLE IF NOT EXISTS project_timeline_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL,
  type        TEXT NOT NULL DEFAULT 'general',
  user_id     TEXT,
  user_name   TEXT,
  content     TEXT,
  file_name   TEXT,
  file_url    TEXT,
  file_id     TEXT,
  old_status  TEXT,
  new_status  TEXT,
  comment_id  TEXT,
  visibility  TEXT DEFAULT 'all',
  images      JSONB,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pte_project_id     ON project_timeline_events(project_id);
CREATE INDEX IF NOT EXISTS idx_pte_tenant_id      ON project_timeline_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pte_project_time   ON project_timeline_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pte_comment_id     ON project_timeline_events(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pte_file_url       ON project_timeline_events(file_url) WHERE file_url IS NOT NULL;

-- Backfill: migrar dados existentes do JSONB projects.timeline_events
-- ON CONFLICT DO NOTHING garante idempotência (pode ser re-executado com segurança)
INSERT INTO project_timeline_events (
  id, project_id, tenant_id, type, user_id, user_name, content,
  file_name, file_url, file_id, old_status, new_status, comment_id,
  visibility, images, metadata, created_at
)
SELECT
  CASE
    WHEN (event->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (event->>'id')::uuid
    ELSE gen_random_uuid()
  END AS id,
  p.id          AS project_id,
  p.tenant_id,
  COALESCE(event->>'type', 'general') AS type,
  event->>'userId'    AS user_id,
  event->>'user'      AS user_name,
  event->>'content'   AS content,
  event->>'fileName'  AS file_name,
  event->>'fileUrl'   AS file_url,
  event->>'fileId'    AS file_id,
  event->>'oldStatus' AS old_status,
  event->>'newStatus' AS new_status,
  event->>'commentId' AS comment_id,
  COALESCE(event->>'visibility', 'all') AS visibility,
  CASE
    WHEN event->'images' IS NOT NULL AND jsonb_typeof(event->'images') = 'array'
      THEN event->'images'
    ELSE NULL
  END AS images,
  jsonb_strip_nulls(jsonb_build_object(
    'isSystemGenerated', NULLIF((event->>'isSystemGenerated'), '')::boolean,
    'title',             event->>'title',
    'fullMessage',       event->>'fullMessage',
    'isStatusChange',    NULLIF((event->>'isStatusChange'), '')::boolean,
    'userType',          event->>'userType',
    'fullName',          event->>'fullName',
    'uploadedByName',    event->>'uploadedByName',
    'uploadedByRole',    event->>'uploadedByRole',
    'clientName',        event->>'clientName',
    'edited',            NULLIF((event->>'edited'), '')::boolean,
    'data',              event->'data'
  )) AS metadata,
  COALESCE(
    NULLIF((event->>'timestamp'), '')::timestamptz,
    p.created_at
  ) AS created_at
FROM projects p,
  LATERAL jsonb_array_elements(
    CASE
      WHEN p.timeline_events IS NOT NULL
        AND jsonb_typeof(p.timeline_events) = 'array'
      THEN p.timeline_events
      ELSE '[]'::jsonb
    END
  ) AS event
WHERE p.timeline_events IS NOT NULL
  AND jsonb_typeof(p.timeline_events) = 'array'
  AND jsonb_array_length(p.timeline_events) > 0
ON CONFLICT (id) DO NOTHING;
