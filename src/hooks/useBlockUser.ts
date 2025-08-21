import { useState, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { Client } from './useClients';
import { AuditService } from '@/lib/services/auditService';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';

interface UseBlockUserProps {
  // Não precisamos mais dessas funções já que vamos fazer refresh da página
}

interface UseBlockUserReturn {
  isLoading: boolean;
  blockUser: (client: Client, reason: string) => Promise<void>;
  unblockUser: (client: Client) => Promise<void>;
}

export function useBlockUser(): UseBlockUserReturn {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const blockUser = useCallback(async (client: Client, reason: string) => {
    if (!user?.id || !user?.email) {
      throw new Error('Usuário não autenticado');
    }

    setIsLoading(true);
    
    // 1. Feedback visual imediato
    toast({
      title: "Bloqueando usuário...",
      description: `Processando bloqueio de ${client.name}`,
    });

    try {
      // 2. Chamada para API
      const response = await fetch('/api/admin/block-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: client.id,
          reason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao bloquear usuário');
      }

      // 3. Feedback de sucesso
      toast({
        title: "✅ Usuário bloqueado",
        description: `${client.name} foi bloqueado com sucesso. Atualizando página...`,
        variant: "default",
      });

      // 4. Log de auditoria
      await AuditService.logUserBlock(
        client.id,
        client.name,
        reason,
        { id: user.id, email: user.email }
      );

      // 5. Refresh da página para garantir estado correto
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay para mostrar o toast

    } catch (error: any) {
      // 6. Feedback de erro
      toast({
        title: "❌ Erro ao bloquear usuário",
        description: error.message || 'Não foi possível bloquear o usuário. Tente novamente.',
        variant: "destructive",
      });

      // 7. Log de erro
      devLog.error('[AUDIT] Block user failed:', {
        clientId: client.id,
        clientName: client.name,
        error: error.message,
        timestamp: new Date().toISOString(),
        adminUser: user.email,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const unblockUser = useCallback(async (client: Client) => {
    if (!user?.id || !user?.email) {
      throw new Error('Usuário não autenticado');
    }

    setIsLoading(true);
    
    // 1. Feedback visual imediato
    toast({
      title: "Desbloqueando usuário...",
      description: `Processando desbloqueio de ${client.name}`,
    });

    try {
      // 2. Chamada para API
      const response = await fetch('/api/admin/unblock-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: client.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao desbloquear usuário');
      }

      // 3. Feedback de sucesso
      toast({
        title: "✅ Usuário desbloqueado",
        description: `${client.name} foi desbloqueado com sucesso. Atualizando página...`,
        variant: "default",
      });

      // 4. Log de auditoria
      await AuditService.logUserUnblock(
        client.id,
        client.name,
        { id: user.id, email: user.email }
      );

      // 5. Refresh da página para garantir estado correto
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Delay para mostrar o toast

    } catch (error: any) {
      // 6. Feedback de erro
      toast({
        title: "❌ Erro ao desbloquear usuário",
        description: error.message || 'Não foi possível desbloquear o usuário. Tente novamente.',
        variant: "destructive",
      });

      // 7. Log de erro
      devLog.error('[AUDIT] Unblock user failed:', {
        clientId: client.id,
        clientName: client.name,
        error: error.message,
        timestamp: new Date().toISOString(),
        adminUser: user.email,
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isLoading,
    blockUser,
    unblockUser,
  };
}
