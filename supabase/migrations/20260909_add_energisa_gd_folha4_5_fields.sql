-- Campos novos usados nas Folhas 4 e 5 (Memorial Descritivo / Ajustes de Proteções) do
-- pacote de documentos "Geração Distribuída" da Energisa.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS numero_fases TEXT,
  ADD COLUMN IF NOT EXISTS cabos_por_fase TEXT,
  ADD COLUMN IF NOT EXISTS dps_ca_ka TEXT,
  ADD COLUMN IF NOT EXISTS dps_cc_ka TEXT,
  ADD COLUMN IF NOT EXISTS disjuntor_cc_corrente_a TEXT,
  ADD COLUMN IF NOT EXISTS potencia_trafo TEXT,
  ADD COLUMN IF NOT EXISTS numero_hastes TEXT,
  ADD COLUMN IF NOT EXISTS necessita_autotrafo TEXT,
  ADD COLUMN IF NOT EXISTS potencia_autotrafo TEXT,
  ADD COLUMN IF NOT EXISTS atendimento_trafo_exclusivo TEXT,
  ADD COLUMN IF NOT EXISTS potencia_trafo_exclusivo TEXT;
