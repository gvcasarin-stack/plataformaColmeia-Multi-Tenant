'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Loader2, User, Mail, Phone, Building, FileText, Package, CalendarCheck, DollarSign, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Client } from '@/hooks/useClients';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EditClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess: () => void;
}

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  isCompany: boolean;
  companyName?: string;
  cpf?: string;
  cnpj?: string;
}

export function EditClientModal({ open, onOpenChange, client, onSuccess }: EditClientModalProps) {
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

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<ClientFormData>({
    defaultValues: {
      isCompany: false,
    }
  });

  const isCompany = watch('isCompany');

  // Pré-preencher formulário quando o client mudar
  useEffect(() => {
    if (open && client) {
      setValue('name', client.name || '');
      setValue('email', client.email || '');
      setValue('phone', client.phone || '');
      setValue('isCompany', client.isCompany || false);
      setValue('companyName', client.razaoSocial || '');
      setValue('cpf', client.cpf || '');
      setValue('cnpj', client.cnpj || '');

      // Carregar informações de billing
      loadBillingInfo();
    }
  }, [open, client, setValue]);

  const loadBillingInfo = async () => {
    if (!client) return;

    try {
      setLoadingBilling(true);
      const response = await fetch(`/api/admin/clients/${client.id}/billing`);
      const result = await response.json();

      if (result.success && result.data) {
        setBillingMode(result.data.billing_mode || 'avulso');
        setActiveBilling(result.data.active_billing);
      }
    } catch (error: any) {
      devLog.error('[EditClientModal] Erro ao carregar billing info:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  // Carregar pacotes disponíveis
  const loadAvailablePackages = async () => {
    try {
      const response = await fetch('/api/admin/pacotes');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePackages(result.data.filter((p: any) => p.ativo));
      }
    } catch (error: any) {
      devLog.error('[EditClientModal] Erro ao carregar pacotes:', error);
    }
  };

  // Carregar planos de assinatura disponíveis
  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/planos-assinatura');
      const result = await response.json();
      if (result.success && result.data) {
        setAvailablePlans(result.data.filter((p: any) => p.ativo));
      }
    } catch (error: any) {
      devLog.error('[EditClientModal] Erro ao carregar planos:', error);
    }
  };

  const handleBillingModeChange = (newMode: 'avulso' | 'pacote' | 'assinatura') => {
    setBillingMode(newMode);
    setActiveBilling(null); // Limpar billing ativo ao trocar modalidade

    // Carregar pacotes/planos disponíveis se necessário
    if (newMode === 'pacote' && availablePackages.length === 0) {
      loadAvailablePackages();
    }
    if (newMode === 'assinatura' && availablePlans.length === 0) {
      loadAvailablePlans();
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    if (!client) return;
    setLoading(true);

    try {
      devLog.log('[EditClientModal] Atualizando cliente:', client.id);

      // VALIDAÇÃO: Verificar se está tentando mudar para avulso com pacote/assinatura ativo
      if (billingMode === 'avulso' && client.billingMode !== 'avulso') {
        // Buscar informações atualizadas de billing
        const checkResponse = await fetch(`/api/admin/clients/${client.id}/billing-info`);
        const checkResult = await checkResponse.json();

        if (checkResult.success) {
          // Verificar se tem pacote ativo
          if (checkResult.data.package) {
            const pkg = checkResult.data.package;
            const projetosRestantes = pkg.projetos_inclusos - pkg.projetos_usados;

            toast({
              title: 'Não é possível mudar para Avulso',
              description: `Este cliente possui um pacote ativo (${pkg.nome_pacote}) com ${projetosRestantes} projetos restantes. Cancele o pacote na aba "Assinaturas" primeiro.`,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }

          // Verificar se tem assinatura ativa
          if (checkResult.data.subscription) {
            const sub = checkResult.data.subscription;
            const projetosRestantes = sub.projetos_mensais - sub.projetos_usados_mes_atual;

            toast({
              title: 'Não é possível mudar para Avulso',
              description: `Este cliente possui uma assinatura ativa (${sub.nome_plano}) com ${projetosRestantes} projetos restantes este mês. Cancele a assinatura na aba "Assinaturas" primeiro.`,
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
        }
      }

      // VALIDAÇÃO: Se mudando para pacote, deve ter pacote selecionado
      if (billingMode === 'pacote' && !activeBilling && !selectedPackageId) {
        toast({
          title: 'Selecione um pacote',
          description: 'Para mudar para modalidade Pacote, você precisa selecionar um pacote e definir a data de ativação.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // VALIDAÇÃO: Se mudando para assinatura, deve ter plano selecionado
      if (billingMode === 'assinatura' && !activeBilling && !selectedPlanId) {
        toast({
          title: 'Selecione um plano',
          description: 'Para mudar para modalidade Assinatura, você precisa selecionar um plano e definir a data de início.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Preparar payload
      const updatePayload: any = {
        name: data.name,
        phone: data.phone,
        isCompany: data.isCompany,
      };

      // Adicionar campos condicionais
      if (data.isCompany) {
        updatePayload.companyName = data.companyName || '';
        updatePayload.cnpj = data.cnpj || '';
        updatePayload.cpf = null;
      } else {
        updatePayload.cpf = data.cpf || '';
        updatePayload.companyName = null;
        updatePayload.cnpj = null;
      }

      // 1. Atualizar dados básicos do cliente
      const response = await fetch('/api/user/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: client.id,
          ...updatePayload,
        }),
      });

      const result = await response.json();

      if (!result.success && !response.ok) {
        throw new Error(result.error || 'Erro ao atualizar cliente');
      }

      // 2. Atualizar billing mode
      const billingResponse = await fetch(`/api/admin/clients/${client.id}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_mode: billingMode }),
      });

      const billingResult = await billingResponse.json();

      if (!billingResult.success) {
        throw new Error(billingResult.error || 'Erro ao atualizar modalidade de faturamento');
      }

      // 3. Se pacote selecionado E não tem pacote ativo, ativar pacote
      if (billingMode === 'pacote' && selectedPackageId && !activeBilling) {
        const activatePackageResponse = await fetch('/api/admin/cliente-pacotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: client.id,
            pacote_id: selectedPackageId,
            data_ativacao: activationDate,
          }),
        });

        const activatePackageResult = await activatePackageResponse.json();

        if (!activatePackageResult.success) {
          throw new Error(activatePackageResult.error || 'Erro ao ativar pacote');
        }

        devLog.log('[EditClientModal] Pacote ativado com sucesso');
      }

      // 4. Se assinatura selecionada E não tem assinatura ativa, ativar assinatura
      if (billingMode === 'assinatura' && selectedPlanId && !activeBilling) {
        const activateSubscriptionResponse = await fetch('/api/admin/cliente-assinaturas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: client.id,
            plano_id: selectedPlanId,
            data_inicio: activationDate,
          }),
        });

        const activateSubscriptionResult = await activateSubscriptionResponse.json();

        if (!activateSubscriptionResult.success) {
          throw new Error(activateSubscriptionResult.error || 'Erro ao ativar assinatura');
        }

        devLog.log('[EditClientModal] Assinatura ativada com sucesso');
      }

      toast({
        title: 'Cliente atualizado!',
        description: 'As informações do cliente foram salvas com sucesso',
      });

      reset();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[EditClientModal] Erro ao atualizar cliente:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Editar Cliente
          </DialogTitle>
          <DialogDescription>
            Atualize as informações do cliente. As alterações serão sincronizadas automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="name"
                {...register('name', { required: 'Nome é obrigatório' })}
                placeholder="Ex: João Silva"
                className="h-11 pl-10"
              />
            </div>
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Email (desabilitado) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="email"
                {...register('email')}
                disabled
                className="h-11 pl-10 bg-gray-100 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-500">Email não pode ser alterado</p>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Telefone <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="phone"
                {...register('phone', { required: 'Telefone é obrigatório' })}
                placeholder="(00) 00000-0000"
                className="h-11 pl-10"
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Modalidade de Faturamento */}
          <div className="space-y-2">
            <Label htmlFor="billingMode" className="text-sm font-medium text-gray-700">
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
            <p className="text-xs text-gray-500">
              Define como este cliente será cobrado pelos projetos
            </p>
          </div>

          {/* Informações do Pacote/Assinatura Ativo */}
          {activeBilling && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                {activeBilling.type === 'pacote' ? (
                  <Package className="h-5 w-5 text-blue-600 mt-0.5" />
                ) : (
                  <CalendarCheck className="h-5 w-5 text-blue-600 mt-0.5" />
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
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
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
            <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-purple-600 mt-0.5" />
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
                  <Label className="text-sm font-medium text-gray-700">
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
                            {pkg.nome} - {pkg.quantidade_projetos} projetos ({pkg.validade_dias} dias)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date picker para data de ativação */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
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
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarCheck className="h-5 w-5 text-blue-600 mt-0.5" />
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
                  <Label className="text-sm font-medium text-gray-700">
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
                            {plan.nome} - {plan.quantidade_mensal} projetos/mês (dia {plan.dia_renovacao})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date picker para data de início */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
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

          {/* Tipo de Pessoa */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="isCompany" className="text-sm font-medium text-gray-700">
                Pessoa Jurídica (Empresa)
              </Label>
              <Switch
                id="isCompany"
                checked={isCompany}
                onCheckedChange={(checked) => setValue('isCompany', checked)}
              />
            </div>
            <p className="text-xs text-gray-500">
              {isCompany ? 'Cadastro como empresa (CNPJ)' : 'Cadastro como pessoa física (CPF)'}
            </p>
          </div>

          {/* Campos condicionais baseados em isCompany */}
          {isCompany ? (
            <>
              {/* Razão Social */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                  Razão Social
                </Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="companyName"
                    {...register('companyName')}
                    placeholder="Nome da Empresa Ltda"
                    className="h-11 pl-10"
                  />
                </div>
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="text-sm font-medium text-gray-700">
                  CNPJ
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="cnpj"
                    {...register('cnpj')}
                    placeholder="00.000.000/0000-00"
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* CPF */}
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-sm font-medium text-gray-700">
                  CPF
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="cpf"
                    {...register('cpf')}
                    placeholder="000.000.000-00"
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
