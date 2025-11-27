-- Ver TODAS as colunas da tabela projects
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;
