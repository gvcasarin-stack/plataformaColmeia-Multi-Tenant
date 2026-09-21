-- Responsável Legal pela Unidade Consumidora (pessoa física), usado somente
-- na assinatura da Procuração quando o CPF/CNPJ do cliente é um CNPJ —
-- diferente da empresa exibida no cabeçalho e diferente do responsável
-- técnico (projetista).
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS procuracao_responsavel_legal_nome TEXT,
  ADD COLUMN IF NOT EXISTS procuracao_responsavel_legal_cpf TEXT;
