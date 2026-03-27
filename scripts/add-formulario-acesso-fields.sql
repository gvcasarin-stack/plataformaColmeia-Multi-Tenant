-- Migração: Novos campos para Formulário de Solicitação de Acesso (ANEXO I - Equatorial)
-- Execute este script no Supabase SQL Editor antes de usar os novos campos

ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_cep TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_celular TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_telefone_fixo TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsavel_legal_nome TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsavel_legal_telefone TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsavel_legal_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tipo_solicitacao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tarifa_branca TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS possui_cargas_especiais TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS carga_declarada_kw TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS potencia_disponibilizada_kw TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS data_inicio_operacao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS modulos_area_m2 TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_faixa_tensao TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_corrente_nominal TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_fator_potencia TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_rendimento TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inversores_dht_corrente TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsavel_email TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS responsavel_uf TEXT;
