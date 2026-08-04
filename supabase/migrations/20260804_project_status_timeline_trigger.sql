-- ═══════════════════════════════════════════════════════════════════════════
-- Garante que a "linha do tempo" (project_timeline_events) nunca mais fique
-- dessincronizada da "barra de progresso" (projects.status).
--
-- Causa raiz do problema: toda mudança de status hoje é feita em DUAS escritas
-- separadas — 1) UPDATE projects SET status = ...  2) INSERT em
-- project_timeline_events. A segunda escrita é feita pela aplicação dentro de
-- um try/catch que silencia falhas (rede instável, timeout de função
-- serverless, etc.). Se ela falhar, o status muda mas a timeline não é
-- atualizada, e as duas telas passam a mostrar informações diferentes.
--
-- Este trigger move a garantia para o banco: sempre que projects.status muda,
-- um evento correto é gravado NA MESMA transação da própria atualização —
-- ou as duas coisas acontecem juntas, ou nenhuma acontece (rollback). Isso
-- cobre tanto os dois caminhos de código já existentes (Kanban/PUT
-- change-status e editProjectAction) quanto qualquer caminho futuro que vier
-- a alterar o status, sem precisar lembrar de replicar a lógica em cada um.
--
-- Só faz sentido pra futuras mudanças de status — não corrige dados que já
-- estão divergentes hoje (isso é tratado por um script de reconciliação à
-- parte, que não reescreve histórico, só adiciona um evento atualizando a
-- timeline pra refletir o status atual).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_project_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_name TEXT;
  v_new_name TEXT;
BEGIN
  -- Blindagem: esta função NUNCA pode impedir a atualização do projeto.
  -- Qualquer erro inesperado aqui dentro é engolido e a atualização de
  -- status segue normalmente (mesmo comportamento de "não crítico" que a
  -- aplicação já usa hoje pra timeline — só que agora com uma garantia
  -- adicional no nível do banco, e não apenas na aplicação).
  BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      SELECT name INTO v_old_name FROM project_statuses
        WHERE tenant_id = NEW.tenant_id AND slug = OLD.status LIMIT 1;
      SELECT name INTO v_new_name FROM project_statuses
        WHERE tenant_id = NEW.tenant_id AND slug = NEW.status LIMIT 1;

      INSERT INTO project_timeline_events (
        project_id, tenant_id, type, content,
        old_status, new_status, visibility, metadata, created_at
      ) VALUES (
        NEW.id,
        NEW.tenant_id,
        'status',
        'Status alterado de ' || COALESCE(v_old_name, OLD.status, '(nenhum)') || ' para ' || COALESCE(v_new_name, NEW.status),
        OLD.status,
        NEW.status,
        'all',
        jsonb_build_object('isSystemGenerated', true, 'isStatusChange', true, 'source', 'db_trigger_fallback'),
        COALESCE(NEW.status_changed_at, now())
      )
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Nunca deixa um erro aqui quebrar a atualização do projeto.
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Evita duas linhas idênticas para a mesma transição de status no mesmo
-- instante — sem isso, o INSERT feito pela aplicação (quando bem-sucedido)
-- colidiria visualmente com o do trigger, duplicando a entrada na timeline.
--
-- Usa a coluna created_at diretamente (sem date_trunc/extract): tanto
-- date_trunc('second', timestamptz) quanto extract(epoch from timestamptz)
-- são marcadas STABLE no Postgres (dependem do fuso da sessão), não
-- IMMUTABLE — e o Postgres exige que expressões usadas em índice sejam
-- IMMUTABLE. Uma coluna "crua" não tem esse problema. O trigger e a rota
-- change-status/route.ts reaproveitam o mesmo valor de timestamp tanto em
-- status_changed_at quanto no created_at do evento, então batem exatamente.
--
-- O filtro "created_at >= data desta migração" é proposital: garante que a
-- criação deste índice nunca falhe por causa de duplicatas que já possam
-- existir no histórico antigo (dado anterior a esta migração fica de fora da
-- regra de unicidade — nada é apagado ou alterado). A partir de agora, toda
-- transição nova passa a ser protegida contra duplicidade.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pte_status_dedup
  ON project_timeline_events (project_id, old_status, new_status, created_at)
  WHERE type = 'status' AND created_at >= '2026-08-04 00:00:00+00'::timestamptz;

DROP TRIGGER IF EXISTS trg_log_project_status_change ON projects;
CREATE TRIGGER trg_log_project_status_change
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION log_project_status_change();
