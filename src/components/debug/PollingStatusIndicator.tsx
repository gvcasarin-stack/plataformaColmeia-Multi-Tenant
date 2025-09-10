'use client';

import { useState } from 'react';
import { useNotifications } from '@/lib/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PollingStatusIndicatorProps {
  showDebugPanel?: boolean;
}

/**
 * Componente de debug para mostrar status do polling inteligente
 * Use apenas em desenvolvimento ou para debug
 */
export function PollingStatusIndicator({ showDebugPanel = false }: PollingStatusIndicatorProps) {
  const { debugStatus, isPollingActive, forceRefresh } = useNotifications();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!showDebugPanel) {
    return null;
  }

  const getStatusColor = () => {
    if (!isPollingActive) return 'bg-red-500';
    if (debugStatus?.isUserActive) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (!isPollingActive) return 'Offline';
    if (debugStatus?.isUserActive) return 'Ativo';
    return 'Inativo';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Indicador compacto */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={`${getStatusColor()} text-white cursor-pointer`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          🔔 {getStatusText()} ({debugStatus?.nextUpdateIn}s)
        </Badge>
        
        <Button
          size="sm"
          variant="outline"
          onClick={forceRefresh}
          className="text-xs"
        >
          🔄
        </Button>
      </div>

      {/* Painel detalhado */}
      {isExpanded && (
        <Card className="mt-2 w-80 bg-white/95 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              Status do Polling Inteligente
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>Status:</strong> {getStatusText()}
              </div>
              <div>
                <strong>Não lidas:</strong> {debugStatus?.unreadCount || 0}
              </div>
              <div>
                <strong>Intervalo:</strong> {Math.round((debugStatus?.currentInterval || 0) / 1000)}s
              </div>
              <div>
                <strong>Próxima:</strong> {debugStatus?.nextUpdateIn}s
              </div>
              <div>
                <strong>Usuário:</strong> {debugStatus?.isUserActive ? '🟢 Ativo' : '🟡 Inativo'}
              </div>
              <div>
                <strong>Página:</strong> {debugStatus?.isPageVisible ? '👀 Visível' : '🙈 Oculta'}
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div><strong>Última atualização:</strong> {debugStatus?.lastUpdate}</div>
              <div><strong>User ID:</strong> {debugStatus?.userId?.slice(0, 8)}...</div>
            </div>

            {debugStatus?.error && (
              <div className="pt-2 border-t text-red-600">
                <strong>Erro:</strong> {debugStatus.error}
              </div>
            )}

            <div className="pt-2 flex gap-1">
              <Button size="sm" onClick={forceRefresh} className="text-xs">
                Forçar Refresh
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => window.open('/api/debug/test-realtime-notifications?action=status', '_blank')}
                className="text-xs"
              >
                Ver API Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
