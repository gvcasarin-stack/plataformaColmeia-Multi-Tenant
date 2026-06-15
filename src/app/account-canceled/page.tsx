'use client';

import React, { useState } from 'react';
import { XCircle, Mail, ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function AccountCanceledPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReactivate() {
    setLoading(true);
    setError(null);
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const slug = hostname.split('.')[0];

      const res = await fetch('/api/billing/reactivate-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Não foi possível iniciar o processo. Tente novamente.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Header com ícone */}
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 p-8 text-center border-b border-white/10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-4">
              <XCircle className="h-10 w-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Conta Encerrada
            </h1>
            <p className="text-slate-300 text-lg">
              A assinatura desta organização foi cancelada
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-base leading-relaxed">
                O acesso ao painel está <span className="font-semibold text-white">bloqueado</span> porque a assinatura foi encerrada.
              </p>
              <p className="text-slate-400 text-sm leading-relaxed">
                Você pode reativar a assinatura agora e ter acesso imediato ao painel assim que o pagamento for confirmado.
              </p>
            </div>

            {/* Botão principal de reativação */}
            <div className="flex justify-center">
              <button
                onClick={handleReactivate}
                disabled={loading}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl text-base"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Aguarde...</>
                ) : (
                  <><CreditCard className="h-5 w-5" /> Reativar assinatura</>
                )}
              </button>
            </div>

            {error && (
              <p className="text-center text-red-400 text-sm">{error}</p>
            )}

            {/* Seção de ajuda */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-400" />
                Precisa de ajuda?
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                Se você acredita que isso é um erro ou precisa de suporte, entre em contato:
              </p>
              <a
                href="mailto:suporte@gerenciamentofotovoltaico.com.br"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
              >
                suporte@gerenciamentofotovoltaico.com.br
              </a>
            </div>

            {/* Botão para voltar */}
            <div className="flex justify-center pt-2">
              <Link
                href="https://gerenciamentofotovoltaico.com.br"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o site principal
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          SGF Multi-Tenant © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
