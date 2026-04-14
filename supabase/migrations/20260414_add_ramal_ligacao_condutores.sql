-- Adiciona campos de seção dos condutores do Ramal de Ligação
-- Separados dos campos existentes do Ramal de Entrada (secao_fase_mm2, secao_neutro_mm2)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS secao_fase_rl_mm2 TEXT,
  ADD COLUMN IF NOT EXISTS secao_neutro_rl_mm2 TEXT;
