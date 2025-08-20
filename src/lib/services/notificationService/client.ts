import { devLog } from "@/lib/utils/productionLogger";

// ✅ CLIENTE - Serviço de notificações para o frontend
// Usa as rotas de API para comunicar com o backend

/**
 * Busca a contagem de notificações não lidas via API
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    devLog.log('[NotificationClient] Buscando contagem de notificações não lidas');
    
    const response = await fetch(`/api/notifications/count?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      devLog.error('[NotificationClient] Erro na resposta da API:', response.status);
      return 0;
    }

    const data = await response.json();
    devLog.log('[NotificationClient] Contagem recebida:', data.count);
    
    return data.count || 0;
  } catch (error) {
    devLog.error('[NotificationClient] Erro ao buscar contagem:', error);
    return 0;
  }
}

/**
 * Marca uma notificação como lida via API
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    devLog.log('[NotificationClient] Marcando notificação como lida:', notificationId);
    
    const response = await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationId }),
    });

    if (!response.ok) {
      devLog.error('[NotificationClient] Erro na resposta da API:', response.status);
      return false;
    }

    const data = await response.json();
    devLog.log('[NotificationClient] Resultado:', data.success);
    
    return data.success || false;
  } catch (error) {
    devLog.error('[NotificationClient] Erro ao marcar como lida:', error);
    return false;
  }
}

/**
 * Marca todas as notificações como lidas via API
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    devLog.log('[NotificationClient] Marcando todas as notificações como lidas');
    
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      devLog.error('[NotificationClient] Erro na resposta da API:', response.status);
      return false;
    }

    const data = await response.json();
    devLog.log('[NotificationClient] Resultado:', data.success);
    
    return data.success || false;
  } catch (error) {
    devLog.error('[NotificationClient] Erro ao marcar todas como lidas:', error);
    return false;
  }
} 