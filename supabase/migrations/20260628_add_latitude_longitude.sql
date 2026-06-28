-- Coordenadas geográficas decimais — usadas pela CPFL no lugar das UTM
-- Convertidas para graus/minutos/segundos no template do Anexo F (itens 1.7 e 1.8)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS latitude TEXT,
  ADD COLUMN IF NOT EXISTS longitude TEXT;
