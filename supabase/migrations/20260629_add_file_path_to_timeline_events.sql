-- Adiciona file_path à tabela project_timeline_events para armazenar o caminho
-- do arquivo no Supabase Storage — elimina dependência de lookup por URL no delete.
ALTER TABLE project_timeline_events
  ADD COLUMN IF NOT EXISTS file_path TEXT;

-- Backfill: preenche file_path para eventos existentes cruzando file_url
-- com o array JSONB projects.files. Só funciona onde a URL coincide
-- (uploads Supabase pós-migração). Eventos Firebase legacy ficam NULL.
UPDATE project_timeline_events pte
SET file_path = file_elem->>'path'
FROM projects p,
     jsonb_array_elements(
       CASE WHEN jsonb_typeof(p.files) = 'array' THEN p.files ELSE '[]'::jsonb END
     ) AS file_elem
WHERE pte.project_id = p.id
  AND pte.type = 'document'
  AND pte.file_path IS NULL
  AND pte.file_url IS NOT NULL
  AND file_elem->>'url' = pte.file_url;
