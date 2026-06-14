'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { devLog } from '@/lib/utils/productionLogger';

interface TenantBilling {
  id: string;
  name: string;
  slug: string;
  status: string;
  subscription_status: string;
  payment_failure_count: number;
  last_payment_failure_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  is_trial: boolean;
  trial_end_date: string | null;
  updated_at: string;
  plans: { name: string; price: number } | null;
}

function StatusBadge({ status, isTrial }: { status: string; isTrial: boolean }) {
  if (isTrial) {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Trial</Badge>;
  }
  switch (status) {
    case 'active':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Ativo</Badge>;
    case 'past_due':
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Inadimplente</Badge>;
    case 'suspended':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Suspenso</Badge>;
    case 'cancelled':
    case 'canceled':
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">Cancelado</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200">{status || '—'}</Badge>;
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'past_due': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'suspended': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

export default function SuperadminAssinaturasPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<TenantBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

  async function fetchTenants() {
    setLoading(true);
    try {
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user!.id);
      const res = await fetch('/api/superadmin/tenants-billing', { headers });
      const result = await res.json();
      if (result.success) {
        setTenants(result.data);
      }
    } catch (e) {
      devLog.error('[SuperadminAssinaturas] Erro:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) fetchTenants();
  }, [user?.id]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Acesso restrito a superadmin.</p>
      </div>
    );
  }

  const filtered = tenants.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ||
      (filter === 'past_due' && t.subscription_status === 'past_due') ||
      (filter === 'suspended' && t.subscription_status === 'suspended') ||
      (filter === 'active' && t.subscription_status === 'active' && !t.is_trial) ||
      (filter === 'trial' && t.is_trial) ||
      (filter === 'failures' && (t.payment_failure_count ?? 0) > 0);
    return matchSearch && matchFilter;
  });

  const counts = {
    past_due: tenants.filter(t => t.subscription_status === 'past_due').length,
    suspended: tenants.filter(t => t.subscription_status === 'suspended').length,
    failures: tenants.filter(t => (t.payment_failure_count ?? 0) > 0).length,
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-700 to-slate-800 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Controle de Assinaturas</h1>
          <p className="mt-2 text-slate-300">Visão superadmin — todas as tenants e seus status de cobrança</p>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-slate-600/30" />
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-xs text-yellow-700">Inadimplentes</p>
                <p className="text-2xl font-bold text-yellow-800">{counts.past_due}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-red-700">Suspensos</p>
                <p className="text-2xl font-bold text-red-800">{counts.suspended}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-orange-700">Com falhas</p>
                <p className="text-2xl font-bold text-orange-800">{counts.failures}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar tenant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {['all', 'past_due', 'suspended', 'active', 'trial', 'failures'].map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {{ all: 'Todos', past_due: 'Inadimplentes', suspended: 'Suspensos', active: 'Ativos', trial: 'Trial', failures: 'Com falhas' }[f]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={fetchTenants} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {filtered.length} tenant{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-10">Nenhuma tenant encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Plano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Falhas</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Última falha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Atualizado</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon status={t.subscription_status} />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                            <p className="text-xs text-gray-500">{t.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {t.plans?.name || '—'}
                        {t.plans?.price ? (
                          <span className="text-xs text-gray-400 ml-1">
                            R${Number(t.plans.price).toLocaleString('pt-BR')}/mês
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.subscription_status} isTrial={t.is_trial} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(t.payment_failure_count ?? 0) > 0 ? (
                          <span className="font-bold text-red-600">{t.payment_failure_count}</span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {t.last_payment_failure_at
                          ? new Date(t.last_payment_failure_at).toLocaleString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(t.updated_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        {t.stripe_customer_id && (
                          <a
                            href={`https://dashboard.stripe.com/customers/${t.stripe_customer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            Stripe <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
