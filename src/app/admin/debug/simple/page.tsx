'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';

interface SimpleTestResult {
  timestamp: string;
  userId: string;
  tenantId: string | null;
  hostname: string | null;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    passedTests: string[];
    failedTests: string[];
  };
  tests: {
    [key: string]: {
      success: boolean;
      error: string | null;
      data?: any;
    };
  };
}

export default function SimpleTestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimpleTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSimpleTest = async () => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug/simple-test?userId=${user.id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Verificar se a resposta tem o formato esperado
      if (data.error) {
        throw new Error(data.error);
      }
      
      setResult(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Erro no teste simples:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Teste Simples do Sistema
        </h1>
        <p className="text-gray-600">
          Teste básico para verificar conectividade e funcionalidades essenciais.
        </p>
      </div>

      {user?.id && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Usuário:</strong> {user.email} 
          </p>
          <p className="text-sm text-blue-800">
            <strong>ID:</strong> {user.id}
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
          onClick={runSimpleTest}
          disabled={loading || !user?.id}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Executando Teste...' : 'Executar Teste Simples'}
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resumo dos Testes</h2>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{result.summary.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.summary.passed}</div>
                <div className="text-sm text-green-600">Passou</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
                <div className="text-sm text-red-600">Falhou</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.summary.passRate}%</div>
                <div className="text-sm text-blue-600">Taxa de Sucesso</div>
              </div>
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Sistema</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User ID:</strong> {result.userId}
              </div>
              <div>
                <strong>Tenant ID:</strong> {result.tenantId || 'Não encontrado'}
              </div>
              <div>
                <strong>Hostname:</strong> {result.hostname}
              </div>
              <div>
                <strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Testes Individuais */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resultados Detalhados</h2>
            <div className="space-y-4">
              {Object.entries(result.tests).map(([testName, testResult]) => (
                <div key={testName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(testResult.success)}`}>
                      {getStatusIcon(testResult.success)} {testResult.success ? 'Sucesso' : 'Falha'}
                    </span>
                  </div>
                  
                  {testResult.error && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                      <strong className="text-red-800">Erro:</strong>
                      <span className="text-red-700 ml-2">{testResult.error}</span>
                    </div>
                  )}
                  
                  {testResult.data && (
                    <div className="mt-2">
                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium text-gray-700 mb-2">
                          Ver dados
                        </summary>
                        <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-32">
                          {JSON.stringify(testResult.data, null, 2)}
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