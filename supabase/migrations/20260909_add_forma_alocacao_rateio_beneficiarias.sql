-- ═══════════════════════════════════════════════════════════════════════
-- Adiciona os campos necessários para o documento "Lista de Rateio"
-- (formulário de compensação de créditos entre unidades beneficiárias,
-- usado hoje pela Equatorial em projetos com modalidade "Autoconsumo
-- Remoto"). Alimenta o novo bloco de "Forma de alocação dos créditos" +
-- lista de beneficiárias dentro de "Conferir Informações do Projeto".
--
-- rateio_beneficiarias: array de objetos, um por beneficiária:
--   { conta_contrato: string, percentual?: number, ordem?: number }
-- percentual é usado quando forma_alocacao_creditos = 'Percentual do
-- Excedente'; ordem é usado quando forma_alocacao_creditos = 'Ordem de
-- Prioridade'.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE projects ADD COLUMN IF NOT EXISTS forma_alocacao_creditos TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rateio_beneficiarias JSONB DEFAULT '[]'::jsonb;
