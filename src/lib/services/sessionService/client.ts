import { devLog } from "@/lib/utils/productionLogger";

// ✅ CLIENTE - Serviço de sessões para o frontend
// Usa as rotas de API para comunicar com o backend

/**
 * Cria uma nova sessão via API
 */
export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; sessionId?: string }> {
  try {
    devLog.log('[SessionClient] Criando nova sessão para usuário:', userId);
    
    const response = await fetch('/api/sessions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        userId, 
        ipAddress: ipAddress || 'unknown',
        userAgent: userAgent || navigator.userAgent || 'unknown'
      }),
    });

    if (!response.ok) {
      devLog.error('[SessionClient] Erro na resposta da API:', response.status);
      return { success: false };
    }

    const data = await response.json();
    devLog.log('[SessionClient] Sessão criada:', data.sessionId);
    
    return { success: data.success, sessionId: data.sessionId };
  } catch (error) {
    devLog.error('[SessionClient] Erro ao criar sessão:', error);
    return { success: false };
  }
}

/**
 * Atualiza a atividade da sessão via API
 */
export async function updateSessionActivity(userId: string): Promise<boolean> {
  try {
    devLog.log('[SessionClient] Atualizando atividade da sessão');
    
    const response = await fetch('/api/sessions/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      devLog.error('[SessionClient] Erro na resposta da API:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    devLog.error('[SessionClient] Erro ao atualizar sessão:', error);
    return false;
  }
}

/**
 * Finaliza a sessão via API
 */
export async function endSession(userId: string): Promise<boolean> {
  try {
    devLog.log('[SessionClient] Finalizando sessão');
    
    const response = await fetch('/api/sessions/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      devLog.error('[SessionClient] Erro na resposta da API:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success || false;
  } catch (error) {
    devLog.error('[SessionClient] Erro ao finalizar sessão:', error);
    return false;
  }
}
