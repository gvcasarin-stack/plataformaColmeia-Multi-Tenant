"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth';
import { getPendingClientRequests } from '@/lib/services/clientRequestService.supabase';

type ClientRequestContextType = {
  pendingCount: number;
  isLoading: boolean;
  refreshPendingCount: () => Promise<void>;
  // Atualização imediata otimística
  updateCounterOptimistic: (change: number) => void;
};

const ClientRequestContext = createContext<ClientRequestContextType | undefined>(undefined);

export const ClientRequestProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    if (!user?.id) {
      devLog.log('[ClientRequestContext] Usuário não disponível, resetando contagem');
      setPendingCount(0);
      return;
    }

    // Verificar se é admin - incluir tanto user.role quanto user.profile.role
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || 
                    user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
    
    // Logs removidos por questões de segurança em produção
    
    if (!isAdmin) {
      devLog.log('[ClientRequestContext] Usuário não é admin, resetando contagem');
      setPendingCount(0);
      return;
    }

    try {
      devLog.log('[ClientRequestContext] Atualizando contagem de solicitações pendentes');
      setIsLoading(true);
      
      const requests = await getPendingClientRequests();
      const count = requests.length;
      // Logs removidos por questões de segurança em produção
      
      devLog.log(`[ClientRequestContext] ${count} solicitações pendentes encontradas`);
      setPendingCount(count);
    } catch (error) {
      devLog.error('[ClientRequestContext] Erro ao buscar solicitações:', error);
      setPendingCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.id) {
      const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || 
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
      if (isAdmin) {
        devLog.log('[ClientRequestContext] Admin detectado, carregando solicitações');
        refreshPendingCount();
      } else {
        devLog.log('[ClientRequestContext] Usuário não é admin, resetando contagem');
        setPendingCount(0);
        setIsLoading(false);
      }
    } else {
      devLog.log('[ClientRequestContext] Usuário não disponível, resetando contagem');
      setPendingCount(0);
      setIsLoading(false);
    }
  }, [user?.id, user?.role, user?.profile?.role, refreshPendingCount]);

  // Atualização imediata otimística
  const updateCounterOptimistic = useCallback((change: number) => {
    setPendingCount(prev => {
      const newCount = Math.max(0, prev + change);
      devLog.log(`[ClientRequestContext] Contador atualizado otimisticamente: ${prev} → ${newCount}`);
      return newCount;
    });
  }, []);

  // Memorizar o valor do contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo(() => ({
    pendingCount,
    isLoading,
    refreshPendingCount,
    updateCounterOptimistic
  }), [pendingCount, isLoading, refreshPendingCount, updateCounterOptimistic]);

  // Logs removidos por questões de segurança em produção

  return (
    <ClientRequestContext.Provider value={contextValue}>
      {children}
    </ClientRequestContext.Provider>
  );
};

export const useClientRequests = () => {
  const context = useContext(ClientRequestContext);
  if (context === undefined) {
    throw new Error('useClientRequests must be used within a ClientRequestProvider');
  }
  return context;
}; 