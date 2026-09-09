-- Campos novos usados na Folha 1 (Formulário de Orçamento de Conexão) do pacote
-- de documentos "Geração Distribuída" da Energisa. O endereço hoje é um único
-- campo livre (endereco_local); esses dois campos guardam número e bairro
-- separadamente, como o formulário da Energisa exige.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS numero_endereco_cliente TEXT,
  ADD COLUMN IF NOT EXISTS bairro_cliente TEXT;
