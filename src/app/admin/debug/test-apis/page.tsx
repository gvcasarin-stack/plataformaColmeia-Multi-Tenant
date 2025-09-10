'use client';

import { useState } from 'react';

interface ApiTest {
  name: string;
  url: string;
  method: string;
  tab: string;
  status: 'success' | 'error' | 'skipped';
  statusCode: number;
  error: string | null;
  responseTime: number;
}

interface TestResults {
  timestamp: string;
  hostname: string;
  middleware: {
    headers: Record<string, string | null>;
    working: boolean;
  };
  adminApis: {
    tested: number;
    working: number;
    failing: number;
    details: ApiTest[];
  };
  summary: {
    allWorking: boolean;
    criticalErrors: string[];
  };
}

export default function TestAllAdminApisPage() {
  const [results, setResults] = useState<TestResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/debug/test-all-admin-apis');
      const data = await response.json();
      
      setResults(data);
      
      if (!response.ok) {
        setError(`Alguns testes falharam (Status: ${response.status})`);
      }
    } catch (err: any) {
      setError(`Erro ao executar testes: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      case 'skipped': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTabColor = (tab: string) => {
    const colors: Record<string, string> = {
      'painel': 'bg-blue-100 text-blue-800',
      'projetos': 'bg-purple-100 text-purple-800',
      'equipe': 'bg-green-100 text-green-800',
      'financeiro': 'bg-yellow-100 text-yellow-800',
      'notificacoes': 'bg-red-100 text-red-800',
      'sistema': 'bg-gray-100 text-gray-800'
    };
    return colors[tab] || 'bg-gray-100 text-gray-800';
  };

  // Agrupar APIs por aba
  const apisByTab = results?.adminApis.details.reduce((acc, api) => {
    if (!acc[api.tab]) acc[api.tab] = [];
    acc[api.tab].push(api);
    return acc;
  }, {} as Record<string, ApiTest[]>) || {};

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🧪 Teste Completo - Todas as APIs Admin
              </h1>
              <p className="text-gray-600 mt-2">
                Testa todas as APIs que as abas do admin utilizam
              </p>
            </div>
            
            <button
              onClick={runTests}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isLoading ? '🔄 Testando...' : '▶️ Executar Testes'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              <strong>Erro:</strong> {error}
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Resumo Geral */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Total Testado</div>
                  <div className="text-2xl font-bold text-blue-900">{results.adminApis.tested}</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Funcionando</div>
                  <div className="text-2xl font-bold text-green-900">{results.adminApis.working}</div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-red-600 font-medium">Com Erro</div>
                  <div className="text-2xl font-bold text-red-900">{results.adminApis.failing}</div>
                </div>
                
                <div className={`p-4 rounded-lg ${results.summary.allWorking ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-sm font-medium ${results.summary.allWorking ? 'text-green-600' : 'text-red-600'}`}>
                    Status Geral
                  </div>
                  <div className={`text-2xl font-bold ${results.summary.allWorking ? 'text-green-900' : 'text-red-900'}`}>
                    {results.summary.allWorking ? '✅ OK' : '❌ ERRO'}
                  </div>
                </div>
              </div>

              {/* Headers do Middleware */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">🔧 Headers do Middleware</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(results.middleware.headers).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{key}:</span>
                      <span className={value ? 'text-green-600 font-mono' : 'text-red-600'}>
                        {value || 'null'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Erros Críticos */}
              {results.summary.criticalErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-3">🚨 Problemas Encontrados</h3>
                  <ul className="space-y-1">
                    {results.summary.criticalErrors.map((error, index) => (
                      <li key={index} className="text-red-700">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resultados por Aba */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">📊 Resultados por Aba</h3>
                
                {Object.entries(apisByTab).map(([tab, apis]) => {
                  const errorCount = apis.filter(api => api.status === 'error').length;
                  const successCount = apis.filter(api => api.status === 'success').length;
                  
                  return (
                    <div key={tab} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTabColor(tab)}`}>
                            {tab.toUpperCase()}
                          </span>
                          <span className="text-gray-600">
                            {successCount} OK, {errorCount} erros
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {apis.map((api, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(api.status)}`}>
                                  {api.status.toUpperCase()}
                                </span>
                                <span className="font-medium">{api.name}</span>
                                <span className="text-gray-500 text-sm">{api.method} {api.url}</span>
                              </div>
                              {api.error && (
                                <div className="text-red-600 text-sm mt-1">
                                  {api.error}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-right text-sm text-gray-500">
                              {api.statusCode > 0 && (
                                <div>Status: {api.statusCode}</div>
                              )}
                              {api.responseTime > 0 && (
                                <div>{api.responseTime}ms</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-center">
                Testado em: {new Date(results.timestamp).toLocaleString('pt-BR')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}