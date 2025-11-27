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
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Loader2, CalendarCheck, Calendar, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubscriptionPlan } from './SubscriptionPlansTab';
import { addMonths, setDate, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivateSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
}

interface SubscriptionFormData {
  plano_id: string;
}

export function ActivateSubscriptionModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: ActivateSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const { handleSubmit, setValue, watch, reset } = useForm<SubscriptionFormData>();

  const plano_id = watch('plano_id');

  useEffect(() => {
    if (open) {
      loadAvailablePlans();
    }
  }, [open]);

  useEffect(() => {
    if (plano_id) {
      const plan = availablePlans.find((p) => p.id === plano_id);
      setSelectedPlan(plan || null);
    } else {
      setSelectedPlan(null);
    }
  }, [plano_id, availablePlans]);

  const loadAvailablePlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await fetch('/api/admin/planos-assinatura');
      const result = await response.json();

      if (result.success && result.data) {
        // Filtrar apenas planos ativos
        const activePlans = result.data.filter((plan: SubscriptionPlan) => plan.ativo);
        setAvailablePlans(activePlans);
      } else {
        throw new Error(result.error || 'Erro ao carregar planos');
      }
    } catch (error: any) {
      devLog.error('[ActivateSubscriptionModal] Erro ao carregar planos:', error);
      toast({
        title: 'Erro ao carregar planos',
        description: error.message || 'Não foi possível carregar os planos disponíveis',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  const onSubmit = async (data: SubscriptionFormData) => {
    if (!data.plano_id) {
      toast({
        title: 'Plano não selecionado',
        description: 'Por favor, selecione um plano para ativar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      devLog.log('[ActivateSubscriptionModal] Ativando assinatura para cliente:', {
        clientId,
        plano_id: data.plano_id,
      });

      const response = await fetch(`/api/admin/clients/${clientId}/subscriptions/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plano_id: data.plano_id }),
      });

      const result = await response.json();

      if (!result.success || !response.ok) {
        throw new Error(result.error || 'Erro ao ativar assinatura');
      }

      toast({
        title: 'Assinatura ativada!',
        description: `A assinatura foi ativada com sucesso para ${clientName}`,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      devLog.error('[ActivateSubscriptionModal] Erro ao ativar assinatura:', error);
      toast({
        title: 'Erro ao ativar assinatura',
        description: error.message || 'Ocorreu um erro ao ativar a assinatura',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNextReset = () => {
    if (selectedPlan) {
      const today = new Date();
      let nextResetDate = setDate(today, selectedPlan.dia_renovacao);

      // Se o dia de renovação já passou neste mês, calcular para o próximo mês
      if (nextResetDate <= today) {
        nextResetDate = addMonths(nextResetDate, 1);
      }

      return format(nextResetDate, 'dd/MM/yyyy', { locale: ptBR });
    }
    return '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-indigo-600" />
            Ativar Assinatura
          </DialogTitle>
          <DialogDescription>
            Ativar uma assinatura mensal para {clientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Seleção de Plano */}
          <div className="space-y-2">
            <Label htmlFor="plano_id" className="text-sm font-medium text-gray-700">
              Selecionar Plano <span className="text-red-500">*</span>
            </Label>

            {loadingPlans ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-gray-600">Carregando planos...</span>
              </div>
            ) : availablePlans.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Nenhum plano disponível</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Não há planos ativos cadastrados. Crie um plano primeiro em Preferências → Planos de Assinatura.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Select
                value={plano_id}
                onValueChange={(value) => setValue('plano_id', value)}
                disabled={loading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um plano..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{plan.nome}</span>
                        <span className="text-xs text-gray-500">
                          {plan.quantidade_mensal} projetos/mês • R${' '}
                          {plan.valor_mensal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          • Renova dia {plan.dia_renovacao}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Resumo do Plano Selecionado */}
          {selectedPlan && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-600" />
                Resumo do Plano
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                  <span className="font-semibold">{selectedPlan.nome}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Projetos Mensais:</span>
                  <span className="font-semibold">{selectedPlan.quantidade_mensal}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valor Mensal:</span>
                  <span className="font-semibold">
                    R${' '}
                    {selectedPlan.valor_mensal.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dia de Renovação:</span>
                  <span className="font-semibold">Dia {selectedPlan.dia_renovacao}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-indigo-200">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Próxima Renovação:
                  </span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    {calculateNextReset()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  ℹ️ Os projetos serão renovados automaticamente todo dia {selectedPlan.dia_renovacao} de cada mês.
                </p>
              </div>
            </div>
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={loading || !selectedPlan || availablePlans.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Ativar Assinatura'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
