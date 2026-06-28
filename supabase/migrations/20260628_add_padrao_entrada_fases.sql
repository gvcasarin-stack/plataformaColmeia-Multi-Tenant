-- Categoria do Padrão de Entrada CPFL (item 2.1 do Anexo F — ex: A1, B1, C3)
-- Número de fases derivado automaticamente da categoria (MONOFÁSICO/BIFÁSICO/TRIFÁSICO)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS padrao_entrada TEXT,
  ADD COLUMN IF NOT EXISTS fases_instalacao TEXT;
