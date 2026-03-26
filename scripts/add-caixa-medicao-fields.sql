-- Adicionar campos de caixa de medição ao projeto (referência ao acervo técnico)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_id UUID;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_imagem_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_nome TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_comprimento_mm TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_altura_mm TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS caixa_medicao_largura_mm TEXT;
