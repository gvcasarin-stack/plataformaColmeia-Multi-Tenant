-- Rastrear quem criou cada equipamento no acervo global
ALTER TABLE acervo_equipamentos
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
