-- Adiciona campo do Disjuntor CA de Proteção (corrente calculada: Inom_CA * 1.25, arredondada para baixo)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS disjuntor_ca_corrente_a TEXT;
