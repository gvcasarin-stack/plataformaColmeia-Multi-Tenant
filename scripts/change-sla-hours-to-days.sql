-- Migração: Mudança de SLA de horas para dias
-- Este script converte o campo sla_hours (24h) para sla_days (1 dia)
-- IMPORTANTE: Execute este script apenas UMA vez
-- A coluna antiga sla_hours será mantida por segurança (pode ser removida depois)

-- 1. Adicionar nova coluna sla_days
ALTER TABLE project_statuses
ADD COLUMN IF NOT EXISTS sla_days INTEGER DEFAULT NULL;

-- 2. Migrar dados existentes (converter 24 horas = 1 dia)
UPDATE project_statuses
SET sla_days = CEIL(sla_hours::NUMERIC / 24)
WHERE sla_hours IS NOT NULL;

-- 3. Verificar resultado da migração
SELECT
  id,
  name,
  slug,
  sla_hours as "Horas (antigo)",
  sla_days as "Dias (novo)",
  sla_exclude_weekends as "Ignora fins de semana"
FROM project_statuses
ORDER BY order_index;

-- NOTAS:
-- ✅ A coluna sla_hours será mantida por segurança
-- ✅ O código usará apenas sla_days a partir de agora
-- ✅ Se precisar reverter, basta voltar o código para usar sla_hours
-- ⚠️  Para remover sla_hours definitivamente (OPCIONAL, só depois de testar):
--    ALTER TABLE project_statuses DROP COLUMN sla_hours;
