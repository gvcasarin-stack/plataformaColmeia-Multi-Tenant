'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from "@/lib/utils/productionLogger";
import { Shield } from 'lucide-react';

interface SessionInfo {
  id: string;
  login_time: string;
  last_activity: string;
  expires_at: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
}

export function SessionInfo() {
  const { user } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (!user?.id) return;

    const fetchSessionInfo = async () => {
      try {
        const response = await fetch(`/api/sessions/info?userId=${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          devLog.error('Erro ao buscar informações da sessão:', response.status);
          return;
        }

        const data = await response.json();
        setSessionInfo(data.sessionInfo);
      } catch (error) {
        devLog.error('Erro ao buscar sessão:', error);
      }
    };

    fetchSessionInfo();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchSessionInfo, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (!sessionInfo) return;

    const updateTimeRemaining = () => {
      const now = new Date();
      const expiresAt = new Date(sessionInfo.expires_at);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expirada');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [sessionInfo]);

  if (!sessionInfo) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'Navegador desconhecido';
    
    if (userAgent.includes('Chrome')) return 'Google Chrome';
    if (userAgent.includes('Firefox')) return 'Mozilla Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Microsoft Edge';
    
    return 'Navegador desconhecido';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-green-600" />
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Sessão Ativa
        </h3>
      </div>

      <div className="space-y-3 text-sm">
        {/* Tempo restante */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-orange-500"></div>
          <span className="text-gray-600 dark:text-gray-300">
            Expira em: 
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {timeRemaining}
          </span>
        </div>

        {/* Login */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500"></div>
          <span className="text-gray-600 dark:text-gray-300">
            Login: 
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDate(sessionInfo.login_time)}
          </span>
        </div>

        {/* Última atividade */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-blue-500"></div>
          <span className="text-gray-600 dark:text-gray-300">
            Última atividade: 
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDate(sessionInfo.last_activity)}
          </span>
        </div>

        {/* Navegador */}
        {sessionInfo.user_agent && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-purple-500"></div>
            <span className="text-gray-600 dark:text-gray-300">
              Navegador: 
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {getBrowserInfo(sessionInfo.user_agent)}
            </span>
          </div>
        )}

        {/* IP */}
        {sessionInfo.ip_address && (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span className="text-gray-600 dark:text-gray-300">
              IP: 
            </span>
            <span className="font-medium text-gray-900 dark:text-white font-mono text-xs">
              {sessionInfo.ip_address}
            </span>
          </div>
        )}
      </div>

      {/* Aviso de segurança */}
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <Shield className="h-3 w-3 inline mr-1" />
          Sua sessão expira automaticamente após 20 minutos de inatividade ou 8 horas de uso contínuo.
        </p>
      </div>
    </div>
  );
}
