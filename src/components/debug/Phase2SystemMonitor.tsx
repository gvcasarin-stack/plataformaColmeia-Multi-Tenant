"use client";

import React, { useState, useEffect } from 'react';
import { healthChecker } from '@/lib/health/healthChecker';
import { sessionManager } from '@/lib/session/sessionManager';
import { offlineManager } from '@/lib/offline/offlineManager';
import { performanceOptimizer } from '@/lib/performance/performanceOptimizer';
import { devLog } from "@/lib/utils/productionLogger";
import { securityHardening } from '@/lib/security/securityHardening';

/**
 * 📊 Monitor Completo dos Sistemas FASE 2
 * 
 * Dashboard enterprise para monitoramento em tempo real:
 * - Health Check automático
 * - Gestão de Sessão avançada
 * - Modo Offline inteligente
 * - Otimização de Performance
 * - Hardening de Segurança
 * 
 * USO: Adicionar em desenvolvimento para monitoramento
 * IMPORTANTE: Remover/ocultar em produção
 */
export function Phase2SystemMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const [metrics, setMetrics] = useState({
    health: null,
    session: null,
    offline: null,
    performance: null,
    security: null
  });

  // Atualizar métricas a cada 5 segundos
  useEffect(() => {
    const updateMetrics = async () => {
      try {
        const [health, session, offline, performance, security] = await Promise.allSettled([
          healthChecker.getCurrentHealth(),
          sessionManager.getSessionMetrics(),
          offlineManager.getOfflineMetrics(),
          performanceOptimizer.getPerformanceMetrics(),
          securityHardening.getSecurityMetrics()
        ]);

        setMetrics({
          health: health.status === 'fulfilled' ? health.value : null,
          session: session.status === 'fulfilled' ? session.value : null,
          offline: offline.status === 'fulfilled' ? offline.value : null,
          performance: performance.status === 'fulfilled' ? performance.value : null,
          security: security.status === 'fulfilled' ? security.value : null
        });
      } catch (error) {
        devLog.error('Error updating metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  // Atalho de teclado para mostrar/ocultar (Ctrl+Shift+M)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setIsVisible(!isVisible);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors text-sm"
          title="Abrir Monitor de Sistemas (Ctrl+Shift+M)"
        >
          📊 Sistemas
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">🚀 Monitor FASE 2 - Sistemas Enterprise</h2>
          <p className="text-blue-100 text-sm">Monitoramento em tempo real • Atualizado a cada 5s</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-red-200 text-2xl"
          title="Fechar (Ctrl+Shift+M)"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border-b flex overflow-x-auto">
        {[
          { id: 'health', label: '🏥 Health Check', color: 'blue' },
          { id: 'session', label: '🔐 Sessão', color: 'green' },
          { id: 'offline', label: '📱 Offline', color: 'orange' },
          { id: 'performance', label: '⚡ Performance', color: 'purple' },
          { id: 'security', label: '🛡️ Segurança', color: 'red' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? `text-${tab.color}-600 border-b-2 border-${tab.color}-600 bg-white`
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-96">
        {activeTab === 'health' && (
          <HealthCheckPanel health={metrics.health} />
        )}
        {activeTab === 'session' && (
          <SessionPanel session={metrics.session} />
        )}
        {activeTab === 'offline' && (
          <OfflinePanel offline={metrics.offline} />
        )}
        {activeTab === 'performance' && (
          <PerformancePanel performance={metrics.performance} />
        )}
        {activeTab === 'security' && (
          <SecurityPanel security={metrics.security} />
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t px-4 py-2 text-xs text-gray-500 flex justify-between">
        <span>Pressione Ctrl+Shift+M para alternar</span>
        <span>Última atualização: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

// Componentes dos painéis individuais
function HealthCheckPanel({ health }: { health: any }) {
  if (!health) {
    return <div className="text-gray-500">Carregando métricas de saúde...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg">
          <h3 className="font-semibold text-green-800">Status Geral</h3>
          <div className={`text-2xl font-bold ${getStatusColor(health.overall.status)}`}>
            {getStatusIcon(health.overall.status)} {health.overall.status.toUpperCase()}
          </div>
          {health.overall.responseTime && (
            <p className="text-sm text-green-600">Tempo: {health.overall.responseTime}ms</p>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg">
          <h3 className="font-semibold text-blue-800">Última Verificação</h3>
          <p className="text-sm text-blue-600">{new Date(health.timestamp).toLocaleString()}</p>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">🔧 Sistemas Individuais</h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(health).filter(([key]) => !['overall', 'timestamp'].includes(key)).map(([system, data]: [string, any]) => (
            <div key={system} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="font-medium capitalize">{system}:</span>
              <div className="flex items-center space-x-2">
                <span className={getStatusColor(data.status)}>
                  {getStatusIcon(data.status)} {data.status}
                </span>
                {data.responseTime && (
                  <span className="text-xs text-gray-500">({data.responseTime}ms)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SessionPanel({ session }: { session: any }) {
  if (!session) {
    return <div className="text-gray-500">Carregando métricas de sessão...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg ${session.isActive ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className="font-semibold">🔓 Status da Sessão</h3>
          <div className={`text-xl font-bold ${session.isActive ? 'text-green-600' : 'text-red-600'}`}>
            {session.isActive ? '✅ ATIVA' : '❌ INATIVA'}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="font-semibold">💓 Heartbeat</h3>
          <div className={`text-xl font-bold ${session.heartbeatActive ? 'text-green-600' : 'text-gray-600'}`}>
            {session.heartbeatActive ? '🟢 ON' : '🔴 OFF'}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">📊 Métricas</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Última atividade:</span>
            <span className="font-medium">{session.minutesSinceLastActivity.toFixed(1)} min atrás</span>
          </div>
          {session.minutesUntilExpiry && (
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Expira em:</span>
              <span className="font-medium">{session.minutesUntilExpiry.toFixed(1)} min</span>
            </div>
          )}
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Logout por inatividade em:</span>
            <span className="font-medium">{session.minutesUntilInactivityLogout.toFixed(1)} min</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Refresh agendado:</span>
            <span className="font-medium">{session.refreshScheduled ? '✅ Sim' : '❌ Não'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OfflinePanel({ offline }: { offline: any }) {
  if (!offline) {
    return <div className="text-gray-500">Carregando métricas offline...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg ${offline.isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
          <h3 className="font-semibold">🌐 Conectividade</h3>
          <div className={`text-xl font-bold ${offline.isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {offline.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}
          </div>
        </div>

        <div className={`p-3 rounded-lg ${offline.isOfflineMode ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <h3 className="font-semibold">📱 Modo Offline</h3>
          <div className={`text-xl font-bold ${offline.isOfflineMode ? 'text-orange-600' : 'text-gray-600'}`}>
            {offline.isOfflineMode ? '🟡 ATIVO' : '⚪ INATIVO'}
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">📊 Estatísticas</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Ações pendentes:</span>
            <span className="font-medium">{offline.pendingActions}</span>
          </div>
          {offline.lastSyncTime && (
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span>Última sincronização:</span>
              <span className="font-medium">{new Date(offline.lastSyncTime).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Sincronização em progresso:</span>
            <span className="font-medium">{offline.syncInProgress ? '✅ Sim' : '❌ Não'}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Dados offline:</span>
            <span className="font-medium">{(offline.offlineDataSize / 1024).toFixed(1)} KB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformancePanel({ performance }: { performance: any }) {
  if (!performance) {
    return <div className="text-gray-500">Carregando métricas de performance...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-50 p-3 rounded-lg">
          <h3 className="font-semibold text-purple-800">⚡ Queries/hora</h3>
          <div className="text-2xl font-bold text-purple-600">{performance.totalQueries}</div>
        </div>

        <div className="bg-green-50 p-3 rounded-lg">
          <h3 className="font-semibold text-green-800">📈 Cache Hit Rate</h3>
          <div className="text-2xl font-bold text-green-600">{performance.cacheHitRate}%</div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">📊 Métricas Detalhadas</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Tempo médio de query:</span>
            <span className="font-medium">{performance.averageQueryTime}ms</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Queries otimizadas:</span>
            <span className="font-medium">{performance.optimizedQueries}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Queries lentas:</span>
            <span className="font-medium text-red-600">{performance.slowQueries}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Queries concorrentes:</span>
            <span className="font-medium">{performance.concurrentQueries}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Uso de memória:</span>
            <span className="font-medium">{performance.memoryUsage} MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityPanel({ security }: { security: any }) {
  if (!security) {
    return <div className="text-gray-500">Carregando métricas de segurança...</div>;
  }

  const threatLevel = security.blockedRequests > 10 ? 'high' : 
                    security.blockedRequests > 5 ? 'medium' : 'low';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg ${
          threatLevel === 'high' ? 'bg-red-50' : 
          threatLevel === 'medium' ? 'bg-yellow-50' : 'bg-green-50'
        }`}>
          <h3 className="font-semibold">🛡️ Nível de Ameaça</h3>
          <div className={`text-xl font-bold ${
            threatLevel === 'high' ? 'text-red-600' : 
            threatLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {threatLevel === 'high' ? '🔴 ALTO' : 
             threatLevel === 'medium' ? '🟡 MÉDIO' : '🟢 BAIXO'}
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg">
          <h3 className="font-semibold text-blue-800">🚫 Bloqueios/hora</h3>
          <div className="text-2xl font-bold text-blue-600">{security.blockedRequests}</div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">🚨 Ameaças Detectadas</h3>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Rate limiting:</span>
            <span className="font-medium">{security.rateLimitViolations}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Tentativas XSS:</span>
            <span className="font-medium text-red-600">{security.xssAttempts}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>SQL Injection:</span>
            <span className="font-medium text-red-600">{security.sqlInjectionAttempts}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Atividade suspeita:</span>
            <span className="font-medium text-orange-600">{security.suspiciousActivity}</span>
          </div>
          <div className="flex justify-between p-2 bg-gray-50 rounded">
            <span>Total de requests:</span>
            <span className="font-medium">{security.totalRequests}</span>
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Última verificação: {new Date(security.lastSecurityScan).toLocaleString()}
      </div>
    </div>
  );
} 