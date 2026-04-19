-- Configuração de strings dos módulos fotovoltaicos
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS modulos_total_strings TEXT,
  ADD COLUMN IF NOT EXISTS modulos_microinversor TEXT,
  ADD COLUMN IF NOT EXISTS modulos_strings_modulos TEXT;
