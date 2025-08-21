"use client";

import React, { useState, useEffect } from 'react';
import { systemMonitor, type SystemMetrics, type PerformanceTest } from '@/lib/monitoring/systemMonitor';
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/contexts/AuthContext';

/**
 * 🔧 Componente de Debug - Sistema de Saúde
 * 
 * Componente discreto para desenvolvedores monitorarem:
 * - Métricas de cache
 * - Estado do error recovery  
 * - Performance do sistema
 * - Logs estruturados
 * 
 * USO: Adicionar temporariamente durante desenvolvimento
 * IMPORTANTE: Remover antes de produção
 */
export function SystemHealthDebug() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [testResults, setTestResults] = useState<PerformanceTest[]>([]);

  // Atualizar métricas a cada 5 segundos
  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      try {
        const currentMetrics = systemMonitor.getSystemMetrics();
        const currentReport = systemMonitor.getPerformanceReport();
        setMetrics(currentMetrics);
        setPerformanceReport(currentReport);
      } catch (error) {
        devLog.error('[SystemHealthDebug] Error updating metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Teste de performance
  const runPerformanceTest = async () => {
    if (!user?.id) return;

    try {
      const result = await systemMonitor.testProfileFetchPerformance(user.id);
      setTestResults(prev => [...prev.slice(-9), result]);
    } catch (error) {
      devLog.error('[SystemHealthDebug] Performance test failed:', error);
    }
  };

  // Exportar relatório
  const exportReport = () => {
    try {
      const report = systemMonitor.exportFullReport();
      const blob = new Blob([report], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      devLog.error('[SystemHealthDebug] Export failed:', error);
    }
  };

  // Shortcut para mostrar/ocultar (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100"
          title="Ctrl+Shift+D para toggle"
        >
          🔧 Debug
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'FAIR': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md">
      {/* Header */}
      <div className="bg-gray-800 text-white px-3 py-2 rounded-t-lg flex justify-between items-center">
        <span className="text-sm font-medium">🔧 System Health - FASE 1</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white hover:text-gray-300 text-xs"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-300 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 max-h-96 overflow-y-auto text-xs">
          {metrics && (
            <>
              {/* Status Geral */}
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 mb-1">Status Geral</h4>
                <div className="bg-gray-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span>Cache Hit Rate:</span>
                    <span className={metrics.cache.performance.hitRate > 80 ? 'text-green-600' : 'text-yellow-600'}>
                      {metrics.cache.performance.hitRate}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Recovery:</span>
                    <span className={metrics.errorRecovery.circuitBreakerState === 'CLOSED' ? 'text-green-600' : 'text-red-600'}>
                      {metrics.errorRecovery.circuitBreakerState}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Logs:</span>
                    <span className="text-blue-600">{metrics.logger.totalLogs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Errors:</span>
                    <span className={metrics.logger.errorCount > 0 ? 'text-red-600' : 'text-green-600'}>
                      {metrics.logger.errorCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cache Stats */}
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 mb-1">Cache Multi-Camada</h4>
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <div className="flex justify-between">
                    <span>Memory Hits:</span>
                    <span className="text-green-600">{metrics.cache.stats.memoryHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Session Hits:</span>
                    <span className="text-blue-600">{metrics.cache.stats.sessionHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Local Hits:</span>
                    <span className="text-purple-600">{metrics.cache.stats.localHits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misses:</span>
                    <span className="text-orange-600">{metrics.cache.stats.misses}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Hit Time:</span>
                    <span>{metrics.cache.performance.avgHitTime}ms</span>
                  </div>
                </div>
              </div>

              {/* Performance Report */}
              {performanceReport && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-700 mb-1">Performance Report</h4>
                  <div className="bg-green-50 p-2 rounded text-xs">
                    <div className="flex justify-between">
                      <span>Avg Response:</span>
                      <span>{performanceReport.averageResponseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate:</span>
                      <span className="text-green-600">{performanceReport.successRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hit Rate:</span>
                      <span>{performanceReport.cacheHitRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Tests:</span>
                      <span>{performanceReport.totalTests}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Últimos Testes */}
              {testResults.length > 0 && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-700 mb-1">Últimos Testes</h4>
                  <div className="bg-yellow-50 p-2 rounded text-xs max-h-20 overflow-y-auto">
                    {testResults.slice(-3).map((test, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{test.operation}</span>
                        <span className={test.success ? 'text-green-600' : 'text-red-600'}>
                          {test.duration}ms {test.cacheHit ? '📦' : '🌐'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={runPerformanceTest}
                  disabled={!user?.id}
                  className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                >
                  🧪 Test
                </button>
                <button
                  onClick={exportReport}
                  className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                >
                  📊 Export
                </button>
                <button
                  onClick={() => systemMonitor.clearMonitoringData()}
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                >
                  🧹 Clear
                </button>
              </div>
            </>
          )}

          {!metrics && (
            <div className="text-center py-4 text-gray-500">
              Carregando métricas...
            </div>
          )}
        </div>
      )}

      {/* Collapsed view */}
      {!isExpanded && metrics && (
        <div className="px-3 py-2 text-xs">
          <div className="flex justify-between items-center">
            <span>Cache: {metrics.cache.performance.hitRate}%</span>
            <span className={getStatusColor(
              metrics.cache.performance.hitRate > 80 ? 'EXCELLENT' : 
              metrics.cache.performance.hitRate > 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
            )}>
              ●
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
