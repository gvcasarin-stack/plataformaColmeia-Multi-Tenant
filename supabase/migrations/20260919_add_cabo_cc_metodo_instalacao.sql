-- Método de Instalação do cabo CC fotovoltaico (Dimensionamento dos Cabos CC),
-- campo novo em Conferir Informações do Projeto — não substitui nem altera
-- cabo_cc_fator_temperatura, que continua exatamente como estava.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cabo_cc_metodo_instalacao TEXT,
  ADD COLUMN IF NOT EXISTS cabo_cc_metodo_instalacao_arranjo TEXT;
