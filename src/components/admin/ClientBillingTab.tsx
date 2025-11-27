'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CalendarCheck, Loader2, PlusCircle, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ActivatePackageModal } from './ActivatePackageModal';
import { ActivateSubscriptionModal } from './ActivateSubscriptionModal';

interface ClientBillingTabProps {
  clientId: string;
  clientName: string;
}

interface ActivePackage {
  id: string;
  pacote_id: string;
  projetos_inclusos: number;
  projetos_usados: number;
  projetos_restantes: number;
  data_ativacao: string;
  data_expiracao: string;
  status: 'ativo' | 'expirado' | 'cancelado';
  pacote: {
    nome: string;
    valor: number;
    validade_dias: number;
  };
}

interface ActiveSubscription {
  id: string;
  plano_id: string;
  projetos_mensais: number;
  projetos_usados_mes: number;
  projetos_restantes_mes: number;
  data_inicio: string;
  data_fim: string | null;
  proximo_reset: string;
  status: 'ativa' | 'pendente_renovacao' | 'cancelada' | 'expirada';
  plano: {
    nome: string;
    valor_mensal: number;
    dia_renovacao: number;
  };
}

export function ClientBillingTab({ clientId, clientName }: ClientBillingTabProps) {
  const [loading, setLoading] = useState(false);
  const [billingMode, setBillingMode] = useState<'avulso' | 'pacote' | 'assinatura'>('avulso');
  const [activePackages, setActivePackages] = useState<ActivePackage[]>([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [showActivatePackageModal, setShowActivatePackageModal] = useState(false);
  const [showActivateSubscriptionModal, setShowActivateSubscriptionModal] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [clientId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/clients/${clientId}/billing`);
      const result = await response.json();

      if (result.success && result.data) {
        setBillingMode(result.data.billing_mode || 'avulso');

        // Carregar pacotes ativos
        if (result.data.billing_mode === 'pacote') {
          const packagesResponse = await fetch(`/api/admin/clients/${clientId}/packages`);
          const packagesResult = await packagesResponse.json();
          if (packagesResult.success) {
            setActivePackages(packagesResult.data || []);
          }
        }

        // Carregar assinaturas ativas
        if (result.data.billing_mode === 'assinatura') {
          const subscriptionsResponse = await fetch(`/api/admin/clients/${clientId}/subscriptions`);
          const subscriptionsResult = await subscriptionsResponse.json();
          if (subscriptionsResult.success) {
            setActiveSubscriptions(subscriptionsResult.data || []);
          }
        }
      }
    } catch (error: any) {
      devLog.error('[ClientBillingTab] Erro ao carregar dados de faturamento:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: error.message || 'Não foi possível carregar os dados de faturamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      ativo: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: 'Ativo',
      },
      ativa: {
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        label: 'Ativa',
      },
      pendente_renovacao: {
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        icon: <Clock className="h-3.5 w-3.5" />,
        label: 'Pendente Renovação',
      },
      expirado: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Expirado',
      },
      expirada: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Expirada',
      },
      cancelado: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Cancelado',
      },
      cancelada: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: 'Cancelada',
      },
    };

    const badge = badges[status] || badges.ativo;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Carregando dados de faturamento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Faturamento de {clientName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Modalidade atual: <span className="font-medium">{
              billingMode === 'avulso' ? 'Projetos Avulsos' :
              billingMode === 'pacote' ? 'Pacotes de Projetos' :
              'Assinatura Mensal'
            }</span>
          </p>
        </div>
      </div>

      {/* Pacotes Ativos */}
      {billingMode === 'pacote' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600" />
              Pacotes Ativos
            </h4>
            <Button size="sm" onClick={() => setShowActivatePackageModal(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Ativar Pacote
            </Button>
          </div>

          {activePackages.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este cliente não possui nenhum pacote ativo no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activePackages.map((pkg) => (
                <Card key={pkg.id} className="border-2 border-indigo-200 dark:border-indigo-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{pkg.pacote.nome}</CardTitle>
                      {getStatusBadge(pkg.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Projetos */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Projetos Inclusos:</span>
                        <span className="font-semibold">{pkg.projetos_inclusos}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Projetos Usados:</span>
                        <span className="font-semibold">{pkg.projetos_usados}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Projetos Restantes:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {pkg.projetos_restantes}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${(pkg.projetos_usados / pkg.projetos_inclusos) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Datas */}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Ativado em:</span>
                        <span>{format(new Date(pkg.data_ativacao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Validade:</span>
                        <span className={
                          new Date(pkg.data_expiracao) < new Date()
                            ? 'text-red-600 dark:text-red-400 font-semibold'
                            : ''
                        }>
                          {format(new Date(pkg.data_expiracao), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm" className="flex-1" disabled={pkg.status !== 'ativo'}>
                        Renovar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-red-600" disabled={pkg.status !== 'ativo'}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assinaturas Ativas */}
      {billingMode === 'assinatura' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-indigo-600" />
              Assinaturas Ativas
            </h4>
            <Button size="sm" onClick={() => setShowActivateSubscriptionModal(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Ativar Assinatura
            </Button>
          </div>

          {activeSubscriptions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este cliente não possui nenhuma assinatura ativa no momento.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeSubscriptions.map((sub) => (
                <Card key={sub.id} className="border-2 border-indigo-200 dark:border-indigo-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{sub.plano.nome}</CardTitle>
                      {getStatusBadge(sub.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Projetos Mensais */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Projetos Mensais:</span>
                        <span className="font-semibold">{sub.projetos_mensais}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Usados Este Mês:</span>
                        <span className="font-semibold">{sub.projetos_usados_mes}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Restantes:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {sub.projetos_restantes_mes}
                        </span>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${(sub.projetos_usados_mes / sub.projetos_mensais) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Informações de Renovação */}
                    <div className="pt-3 border-t space-y-1">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Valor Mensal:</span>
                        <span className="font-semibold">
                          R$ {sub.plano.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Dia de Renovação:</span>
                        <span>Dia {sub.plano.dia_renovacao}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Próxima Renovação:</span>
                        <span className="font-semibold">
                          {format(new Date(sub.proximo_reset), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm" className="flex-1" disabled={sub.status !== 'ativa'}>
                        Pausar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-red-600" disabled={sub.status !== 'ativa'}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projetos Avulsos */}
      {billingMode === 'avulso' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Este cliente está configurado para criar projetos avulsos. Não há pacotes ou assinaturas para gerenciar.
          </AlertDescription>
        </Alert>
      )}

      {/* Modals */}
      <ActivatePackageModal
        open={showActivatePackageModal}
        onOpenChange={setShowActivatePackageModal}
        clientId={clientId}
        clientName={clientName}
        onSuccess={loadBillingData}
      />

      <ActivateSubscriptionModal
        open={showActivateSubscriptionModal}
        onOpenChange={setShowActivateSubscriptionModal}
        clientId={clientId}
        clientName={clientName}
        onSuccess={loadBillingData}
      />
    </div>
  );
}
