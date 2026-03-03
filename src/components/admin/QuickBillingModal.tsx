'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Package, CalendarCheck, Save } from 'lucide-react';
import { devLog } from '@/lib/utils/productionLogger';

interface QuickBillingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    email: string;
  } | null;
  onSuccess?: () => void;
}

export function QuickBillingModal({ open, onOpenChange, client, onSuccess }: QuickBillingModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [billingMode, setBillingMode] = useState<'avulso' | 'pacote' | 'assinatura'>('avulso');
  const [activeBilling, setActiveBilling] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);

  // Estados para ativação de pacotes/assinaturas
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [activationDate, setActivationDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Carregar informações de billing quando o modal abre
  useEffect(() => {
    if (open && client) {
      loadBillingInfo();
      loadAvailablePackages();
      loadAvailablePlans();
    }
  }, [open, client]);

  const loadBillingInfo = async () => {
    if (!client) return;

    setLoadingBilling(true);
    try {
      const response = await fetch(`/api/admin/clients/${client.id}/billing`);
      const result = await response.json();

      if (result.success && result.data) {
        setBillingMode(result.data.billing_mode || 'avulso');

        // Se houver pacote ou assinatura ativa, carregar informações
        if (result.data.billing_mode === 'pacote') {
          const packagesResponse = await fetch(`/api/admin/clients/${client.id}/packages`);
          const packagesResult = await packagesResponse.json();
          if (packagesResult.success && packagesResult.data && packagesResult.data.length > 0) {
            const pkg = packagesResult.data[0];
            setActiveBilling({
              type: 'pacote',
              nome: pkg.nome_pacote || pkg.nome,
              projetos_inclusos: pkg.projetos_inclusos || pkg.quantidade_projetos,
              projetos_usados: pkg.projetos_usados || 0,
              projetos_restantes: (pkg.projetos_inclusos || pkg.quantidade_projetos) - (pkg.projetos_usados || 0),
              data_expiracao: pkg.data_expiracao,
            });
          }
        } else if (result.data.billing_mode === 'assinatura') {
          const subscriptionsResponse = await fetch(`/api/admin/clients/${client.id}/subscriptions`);
          const subscriptionsResult = await subscriptionsResponse.json();
          if (subscriptionsResult.success && subscriptionsResult.data && subscriptionsResult.data.length > 0) {
            const sub = subscriptionsResult.data[0];
            setActiveBilling({
              type: 'assinatura',
              nome: sub.nome_plano || sub.nome,
              projetos_mensais: sub.projetos_mensais || sub.quantidade_mensal,
              projetos_usados_mes: sub.projetos_usados_mes_atual || 0,
              projetos_restantes_mes: (sub.projetos_mensais || sub.quantidade_mensal) - (sub.projetos_usados_mes_atual || 0),
              proximo_reset: sub.proximo_reset,
              status: sub.status,
            });
          }
        }
      }
    } catch (error: any) {
      devLog.error('[QuickBillingModal] Erro ao carregar billing info:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const loadAvailablePackages = async () => {
    try {
      const response = await fetch('/api/admin/pacotes');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePackages(result.data.filter((p: any) => p.ativo));
      }
    } catch (error) {
      devLog.error('[QuickBillingModal] Erro ao carregar pacotes:', error);
    }
  };

  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/planos-assinatura');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePlans(result.data.filter((p: any) => p.ativo));
      }
    } catch (error) {
      devLog.error('[QuickBillingModal] Erro ao carregar planos:', error);
    }
  };

  const handleBillingModeChange = (newMode: 'avulso' | 'pacote' | 'assinatura') => {
    setBillingMode(newMode);
    setActiveBilling(null);
    setSelectedPackageId('');
    setSelectedPlanId('');
  };

  const handleSubmit = async () => {
    if (!client) return;

    // Validações
    if (billingMode === 'pacote' && !activeBilling && !selectedPackageId) {
      toast({
        title: 'Pacote não selecionado',
        description: 'Por favor, selecione um pacote antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    if (billingMode === 'assinatura' && !activeBilling && !selectedPlanId) {
      toast({
        title: 'Plano não selecionado',
        description: 'Por favor, selecione um plano antes de salvar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Atualizar billing_mode do cliente
      const billingResponse = await fetch(`/api/admin/clients/${client.id}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_mode: billingMode }),
      });

      const billingResult = await billingResponse.json();

      if (!billingResult.success) {
        throw new Error(billingResult.error || 'Erro ao atualizar modalidade de faturamento');
      }

      // 2. Se for pacote, ativar o pacote selecionado
      if (billingMode === 'pacote' && selectedPackageId && !activeBilling) {
        const packageResponse = await fetch('/api/admin/cliente-pacotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: client.id,
            pacote_id: selectedPackageId,
            data_ativacao: activationDate,
          }),
        });

        const packageResult = await packageResponse.json();

        if (!packageResult.success) {
          throw new Error(packageResult.error || 'Erro ao ativar pacote');
        }

        toast({
          title: 'Pacote ativado com sucesso',
          description: `O cliente ${client.name} agora possui um pacote ativo.`,
        });
      } 
      // 3. Se for assinatura, ativar o plano selecionado
      else if (billingMode === 'assinatura' && selectedPlanId && !activeBilling) {
        const subscriptionResponse = await fetch('/api/admin/cliente-assinaturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: client.id,
            plano_id: selectedPlanId,
            data_inicio: activationDate,
          }),
        });

        const subscriptionResult = await subscriptionResponse.json();

        if (!subscriptionResult.success) {
          throw new Error(subscriptionResult.error || 'Erro ao ativar assinatura');
        }

        toast({
          title: 'Assinatura ativada com sucesso',
          description: `O cliente ${client.name} agora possui uma assinatura ativa.`,
        });
      }
      // 4. Se for avulso, apenas confirmar
      else if (billingMode === 'avulso') {
        toast({
          title: 'Modalidade atualizada',
          description: `O cliente ${client.name} agora está no modo avulso.`,
        });
      }

      // Fechar modal e chamar callback de sucesso
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      devLog.error('[QuickBillingModal] Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao processar a solicitação. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Modalidade de Faturamento</DialogTitle>
          <DialogDescription>
            {client && (
              <span className="text-base">
                Configurar como <span className="font-semibold text-gray-900 dark:text-white">{client.name}</span> será cobrado pelos projetos
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seletor de Modalidade de Faturamento */}
          <div className="space-y-3">
            <Label htmlFor="billingMode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Modalidade de Faturamento
            </Label>
            <Select
              value={billingMode}
              onValueChange={handleBillingModeChange}
              disabled={loading || loadingBilling}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avulso">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Projetos Avulsos</span>
                  </div>
                </SelectItem>
                <SelectItem value="pacote">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Pacotes de Projetos</span>
                  </div>
                </SelectItem>
                <SelectItem value="assinatura">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    <span>Assinatura Mensal</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Define como este cliente será cobrado pelos projetos
            </p>
          </div>

          {/* Informações do Pacote/Assinatura Ativo */}
          {activeBilling && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                {activeBilling.type === 'pacote' ? (
                  <Package className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                ) : (
                  <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {activeBilling.nome}
                  </h4>
                  {activeBilling.type === 'pacote' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Projetos inclusos:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {activeBilling.projetos_inclusos}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Projetos usados:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {activeBilling.projetos_usados}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Projetos restantes:</span>
                          <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                            {activeBilling.projetos_restantes}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Validade:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {new Date(activeBilling.data_expiracao).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Projetos mensais:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {activeBilling.projetos_mensais}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Usados este mês:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {activeBilling.projetos_usados_mes}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Restantes este mês:</span>
                          <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                            {activeBilling.projetos_restantes_mes}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Próxima renovação:</span>
                          <span className="ml-1 font-medium text-gray-900 dark:text-white">
                            {new Date(activeBilling.proximo_reset).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            activeBilling.status === 'ativa'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                          }`}
                        >
                          {activeBilling.status === 'ativa' ? 'Ativa' : 'Pendente Renovação'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interface de seleção de pacote quando não há pacote ativo */}
          {billingMode === 'pacote' && !activeBilling && !loadingBilling && (
            <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Configurar Pacote de Projetos
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Selecione um pacote e a data de ativação. O pacote será ativado ao salvar.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Dropdown de seleção de pacote */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pacote <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedPackageId}
                    onValueChange={setSelectedPackageId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione um pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePackages.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum pacote disponível
                        </SelectItem>
                      ) : (
                        availablePackages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.nome} - {pkg.quantidade_projetos} projetos ({pkg.validade_dias} dias) - R$ {pkg.preco}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date picker para data de ativação */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Ativação <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={activationDate}
                    onChange={(e) => setActivationDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interface de seleção de assinatura quando não há assinatura ativa */}
          {billingMode === 'assinatura' && !activeBilling && !loadingBilling && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Configurar Assinatura Mensal
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Selecione um plano e a data de início. A assinatura será ativada ao salvar.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Dropdown de seleção de plano */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Plano <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={selectedPlanId}
                    onValueChange={setSelectedPlanId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum plano disponível
                        </SelectItem>
                      ) : (
                        availablePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.nome} - {plan.quantidade_mensal} projetos/mês (dia {plan.dia_renovacao}) - R$ {plan.valor_mensal}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date picker para data de início */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Data de Início <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={activationDate}
                    onChange={(e) => setActivationDate(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modo Avulso - Apenas informação */}
          {billingMode === 'avulso' && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Modalidade Avulsa
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Cada projeto será cobrado individualmente com base na sua potência (kWp).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingBilling}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

