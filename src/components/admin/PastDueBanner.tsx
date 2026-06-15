'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CreditCard, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';

export function PastDueBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function fetchStatus() {
      try {
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
        const headers = await createTenantHeaders(user!.id);
        const res = await fetch('/api/tenant/organization', { headers });
        if (!res.ok) return;
        const result = await res.json();
        if (!cancelled && result.success && result.data) {
          setStatus(result.data.subscription_status ?? null);
        }
      } catch (e) {
        devLog.error('[PastDueBanner] Erro ao verificar status:', e);
      }
    }

    fetchStatus();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handlePortal() {
    setLoadingPortal(true);
    setPortalError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || 'Não foi possível abrir o portal.');
      }
    } catch {
      setPortalError('Erro de conexão.');
    } finally {
      setLoadingPortal(false);
    }
  }

  if (status !== 'past_due' || dismissed) return null;

  return (
    <div className="w-full bg-yellow-500 text-yellow-950 px-4 py-2.5 flex items-center gap-3 text-sm font-medium shadow-sm flex-wrap">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 min-w-0">
        Pagamento pendente — atualize sua forma de pagamento para evitar a suspensão do acesso.
        {portalError && (
          <span className="block text-xs text-red-800 font-normal mt-0.5">{portalError}</span>
        )}
      </span>
      <button
        onClick={handlePortal}
        disabled={loadingPortal}
        className="flex items-center gap-1.5 bg-yellow-950/10 hover:bg-yellow-950/20 border border-yellow-950/20 rounded px-3 py-1 text-xs font-semibold transition-colors"
      >
        {loadingPortal ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <CreditCard className="h-3 w-3" />
        )}
        Regularizar agora
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="hover:bg-yellow-950/10 rounded p-0.5 transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
