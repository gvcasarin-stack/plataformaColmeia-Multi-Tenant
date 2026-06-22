ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS disjuntor_quadro_ca_corrente_a TEXT,
  ADD COLUMN IF NOT EXISTS disjuntor_quadro_ca_polos TEXT;
