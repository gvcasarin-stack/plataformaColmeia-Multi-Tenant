-- Adiciona colunas de cabeamento CA geral (Quadro CA → QGBT) para projetos com saídas agrupadas
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cabo_quadro_ca_secao_mm2             TEXT,
  ADD COLUMN IF NOT EXISTS cabo_quadro_ca_capacidade_corrente_a TEXT,
  ADD COLUMN IF NOT EXISTS cabo_quadro_ca_fator_temperatura      TEXT,
  ADD COLUMN IF NOT EXISTS cabo_quadro_ca_fator_agrupamento      TEXT;
