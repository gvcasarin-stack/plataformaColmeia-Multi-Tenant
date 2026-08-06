-- ═══════════════════════════════════════════════════════════════════════════
-- Garante que TODO projeto — desde a criação, e a cada mudança de status —
-- tenha status_changed_at/sla_expires_at/sla_expired calculados corretamente,
-- sem depender de cada caminho de código da aplicação lembrar de fazer isso.
--
-- Causas raiz corrigidas (investigação de cartões do Kanban sem contador de
-- prazo, mesmo estando na mesma coluna que outros cartões com contador):
--
-- 1) createProjectClientAction (criação de projeto, admin ou cliente) nunca
--    grava status_changed_at/sla_expires_at/sla_expired no INSERT — o
--    projeto só ganhava esses campos na PRIMEIRA mudança de status manual.
--
-- 2) editProjectAction só grava os campos de SLA quando o chamador manda
--    explicitamente — funciona hoje porque o único chamador calcula certo,
--    mas é um contrato frágil: qualquer novo caminho de escrita que mude
--    `status` sem calcular o SLA deixaria o cartão sem contador.
--
-- Este trigger resolve as duas causas de uma vez, movendo a garantia para o
-- banco (mesmo padrão já usado no trigger de sincronização da timeline, ver
-- 20260804_project_status_timeline_trigger.sql): sempre que um projeto é
-- criado, ou tem seu `status` alterado, o próprio banco recalcula os campos
-- de SLA a partir da configuração do novo status — os caminhos de código já
-- existentes que também calculam isso continuam funcionando normalmente
-- (redundante, porém inofensivo).
--
-- A fórmula de "horas úteis" abaixo (add_business_hours) replica EXATAMENTE
-- addHours() de src/lib/utils/sla-calculator.ts, hora a hora — uma
-- simplificação por DIAS úteis foi cogitada e testada (605 casos), mas
-- divergiu em 170 deles sempre que o horário de início cai num fim de
-- semana, então foi descartada. O dia da semana é determinado em UTC
-- (`AT TIME ZONE 'UTC'`) porque é isso que o runtime Node em produção
-- (Vercel, sem TZ configurada) usa em `Date.getDay()` — replicar fielmente
-- esse comportamento evita que o cálculo do banco divirja do cálculo já
-- feito pela aplicação.
-- ═══════════════════════════════════════════════════════════════════════════

-- DROP + CREATE (em vez de apenas CREATE OR REPLACE): a função
-- calculate_sla_expiration já existia no banco, criada por scripts antigos
-- de backfill (ex.: populate-sla-existing-projects-solar-tech.sql) que
-- deveriam ter se autodestruído no final mas, nesse tenant, deixaram a
-- função para trás com nomes de parâmetro diferentes dos usados aqui — e
-- Postgres não permite CREATE OR REPLACE mudar nome de parâmetro.
DROP FUNCTION IF EXISTS add_business_hours(TIMESTAMPTZ, NUMERIC, BOOLEAN);
DROP FUNCTION IF EXISTS calculate_sla_expiration(TIMESTAMPTZ, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION add_business_hours(
  p_start TIMESTAMPTZ,
  p_hours NUMERIC,
  p_exclude_weekends BOOLEAN
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_result TIMESTAMPTZ := p_start;
  v_remaining NUMERIC := p_hours;
  v_dow INTEGER;
  v_safety INTEGER := 0;
BEGIN
  IF NOT p_exclude_weekends THEN
    RETURN p_start + (p_hours || ' hours')::INTERVAL;
  END IF;

  WHILE v_remaining > 0 LOOP
    v_result := v_result + INTERVAL '1 hour';
    v_dow := EXTRACT(DOW FROM (v_result AT TIME ZONE 'UTC'));

    IF v_dow <> 0 AND v_dow <> 6 THEN
      v_remaining := v_remaining - 1;
    END IF;

    -- Blindagem contra loop indevido em caso de dado corrompido/absurdo
    -- (ex.: sla_days negativo por engano) — nunca deve ser atingido em uso
    -- normal (sla_days é um inteiro pequeno configurado manualmente).
    v_safety := v_safety + 1;
    IF v_safety > 200000 THEN
      RAISE EXCEPTION 'add_business_hours: limite de segurança excedido (p_hours=%)', p_hours;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_sla_expiration(
  p_status_changed_at TIMESTAMPTZ,
  p_sla_days INTEGER,
  p_exclude_weekends BOOLEAN
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
AS $$
  SELECT add_business_hours(p_status_changed_at, p_sla_days * 24, p_exclude_weekends);
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- Trigger 1: calcula o SLA na criação do projeto e em toda mudança de status
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_project_sla_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sla_days INTEGER;
  v_exclude_weekends BOOLEAN;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Blindagem: esta função NUNCA pode impedir a criação/atualização do
  -- projeto. Qualquer erro inesperado aqui dentro é engolido, e o projeto
  -- segue sendo salvo com os campos de SLA que a própria aplicação já
  -- tiver enviado (ou nulos, no caso de um INSERT que não os envie).
  BEGIN
    -- Em UPDATE, o trigger é declarado "OF status" (dispara sempre que a
    -- coluna aparece no SET, mesmo com o mesmo valor) — esta checagem evita
    -- resetar o prazo à toa quando o status na verdade não mudou.
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;

    SELECT sla_days, sla_exclude_weekends
      INTO v_sla_days, v_exclude_weekends
      FROM project_statuses
      WHERE tenant_id = NEW.tenant_id AND slug = NEW.status
      LIMIT 1;

    NEW.status_changed_at := v_now;
    NEW.sla_expired := false;

    IF v_sla_days IS NOT NULL AND v_sla_days > 0 THEN
      NEW.sla_expires_at := calculate_sla_expiration(v_now, v_sla_days, COALESCE(v_exclude_weekends, true));
    ELSE
      NEW.sla_expires_at := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_project_sla ON projects;
CREATE TRIGGER trg_set_project_sla
  BEFORE INSERT OR UPDATE OF status ON projects
  FOR EACH ROW
  EXECUTE FUNCTION set_project_sla_on_status_change();

-- ───────────────────────────────────────────────────────────────────────────
-- Trigger 2: torna retroativa a mudança de prazo/regra de uma coluna do
-- Kanban (Preferências → SLA da coluna). Sem isso, alterar sla_days ou
-- sla_exclude_weekends de um status só valia para projetos que ainda fossem
-- MUDAR de status dali pra frente — os que já estavam parados naquela
-- coluna continuavam com o prazo antigo (ou sem prazo nenhum) para sempre.
--
-- O `status_changed_at` de cada projeto não é alterado (o status em si não
-- mudou) — apenas o `sla_expires_at`, recalculado com a nova regra a partir
-- da mesma data-âncora que já existia.
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalc_sla_on_status_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    IF NEW.sla_days IS NOT DISTINCT FROM OLD.sla_days
       AND NEW.sla_exclude_weekends IS NOT DISTINCT FROM OLD.sla_exclude_weekends THEN
      RETURN NEW;
    END IF;

    IF NEW.sla_days IS NOT NULL AND NEW.sla_days > 0 THEN
      UPDATE projects
      SET sla_expires_at = calculate_sla_expiration(status_changed_at, NEW.sla_days, COALESCE(NEW.sla_exclude_weekends, true)),
          sla_expired = false
      WHERE tenant_id = NEW.tenant_id
        AND status = NEW.slug
        AND status_changed_at IS NOT NULL;
    ELSE
      UPDATE projects
      SET sla_expires_at = NULL,
          sla_expired = false
      WHERE tenant_id = NEW.tenant_id
        AND status = NEW.slug;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_sla_on_status_config_change ON project_statuses;
CREATE TRIGGER trg_recalc_sla_on_status_config_change
  AFTER UPDATE OF sla_days, sla_exclude_weekends ON project_statuses
  FOR EACH ROW
  EXECUTE FUNCTION recalc_sla_on_status_config_change();
