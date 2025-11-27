'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Users, Package, CalendarCheck, CreditCard, RefreshCw, Edit, X, Pause, Play, AlertTriangle, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { differenceInDays } from 'date-fns';

interface BillingInfo {
  billing_mode: 'avulso' | 'pacote' | 'assinatura';
  package?: {
    id: string;
    pacote_id: string;
    nome_pacote: string;
    projetos_inclusos: number;
    projetos_usados: number;
    data_ativacao: string;
    data_expiracao: string;
    status: string;
    preco?: number;
  } | null;
  subscription?: {
    id: string;
    plano_id: string;
    nome_plano: string;
    projetos_mensais: number;
    projetos_usados_mes_atual: number;
    data_inicio: string;
    dia_renovacao: number;
    ultimo_reset: string;
    proximo_reset: string;
    status: string;
    valor_mensal?: number;
  } | null;
}

interface ClientWithBilling {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  billingMode: 'avulso' | 'pacote' | 'assinatura';
  billingInfo: BillingInfo | null;
}

export function ClientSubscriptionsTab() {
  const { clients, loading } = useClients();
  const { toast } = useToast();
  const [clientsWithBilling, setClientsWithBilling] = useState<ClientWithBilling[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Estados para modais de confirmação
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    type: 'package' | 'subscription';
    client: ClientWithBilling;
    data: any;
  } | null>(null);

  // Estados para modal de renovação
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<{
    type: 'package' | 'subscription';
    client: ClientWithBilling;
    data: any;
  } | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  // Estados para modal de alteração
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<{
    type: 'package' | 'subscription';
    client: ClientWithBilling;
    data: any;
  } | null>(null);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedNewPackageId, setSelectedNewPackageId] = useState<string>('');
  const [selectedNewPlanId, setSelectedNewPlanId] = useState<string>('');
  const [isChanging, setIsChanging] = useState(false);

  // Estados para filtros e ordenação
  const [filter, setFilter] = useState<'all' | 'packages' | 'subscriptions' | 'expiring' | 'exhausted'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'expiration'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Função para buscar informações de faturamento de cada cliente
  const loadBillingInfo = async () => {
    if (clients.length === 0) return;

    setIsLoadingBilling(true);
    try {
      const clientsData = await Promise.all(
        clients.map(async (client) => {
          try {
            // Buscar informações de billing_mode do cliente
            const response = await fetch(`/api/admin/clients/${client.id}/billing-info`);
            const result = await response.json();

            if (result.success) {
              return {
                ...client,
                billingMode: result.data?.billing_mode || 'avulso',
                billingInfo: result.data
              };
            }
            return {
              ...client,
              billingMode: 'avulso' as const,
              billingInfo: null
            };
          } catch (error) {
            return {
              ...client,
              billingMode: 'avulso' as const,
              billingInfo: null
            };
          }
        })
      );

      setClientsWithBilling(clientsData);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  useEffect(() => {
    loadBillingInfo();
  }, [clients]);

  // Função para carregar pacotes disponíveis
  const loadAvailablePackages = async () => {
    try {
      const response = await fetch('/api/admin/pacotes');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePackages(result.data.filter((p: any) => p.ativo));
      }
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error);
    }
  };

  // Função para carregar planos disponíveis
  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/planos-assinatura');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePlans(result.data.filter((p: any) => p.ativo));
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    }
  };

  // Função para obter o badge da modalidade de faturamento
  const getBillingModeBadge = (mode: string) => {
    switch (mode) {
      case 'pacote':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-sm font-medium">
            <Package className="h-4 w-4" />
            Pacote
          </div>
        );
      case 'assinatura':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm font-medium">
            <CalendarCheck className="h-4 w-4" />
            Assinatura
          </div>
        );
      case 'avulso':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 rounded-full text-sm font-medium">
            <CreditCard className="h-4 w-4" />
            Avulso
          </div>
        );
    }
  };

  // Função para renderizar barra de progresso de pacote
  const renderPackageProgress = (pkg: BillingInfo['package']) => {
    if (!pkg) return null;

    const percentage = (pkg.projetos_usados / pkg.projetos_inclusos) * 100;
    const remaining = pkg.projetos_inclusos - pkg.projetos_usados;
    const daysUntilExpiration = differenceInDays(new Date(pkg.data_expiracao), new Date());

    // Status badge com mais estados
    let statusBadge = null;
    if (pkg.status === 'expirado') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
          Expirado
        </span>
      );
    } else if (remaining === 0) {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
          Esgotado
        </span>
      );
    } else if (pkg.status === 'ativo' && daysUntilExpiration <= 7) {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
          Expira em {daysUntilExpiration} {daysUntilExpiration === 1 ? 'dia' : 'dias'}
        </span>
      );
    } else if (pkg.status === 'ativo') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
          Ativo
        </span>
      );
    } else if (pkg.status === 'cancelado') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 rounded-full font-medium">
          Cancelado
        </span>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{pkg.nome_pacote}</span>
            {pkg.preco && (
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                R$ {pkg.preco.toFixed(2)}
              </span>
            )}
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                percentage >= 100 ? 'bg-red-500' : percentage >= 75 ? 'bg-orange-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {pkg.projetos_usados}/{pkg.projetos_inclusos}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Ativado em: {format(new Date(pkg.data_ativacao), "dd/MM/yyyy", { locale: ptBR })}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {daysUntilExpiration > 0 ? (
              <span>Expira em <span className="font-medium text-gray-700 dark:text-gray-300">{daysUntilExpiration} {daysUntilExpiration === 1 ? 'dia' : 'dias'}</span> ({format(new Date(pkg.data_expiracao), "dd/MM/yyyy", { locale: ptBR })})</span>
            ) : (
              <span>Expirado em: {format(new Date(pkg.data_expiracao), "dd/MM/yyyy", { locale: ptBR })}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Função para renderizar barra de progresso de assinatura
  const renderSubscriptionProgress = (sub: BillingInfo['subscription']) => {
    if (!sub) return null;

    const percentage = (sub.projetos_usados_mes_atual / sub.projetos_mensais) * 100;
    const remaining = sub.projetos_mensais - sub.projetos_usados_mes_atual;
    const daysUntilReset = differenceInDays(new Date(sub.proximo_reset), new Date());

    // Status badge com mais estados
    let statusBadge = null;
    if (sub.status === 'cancelada') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
          Cancelada
        </span>
      );
    } else if (remaining === 0) {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-medium">
          Limite Atingido
        </span>
      );
    } else if (sub.status === 'pendente_renovacao') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
          Pendente Renovação
        </span>
      );
    } else if (sub.status === 'pausada') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
          Pausada
        </span>
      );
    } else if (sub.status === 'ativa') {
      statusBadge = (
        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-medium">
          Ativa
        </span>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">{sub.nome_plano}</span>
            {sub.valor_mensal && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                R$ {sub.valor_mensal.toFixed(2)}/mês
              </span>
            )}
          </div>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                percentage >= 100 ? 'bg-red-500' : percentage >= 75 ? 'bg-orange-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
            {sub.projetos_usados_mes_atual}/{sub.projetos_mensais}
          </span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Iniciada em: {format(new Date(sub.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {daysUntilReset > 0 ? (
                <span>Renova em <span className="font-medium text-gray-700 dark:text-gray-300">{daysUntilReset} {daysUntilReset === 1 ? 'dia' : 'dias'}</span> ({format(new Date(sub.proximo_reset), "dd/MM/yyyy", { locale: ptBR })})</span>
              ) : (
                <span>Renovação pendente</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className={`gap-1.5 ${
              sub.status === 'pausada'
                ? 'text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            }`}
            onClick={() => console.log('Pausar/Reativar assinatura - TODO: Implementar backend')}
          >
            {sub.status === 'pausada' ? (
              <>
                <Play className="h-3.5 w-3.5" />
                Reativar
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5" />
                Pausar
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Função para renderizar botões de ação
  const renderActionButtons = (client: ClientWithBilling) => {
    if (client.billingMode === 'pacote' && client.billingInfo?.package) {
      return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => handleRenewPackage(client)}
            disabled={isCanceling}
          >
            <RefreshCw className="w-4 h-4" />
            Renovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={() => handleChangePackage(client)}
            disabled={isCanceling}
          >
            <Edit className="w-4 h-4" />
            Alterar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleCancelPackage(client)}
            disabled={isCanceling}
          >
            {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Cancelar
          </Button>
        </div>
      );
    }

    if (client.billingMode === 'assinatura' && client.billingInfo?.subscription) {
      const sub = client.billingInfo.subscription;
      const isPaused = sub.status === 'pausada';

      return (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
            onClick={() => handleRenewSubscription(client)}
            disabled={isCanceling}
          >
            <RefreshCw className="w-4 h-4" />
            Renovar
          </Button>
          {isPaused ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => handleResumeSubscription(client)}
              disabled={isCanceling}
            >
              <Play className="w-4 h-4" />
              Reativar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={() => handlePauseSubscription(client)}
              disabled={isCanceling}
            >
              <Pause className="w-4 h-4" />
              Pausar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={() => handleChangePlan(client)}
            disabled={isCanceling}
          >
            <Edit className="w-4 h-4" />
            Alterar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => handleCancelSubscription(client)}
            disabled={isCanceling}
          >
            {isCanceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Cancelar
          </Button>
        </div>
      );
    }

    // Modo avulso - opções de conversão
    return (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          onClick={() => handleConvertToPackage(client)}
        >
          <Package className="w-4 h-4" />
          Converter
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          onClick={() => handleConvertToSubscription(client)}
        >
          <CalendarCheck className="w-4 h-4" />
          Assinatura
        </Button>
      </div>
    );
  };

  // Handlers para ações
  const handleRenewPackage = (client: ClientWithBilling) => {
    if (!client.billingInfo?.package) return;

    setRenewTarget({
      type: 'package',
      client,
      data: client.billingInfo.package
    });
    setRenewModalOpen(true);
  };

  const handleChangePackage = async (client: ClientWithBilling) => {
    if (!client.billingInfo?.package) return;

    setChangeTarget({
      type: 'package',
      client,
      data: client.billingInfo.package
    });

    // Carregar pacotes disponíveis
    await loadAvailablePackages();
    setChangeModalOpen(true);
  };

  const handleCancelPackage = (client: ClientWithBilling) => {
    if (!client.billingInfo?.package) return;

    const pkg = client.billingInfo.package;

    // Abrir modal de confirmação
    setCancelTarget({
      type: 'package',
      client,
      data: pkg
    });
    setCancelModalOpen(true);
  };

  const handleRenewSubscription = (client: ClientWithBilling) => {
    if (!client.billingInfo?.subscription) return;

    setRenewTarget({
      type: 'subscription',
      client,
      data: client.billingInfo.subscription
    });
    setRenewModalOpen(true);
  };

  const handlePauseSubscription = (client: ClientWithBilling) => {
    console.log('Pausar assinatura:', client);
    // TODO: Implementar modal de pausa de assinatura
  };

  const handleResumeSubscription = (client: ClientWithBilling) => {
    console.log('Reativar assinatura:', client);
    // TODO: Implementar confirmação de reativação
  };

  const handleChangePlan = async (client: ClientWithBilling) => {
    if (!client.billingInfo?.subscription) return;

    setChangeTarget({
      type: 'subscription',
      client,
      data: client.billingInfo.subscription
    });

    // Carregar planos disponíveis
    await loadAvailablePlans();
    setChangeModalOpen(true);
  };

  const handleCancelSubscription = (client: ClientWithBilling) => {
    if (!client.billingInfo?.subscription) return;

    const sub = client.billingInfo.subscription;

    // Abrir modal de confirmação
    setCancelTarget({
      type: 'subscription',
      client,
      data: sub
    });
    setCancelModalOpen(true);
  };

  const handleConvertToPackage = (client: ClientWithBilling) => {
    console.log('Converter para pacote:', client);
    // TODO: Implementar modal de conversão para pacote
  };

  const handleConvertToSubscription = (client: ClientWithBilling) => {
    console.log('Converter para assinatura:', client);
    // TODO: Implementar modal de conversão para assinatura
  };

  // Função para confirmar cancelamento
  const confirmCancelBilling = async () => {
    if (!cancelTarget) return;

    setIsCanceling(true);

    try {
      if (cancelTarget.type === 'package') {
        const pkg = cancelTarget.data;
        const response = await fetch(`/api/admin/cliente-pacotes/${pkg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelado' }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao cancelar pacote');
        }

        toast({
          title: 'Pacote cancelado com sucesso',
          description: `O pacote "${pkg.nome_pacote}" foi cancelado. O cliente voltou para a modalidade avulsa.`,
        });
      } else if (cancelTarget.type === 'subscription') {
        const sub = cancelTarget.data;
        const response = await fetch(`/api/admin/cliente-assinaturas/${sub.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelada' }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao cancelar assinatura');
        }

        toast({
          title: 'Assinatura cancelada com sucesso',
          description: `A assinatura "${sub.nome_plano}" foi cancelada. O cliente voltou para a modalidade avulsa.`,
        });
      }

      // Recarregar informações de billing
      await loadBillingInfo();

      // Fechar modal
      setCancelModalOpen(false);
      setCancelTarget(null);

    } catch (error: any) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: cancelTarget.type === 'package' ? 'Erro ao cancelar pacote' : 'Erro ao cancelar assinatura',
        description: error.message || 'Ocorreu um erro ao processar o cancelamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCanceling(false);
    }
  };

  // Função para confirmar renovação
  const confirmRenewBilling = async () => {
    if (!renewTarget) return;

    setIsRenewing(true);

    try {
      if (renewTarget.type === 'package') {
        const pkg = renewTarget.data;
        // Renovar com o mesmo pacote (zera projetos e renova período)
        const response = await fetch(`/api/admin/cliente-pacotes/${pkg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novo_pacote_id: pkg.pacote_id }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao renovar pacote');
        }

        toast({
          title: 'Pacote renovado com sucesso',
          description: `O pacote "${pkg.nome_pacote}" foi renovado. O contador de projetos foi zerado e a validade renovada.`,
        });
      } else if (renewTarget.type === 'subscription') {
        const sub = renewTarget.data;
        const response = await fetch(`/api/admin/cliente-assinaturas/${sub.id}/renovar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao renovar assinatura');
        }

        toast({
          title: 'Assinatura renovada com sucesso',
          description: `A assinatura "${sub.nome_plano}" foi renovada para um novo ciclo mensal.`,
        });
      }

      // Recarregar informações de billing
      await loadBillingInfo();

      // Fechar modal
      setRenewModalOpen(false);
      setRenewTarget(null);

    } catch (error: any) {
      console.error('Erro ao renovar:', error);
      toast({
        title: renewTarget.type === 'package' ? 'Erro ao renovar pacote' : 'Erro ao renovar assinatura',
        description: error.message || 'Ocorreu um erro ao processar a renovação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsRenewing(false);
    }
  };

  // Função para confirmar alteração de pacote/plano
  const confirmChangeBilling = async () => {
    if (!changeTarget) return;

    // Validar seleção
    if (changeTarget.type === 'package' && !selectedNewPackageId) {
      toast({
        title: 'Selecione um pacote',
        description: 'Por favor, selecione o novo pacote para o cliente.',
        variant: 'destructive',
      });
      return;
    }

    if (changeTarget.type === 'subscription' && !selectedNewPlanId) {
      toast({
        title: 'Selecione um plano',
        description: 'Por favor, selecione o novo plano para o cliente.',
        variant: 'destructive',
      });
      return;
    }

    setIsChanging(true);

    try {
      if (changeTarget.type === 'package') {
        const pkg = changeTarget.data;
        // Alterar para novo pacote (zera projetos)
        const response = await fetch(`/api/admin/cliente-pacotes/${pkg.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novo_pacote_id: selectedNewPackageId }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao alterar pacote');
        }

        const newPackageName = availablePackages.find(p => p.id === selectedNewPackageId)?.nome || 'novo pacote';
        toast({
          title: 'Pacote alterado com sucesso',
          description: `O pacote foi alterado para "${newPackageName}". O contador de projetos foi zerado.`,
        });
      } else if (changeTarget.type === 'subscription') {
        const sub = changeTarget.data;
        const response = await fetch(`/api/admin/cliente-assinaturas/${sub.id}/renovar`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ novo_plano_id: selectedNewPlanId }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao alterar plano');
        }

        const newPlanName = availablePlans.find(p => p.id === selectedNewPlanId)?.nome || 'novo plano';
        toast({
          title: 'Plano alterado com sucesso',
          description: `O plano foi alterado para "${newPlanName}".`,
        });
      }

      // Recarregar informações de billing
      await loadBillingInfo();

      // Fechar modal e limpar seleções
      setChangeModalOpen(false);
      setChangeTarget(null);
      setSelectedNewPackageId('');
      setSelectedNewPlanId('');

    } catch (error: any) {
      console.error('Erro ao alterar:', error);
      toast({
        title: changeTarget.type === 'package' ? 'Erro ao alterar pacote' : 'Erro ao alterar plano',
        description: error.message || 'Ocorreu um erro ao processar a alteração. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsChanging(false);
    }
  };

  if (loading || isLoadingBilling) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Carregando informações de faturamento...</span>
      </div>
    );
  }

  if (clientsWithBilling.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
        <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500 dark:text-gray-400">
          Nenhum cliente cadastrado na plataforma
        </p>
      </div>
    );
  }

  // Função para alternar ordenação
  const toggleSort = (column: 'name' | 'status' | 'expiration') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Filtrar clientes
  const filteredClients = clientsWithBilling.filter((client) => {
    if (filter === 'all') return true;
    if (filter === 'packages') return client.billingMode === 'pacote' && client.billingInfo?.package?.status === 'ativo';
    if (filter === 'subscriptions') return client.billingMode === 'assinatura' && client.billingInfo?.subscription?.status === 'ativa';
    if (filter === 'expiring') {
      const pkg = client.billingInfo?.package;
      if (pkg && pkg.status === 'ativo') {
        const daysUntilExpiration = differenceInDays(new Date(pkg.data_expiracao), new Date());
        return daysUntilExpiration <= 7 && daysUntilExpiration >= 0;
      }
      return false;
    }
    if (filter === 'exhausted') {
      const pkg = client.billingInfo?.package;
      const sub = client.billingInfo?.subscription;
      return (
        (pkg && (pkg.projetos_usados >= pkg.projetos_inclusos || differenceInDays(new Date(pkg.data_expiracao), new Date()) < 0)) ||
        (sub && sub.projetos_usados_mes_atual >= sub.projetos_mensais)
      );
    }
    return true;
  });

  // Ordenar clientes
  const sortedClients = [...filteredClients].sort((a, b) => {
    let compareA: any;
    let compareB: any;

    if (sortBy === 'name') {
      compareA = a.name.toLowerCase();
      compareB = b.name.toLowerCase();
    } else if (sortBy === 'status') {
      compareA = a.billingMode;
      compareB = b.billingMode;
    } else if (sortBy === 'expiration') {
      // Ordenar por data de expiração (pacotes) ou próximo reset (assinaturas)
      compareA = a.billingInfo?.package?.data_expiracao || a.billingInfo?.subscription?.proximo_reset || '';
      compareB = b.billingInfo?.package?.data_expiracao || b.billingInfo?.subscription?.proximo_reset || '';
    }

    if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
    if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Estatísticas
  const stats = {
    total: clientsWithBilling.length,
    pacote: clientsWithBilling.filter(c => c.billingMode === 'pacote').length,
    assinatura: clientsWithBilling.filter(c => c.billingMode === 'assinatura').length,
    avulso: clientsWithBilling.filter(c => c.billingMode === 'avulso').length,
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total de Clientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400">Pacotes</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.pacote}</p>
            </div>
            <Package className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">Assinaturas</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.assinatura}</p>
            </div>
            <CalendarCheck className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avulso</p>
              <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.avulso}</p>
            </div>
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtrar por:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              Todos ({stats.total})
            </Button>
            <Button
              size="sm"
              variant={filter === 'packages' ? 'default' : 'outline'}
              onClick={() => setFilter('packages')}
              className={filter === 'packages' ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-600 border-purple-200'}
            >
              <Package className="h-3.5 w-3.5 mr-1.5" />
              Pacotes Ativos
            </Button>
            <Button
              size="sm"
              variant={filter === 'subscriptions' ? 'default' : 'outline'}
              onClick={() => setFilter('subscriptions')}
              className={filter === 'subscriptions' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-600 border-blue-200'}
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              Assinaturas Ativas
            </Button>
            <Button
              size="sm"
              variant={filter === 'expiring' ? 'default' : 'outline'}
              onClick={() => setFilter('expiring')}
              className={filter === 'expiring' ? 'bg-orange-600 hover:bg-orange-700' : 'text-orange-600 border-orange-200'}
            >
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
              Expirando em 7 dias
            </Button>
            <Button
              size="sm"
              variant={filter === 'exhausted' ? 'default' : 'outline'}
              onClick={() => setFilter('exhausted')}
              className={filter === 'exhausted' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-200'}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Esgotados/Expirados
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead
                className="font-semibold w-1/4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Cliente
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="font-semibold w-[10%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Modalidade
                  {sortBy === 'status' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="font-semibold w-[40%] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                onClick={() => toggleSort('expiration')}
              >
                <div className="flex items-center gap-2">
                  Status/Progresso
                  {sortBy === 'expiration' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-right w-[25%]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="w-1/4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{client.email}</div>
                  </div>
                </TableCell>
                <TableCell className="w-[10%]">
                  {getBillingModeBadge(client.billingMode)}
                </TableCell>
                <TableCell className="w-[40%]">
                  <div className="min-w-[280px]">
                    {client.billingMode === 'pacote' && client.billingInfo?.package && (
                      renderPackageProgress(client.billingInfo.package)
                    )}
                    {client.billingMode === 'assinatura' && client.billingInfo?.subscription && (
                      renderSubscriptionProgress(client.billingInfo.subscription)
                    )}
                    {client.billingMode === 'avulso' && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Projetos cobrados individualmente por kWp
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right w-[25%]">
                  <div className="flex justify-end gap-2">
                    {renderActionButtons(client)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Confirmação de Cancelamento */}
      <AlertDialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cancelar {cancelTarget?.type === 'package' ? 'Pacote' : 'Assinatura'}
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 space-y-3">
              {cancelTarget?.type === 'package' && cancelTarget.data && (
                <>
                  <p className="text-base">
                    Tem certeza que deseja cancelar o pacote <span className="font-semibold text-gray-900 dark:text-white">"{cancelTarget.data.nome_pacote}"</span>?
                  </p>
                  {(cancelTarget.data.projetos_inclusos - cancelTarget.data.projetos_usados) > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <p className="text-sm text-orange-800 dark:text-orange-400">
                        <span className="font-medium">Atenção:</span> O cliente ainda possui {' '}
                        <span className="font-semibold">
                          {cancelTarget.data.projetos_inclusos - cancelTarget.data.projetos_usados} {' '}
                          {(cancelTarget.data.projetos_inclusos - cancelTarget.data.projetos_usados) === 1 ? 'projeto' : 'projetos'}
                        </span> {' '}
                        restantes que serão perdidos.
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    O cliente será automaticamente movido para a modalidade <span className="font-medium">Avulso</span>.
                  </p>
                </>
              )}
              {cancelTarget?.type === 'subscription' && cancelTarget.data && (
                <>
                  <p className="text-base">
                    Tem certeza que deseja cancelar a assinatura <span className="font-semibold text-gray-900 dark:text-white">"{cancelTarget.data.nome_plano}"</span>?
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    A assinatura mensal será encerrada e o cliente será automaticamente movido para a modalidade <span className="font-medium">Avulso</span>.
                  </p>
                </>
              )}
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ⚠️ Esta ação não pode ser desfeita.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isCanceling}
              className="mt-2 sm:mt-0"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelBilling}
              disabled={isCanceling}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Renovação */}
      <AlertDialog open={renewModalOpen} onOpenChange={setRenewModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                <RefreshCw className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  Renovar {renewTarget?.type === 'package' ? 'Pacote' : 'Assinatura'}
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 space-y-3">
              {renewTarget?.type === 'package' && renewTarget.data && (
                <>
                  <p className="text-base">
                    Deseja renovar o pacote <span className="font-semibold text-gray-900 dark:text-white">"{renewTarget.data.nome_pacote}"</span>?
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      <span className="font-medium">O que acontecerá:</span>
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>O contador de projetos será <span className="font-semibold">zerado</span></li>
                        <li>Uma nova <span className="font-semibold">validade será iniciada</span> a partir de hoje</li>
                        <li>O cliente manterá o <span className="font-semibold">mesmo pacote</span></li>
                      </ul>
                    </p>
                  </div>
                </>
              )}
              {renewTarget?.type === 'subscription' && renewTarget.data && (
                <>
                  <p className="text-base">
                    Deseja renovar a assinatura <span className="font-semibold text-gray-900 dark:text-white">"{renewTarget.data.nome_plano}"</span>?
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      <span className="font-medium">O que acontecerá:</span>
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>Um novo <span className="font-semibold">ciclo mensal</span> será iniciado</li>
                        <li>O cliente manterá o <span className="font-semibold">mesmo plano</span></li>
                      </ul>
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isRenewing}
              className="mt-2 sm:mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRenewBilling}
              disabled={isRenewing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isRenewing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renovando...
                </>
              ) : (
                'Sim, renovar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Alteração de Pacote/Plano */}
      <AlertDialog open={changeModalOpen} onOpenChange={setChangeModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Edit className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                  Alterar {changeTarget?.type === 'package' ? 'Pacote' : 'Plano'}
                </AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400 space-y-3">
              {changeTarget?.type === 'package' && changeTarget.data && (
                <>
                  <p className="text-base">
                    Alterar de <span className="font-semibold text-gray-900 dark:text-white">"{changeTarget.data.nome_pacote}"</span> para:
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selecione o novo pacote
                    </label>
                    <Select value={selectedNewPackageId} onValueChange={setSelectedNewPackageId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha um pacote..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.nome} - {pkg.quantidade_projetos} projetos - R$ {pkg.preco}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                    <p className="text-sm text-purple-800 dark:text-purple-400">
                      <span className="font-medium">O que acontecerá:</span>
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>O pacote atual será <span className="font-semibold">cancelado</span></li>
                        <li>O novo pacote será <span className="font-semibold">ativado</span></li>
                        <li>O contador de projetos será <span className="font-semibold">zerado</span></li>
                        <li>Uma nova <span className="font-semibold">validade</span> será iniciada</li>
                      </ul>
                    </p>
                  </div>
                </>
              )}
              {changeTarget?.type === 'subscription' && changeTarget.data && (
                <>
                  <p className="text-base">
                    Alterar de <span className="font-semibold text-gray-900 dark:text-white">"{changeTarget.data.nome_plano}"</span> para:
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selecione o novo plano
                    </label>
                    <Select value={selectedNewPlanId} onValueChange={setSelectedNewPlanId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Escolha um plano..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.nome} - {plan.projetos_mensais} projetos/mês - R$ {plan.valor_mensal}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                    <p className="text-sm text-purple-800 dark:text-purple-400">
                      <span className="font-medium">O que acontecerá:</span>
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li>A assinatura atual será <span className="font-semibold">cancelada</span></li>
                        <li>O novo plano será <span className="font-semibold">ativado</span></li>
                        <li>Um novo <span className="font-semibold">ciclo mensal</span> será iniciado</li>
                      </ul>
                    </p>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              disabled={isChanging}
              className="mt-2 sm:mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmChangeBilling}
              disabled={isChanging}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isChanging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                'Confirmar alteração'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
