-- Adiciona coluna para seleção do tipo de caixa de medição / poste padrão da CPFL
-- Utilizado no formulário Conferir Informações quando distribuidora = CPFL
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cpfl_tipo_poste_padrao TEXT;
