-- Campo "Material do Poste do Padrão" (Energisa GD): Aço Galvanizado ou Concreto.
-- Usado na prancha de Detalhe do Padrão de Entrada para preencher dinamicamente o
-- texto do material do poste (trifásico e bifásico).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS material_poste_padrao TEXT;
