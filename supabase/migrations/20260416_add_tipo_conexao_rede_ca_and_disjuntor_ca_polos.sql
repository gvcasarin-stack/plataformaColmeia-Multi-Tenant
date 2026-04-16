-- Adiciona campos de tipo de conexão de rede CA e polos do disjuntor CA
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS tipo_conexao_rede_ca TEXT,
  ADD COLUMN IF NOT EXISTS disjuntor_ca_polos TEXT;
