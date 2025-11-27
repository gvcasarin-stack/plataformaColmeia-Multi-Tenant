-- Migration: Adicionar campos CPF/CNPJ e Endereço aos projetos
-- Data: 2025-10-15
-- Descrição: Adiciona campos opcionais para CPF/CNPJ do cliente final e endereço do local

-- Adicionar coluna para CPF/CNPJ do cliente final
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS cpf_cnpj_cliente_final VARCHAR(20);

-- Adicionar coluna para endereço do local (TEXT para endereços longos)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS endereco_local TEXT;

-- Comentários nas colunas
COMMENT ON COLUMN projects.cpf_cnpj_cliente_final IS 'CPF ou CNPJ do cliente final (opcional)';
COMMENT ON COLUMN projects.endereco_local IS 'Endereço completo do local de instalação (opcional)';
