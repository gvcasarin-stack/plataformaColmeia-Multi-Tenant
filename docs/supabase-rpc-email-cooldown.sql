-- ✅ FUNÇÃO RPC PARA CORREÇÃO DE RACE CONDITION
-- Esta função resolve o problema de múltiplos emails simultâneos
-- Executa operação atômica: só permite 1 email por usuário+projeto a cada 5 minutos

CREATE OR REPLACE FUNCTION try_claim_email_slot(
  p_user_id UUID,
  p_project_id UUID, 
  p_current_time TIMESTAMP WITH TIME ZONE,
  p_cooldown_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(can_send BOOLEAN, last_sent_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_record RECORD;
  cooldown_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calcular o limite do cooldown
  cooldown_threshold := p_current_time - (p_cooldown_minutes || ' minutes')::INTERVAL;
  
  -- Tentar buscar registro existente
  SELECT ec.last_email_sent_at, ec.created_at
  INTO existing_record
  FROM email_cooldowns ec
  WHERE ec.user_id = p_user_id 
    AND ec.project_id = p_project_id;
  
  -- Se não existe registro, criar e permitir envio
  IF NOT FOUND THEN
    INSERT INTO email_cooldowns (user_id, project_id, last_email_sent_at, created_at, updated_at)
    VALUES (p_user_id, p_project_id, p_current_time, p_current_time, p_current_time);
    
    RETURN QUERY SELECT true::BOOLEAN, p_current_time;
    RETURN;
  END IF;
  
  -- Se existe mas já passou do cooldown, atualizar e permitir envio
  IF existing_record.last_email_sent_at <= cooldown_threshold THEN
    UPDATE email_cooldowns 
    SET last_email_sent_at = p_current_time,
        updated_at = p_current_time
    WHERE user_id = p_user_id 
      AND project_id = p_project_id;
    
    RETURN QUERY SELECT true::BOOLEAN, p_current_time;
    RETURN;
  END IF;
  
  -- Está em cooldown, não permitir envio
  RETURN QUERY SELECT false::BOOLEAN, existing_record.last_email_sent_at;
  RETURN;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION try_claim_email_slot IS 'Função atômica para evitar race condition em emails. Só permite 1 email por usuário+projeto dentro do período de cooldown.';