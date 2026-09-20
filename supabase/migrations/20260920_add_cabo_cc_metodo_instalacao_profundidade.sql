-- Profundidade de instalação do cabo CC quando Método de Instalação = C2
-- (cabo diretamente enterrado), em Conferir Informações do Projeto.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS cabo_cc_metodo_instalacao_profundidade TEXT;
