-- Seção transversal dos cabos (item 2.4 do Anexo F CPFL) — preenchido automaticamente pela Categoria do Padrão de Entrada
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cabos_secao TEXT;
