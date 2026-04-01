-- Novos campos dos inversores: Entrada (MPPT) e Saída CA
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_entradas_por_mppt TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_quantidade_mppt TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_potencia_max_saida TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao_max_ca TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tensao_min_ca TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_tipo_conexao_saida TEXT;

-- Tabela de levantamento de carga (armazenada como JSON serializado)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carga_levantamento TEXT;

-- Parâmetros elétricos dos módulos fotovoltaicos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_voc TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_isc TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_vpmp TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_ipmp TEXT;

-- Parâmetros CC dos inversores fotovoltaicos
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_vcc_max TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_icc_max TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_vpmp_max TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_vpmp_min TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_vcc_partida TEXT;
