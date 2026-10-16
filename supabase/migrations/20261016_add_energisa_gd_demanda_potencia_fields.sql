-- Campos novos do formulário "Geração Distribuída" da Energisa (Folha 1):
-- antes, "Demanda Contratada (kW)" e "Demanda Contratada (kWg)" reaproveitavam
-- por engano o campo carga_declarada_kw (usado por outros documentos, como o
-- Anexo F da CPFL e o Diagrama Unifilar). Agora têm campos próprios, editáveis
-- e preenchidos por padrão com 0. "Potência Instalada (kW)" também vira campo
-- próprio (antes era só calculado na hora, a partir da soma dos inversores).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS potencia_instalada_kw TEXT,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kw TEXT,
  ADD COLUMN IF NOT EXISTS demanda_contratada_kwg TEXT;
