-- 🔧 CORREÇÃO: Separar verificação de cooldown da atualização
-- Resolve o problema de race condition onde o timestamp é atualizado ANTES do envio

-- ✅ NOVA FUNÇÃO: Apenas verifica cooldown (não atualiza)
CREATE OR REPLACE FUNCTION check_email_cooldown(
  p_user_id UUID,
  p_project_id UUID, 
  p_current_time TIMESTAMP WITH TIME ZONE,
  p_cooldown_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(can_send BOOLEAN, last_sent_at TIMESTAMP WITH TIME ZONE, minutes_remaining DECIMAL)
LANGUAGE plpgsql
AS $$
DECLARE
  existing_record RECORD;
  cooldown_threshold TIMESTAMP WITH TIME ZONE;
  time_diff_minutes DECIMAL;
BEGIN
  -- Calcular o limite do cooldown
  cooldown_threshold := p_current_time - (p_cooldown_minutes || ' minutes')::INTERVAL;
  
  -- Tentar buscar registro existente
  SELECT ec.last_email_sent_at, ec.created_at
  INTO existing_record
  FROM email_cooldowns ec
  WHERE ec.user_id = p_user_id 
    AND ec.project_id = p_project_id;
  
  -- Se não existe registro, pode enviar
  IF NOT FOUND THEN
    RETURN QUERY SELECT true::BOOLEAN, NULL::TIMESTAMP WITH TIME ZONE, 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Calcular diferença em minutos
  time_diff_minutes := EXTRACT(EPOCH FROM (p_current_time - existing_record.last_email_sent_at)) / 60.0;
  
  -- Se passou do cooldown, pode enviar
  IF existing_record.last_email_sent_at <= cooldown_threshold THEN
    RETURN QUERY SELECT true::BOOLEAN, existing_record.last_email_sent_at, 0::DECIMAL;
    RETURN;
  END IF;
  
  -- Está em cooldown, calcular tempo restante
  RETURN QUERY SELECT 
    false::BOOLEAN, 
    existing_record.last_email_sent_at,
    (p_cooldown_minutes - time_diff_minutes)::DECIMAL;
  RETURN;
END;
$$;

-- ✅ NOVA FUNÇÃO: Atualiza cooldown APENAS após envio bem-sucedido
CREATE OR REPLACE FUNCTION update_email_cooldown_after_send(
  p_user_id UUID,
  p_project_id UUID, 
  p_current_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Inserir ou atualizar registro
  INSERT INTO email_cooldowns (user_id, project_id, last_email_sent_at, created_at, updated_at)
  VALUES (p_user_id, p_project_id, p_current_time, p_current_time, p_current_time)
  ON CONFLICT (user_id, project_id) 
  DO UPDATE SET 
    last_email_sent_at = p_current_time,
    updated_at = p_current_time;
    
  RETURN true;
END;
$$;

-- 🔄 MANTER FUNÇÃO ORIGINAL para compatibilidade (mas marcar como deprecated)
COMMENT ON FUNCTION try_claim_email_slot IS '⚠️ DEPRECATED: Usar check_email_cooldown + update_email_cooldown_after_send';
COMMENT ON FUNCTION check_email_cooldown IS '✅ NOVA: Apenas verifica cooldown sem atualizar timestamp';
COMMENT ON FUNCTION update_email_cooldown_after_send IS '✅ NOVA: Atualiza timestamp APENAS após envio confirmado';
