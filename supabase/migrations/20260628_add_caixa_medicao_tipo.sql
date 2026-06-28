-- Campo para item 2.5 do Anexo F CPFL — preenchido automaticamente via cpfl_tipo_poste_padrao
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS caixa_medicao_tipo TEXT;
