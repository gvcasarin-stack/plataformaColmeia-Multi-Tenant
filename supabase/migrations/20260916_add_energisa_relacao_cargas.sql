-- Relação de Carga e Cálculo de Demanda (Folha 2 do Formulário de Solicitação de Acesso — Energisa)
-- Lista de itens preenchida em "Conferir Informações do Projeto" > grupo "Energisa GD",
-- mesmo formato JSONB já usado por modulos_lista/inversores_lista.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS energisa_relacao_cargas JSONB;
