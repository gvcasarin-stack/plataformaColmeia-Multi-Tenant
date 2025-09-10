'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface ApiResult {
  api: string;
  status: number;
  success: boolean;
  error: string | null;
  data: any;
}

interface DiagnosticResult {
  summary: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
  };
  results: ApiResult[];
  diagnosticInfo: {
    userId: string;
    tenantId: string;
    timestamp: string;
    hostname: string;
  };
}

export default function AdminApiTestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug/test-admin-apis?userId=${user.id}`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Diagnóstico das APIs Admin
        </h1>
        <p className="text-gray-600">
          Teste todas as APIs principais do painel administrativo para identificar problemas.
        </p>
      </div>

      {user?.id && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Usuário logado:</strong> {user.email} (ID: {user.id})
          </p>
          {user.profile?.role && (
            <p className="text-sm text-blue-800">
              <strong>Role:</strong> {user.profile.role}
            </p>
          )}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={runDiagnostic}
          disabled={loading || !user?.id}
          className="px-6 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Executando Diagnóstico...' : 'Executar Diagnóstico das APIs'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Resumo */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo do Diagnóstico</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{result.summary.total}</div>
                <div className="text-sm text-gray-600">Total de APIs</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.summary.successful}</div>
                <div className="text-sm text-green-600">Bem-sucedidas</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
                <div className="text-sm text-red-600">Falharam</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.summary.successRate}%</div>
                <div className="text-sm text-blue-600">Taxa de Sucesso</div>
              </div>
            </div>
          </div>

          {/* Informações do Diagnóstico */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Diagnóstico</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User ID:</strong> {result.diagnosticInfo.userId}
              </div>
              <div>
                <strong>Tenant ID:</strong> {result.diagnosticInfo.tenantId || 'Não encontrado'}
              </div>
              <div>
                <strong>Hostname:</strong> {result.diagnosticInfo.hostname}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(result.diagnosticInfo.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Resultados Detalhados */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados Detalhados</h2>
            <div className="space-y-4">
              {result.results.map((apiResult, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{apiResult.api}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apiResult.success)}`}>
                      {apiResult.success ? '✅ Sucesso' : '❌ Falha'} ({apiResult.status})
                    </span>
                  </div>
                  
                  {apiResult.error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                      <strong className="text-red-800">Erro:</strong>
                      <span className="text-red-700 ml-2">{apiResult.error}</span>
                    </div>
                  )}
                  
                  {apiResult.data && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-gray-700 mb-2">
                          Ver dados retornados
                        </summary>
                        <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-40">
                          {JSON.stringify(apiResult.data, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}