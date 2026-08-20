-- ═══════════════════════════════════════════════════════════════════════════
-- Corrige duplicidade de eventos "status alterado" na timeline (voltou a
-- acontecer tanto ao editar o projeto na Vista Expandida quanto pelo Kanban).
--
-- Causa raiz: a trigger de SLA (20260805_sla_auto_calculation_trigger.sql)
-- sempre sobrescrevia projects.status_changed_at com um now() calculado no
-- banco, mesmo quando a aplicação já tinha enviado esse campo no UPDATE (com
-- o mesmo timestamp usado no INSERT manual do evento de timeline). Isso
-- quebrava a suposição da trigger de dedup (20260804_project_status_timeline_
-- trigger.sql, idx_pte_status_dedup): o valor que a trigger de log usa
-- (NEW.status_changed_at) deixava de bater com o created_at do INSERT manual
-- feito pela aplicação, então as duas gravações (a manual + a de fallback da
-- trigger) deixavam de ser reconhecidas como a mesma transição e ambas eram
-- inseridas — reabrindo o mesmo bug que a migração de 04/08 havia corrigido.
--
-- Correção: só preencher status_changed_at com now() quando a aplicação NÃO
-- enviou um valor próprio nesta escrita (INSERT, ou UPDATE onde a coluna não
-- mudou em relação ao registro anterior). Quando a aplicação já enviou um
-- valor (UPDATE onde NEW.status_changed_at difere de OLD.status_changed_at),
-- esse valor é respeitado — é o mesmo timestamp que ela usa para gravar o
-- evento na timeline, restaurando a garantia de deduplicação.
--
-- Com os dois timestamps voltando a bater exatamente, o INSERT manual feito
-- pela aplicação (change-status/route.ts e editProjectAction) passa a colidir
-- de propósito com o registro "Sistema" que a trigger de log já inseriu —
-- por isso esses dois pontos do código também foram ajustados (na mesma
-- entrega) para, ao detectar essa colisão esperada (23505), corrigir o
-- registro existente com os dados reais do usuário, em vez de tentar inserir
-- um segundo registro.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_project_sla_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_sla_days INTEGER;
  v_exclude_weekends BOOLEAN;
  v_status_changed_at TIMESTAMPTZ;
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

    -- Respeita o status_changed_at que a aplicação já tenha enviado neste
    -- UPDATE (mesmo timestamp usado no INSERT manual do evento de timeline).
    -- Só cai para now() em INSERT ou quando a aplicação não enviou o campo.
    IF TG_OP = 'UPDATE' AND NEW.status_changed_at IS DISTINCT FROM OLD.status_changed_at THEN
      v_status_changed_at := NEW.status_changed_at;
    ELSE
      v_status_changed_at := now();
    END IF;

    SELECT sla_days, sla_exclude_weekends
      INTO v_sla_days, v_exclude_weekends
      FROM project_statuses
      WHERE tenant_id = NEW.tenant_id AND slug = NEW.status
      LIMIT 1;

    NEW.status_changed_at := v_status_changed_at;
    NEW.sla_expired := false;

    IF v_sla_days IS NOT NULL AND v_sla_days > 0 THEN
      NEW.sla_expires_at := calculate_sla_expiration(v_status_changed_at, v_sla_days, COALESCE(v_exclude_weekends, true));
    ELSE
      NEW.sla_expires_at := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;
