-- Novos campos dos inversores: Entrada (MPPT) e Saída CA
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_entradas_por_mppt TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_quantidade_mppt TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_potencia_max_saida TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao_max_ca TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao_min_ca TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tipo_conexao_saida TEXT;
