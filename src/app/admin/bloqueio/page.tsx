'use client';

import { useState } from 'react';
import { CreditCard, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BloqueioPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.origin + '/admin/assinaturas' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Não foi possível abrir o portal de pagamento. Tente novamente ou entre em contato com o suporte.');
        setLoading(false);
      }
    } catch {
      setError('Erro ao conectar. Verifique sua conexão e tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 p-8 text-center border-b border-white/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
              <AlertTriangle className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Acesso Suspenso</h1>
            <p className="text-slate-300 text-base">
              O acesso foi suspenso por falha no pagamento da assinatura.
            </p>
          </div>

          <div className="p-8 space-y-6">
            <p className="text-slate-300 text-sm leading-relaxed text-center">
              Após múltiplas tentativas de cobrança sem sucesso, o acesso ao painel foi temporariamente suspenso. Regularize a forma de pagamento para restaurar o acesso imediatamente.
            </p>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-blue-300 mb-1 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Como restaurar o acesso
              </h2>
              <p className="text-slate-300 text-sm">
                Clique no botão abaixo para atualizar ou trocar seu cartão de crédito. Após o pagamento ser aprovado, o acesso será restaurado automaticamente em instantes.
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              onClick={handlePortal}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-base font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo portal...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Atualizar forma de pagamento
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-slate-500 text-xs text-center">
              Dúvidas?{' '}
              <a
                href="mailto:suporte@gerenciamentofotovoltaico.com.br"
                className="text-blue-400 hover:text-blue-300"
              >
                suporte@gerenciamentofotovoltaico.com.br
              </a>
            </p>
          </div>
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">
          SGF Multi-Tenant © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
