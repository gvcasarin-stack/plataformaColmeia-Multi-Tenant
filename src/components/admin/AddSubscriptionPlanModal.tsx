'use client';

import { useState } from 'react';
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
import { Loader2, CalendarCheck, DollarSign, Calendar, Hash, Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AddSubscriptionPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PlanFormData {
  nome: string;
  quantidade_mensal: number;
  valor_mensal: number;
  dia_renovacao: number;
  potencia_maxima_kwp?: number | null;
}

export function AddSubscriptionPlanModal({ open, onOpenChange, onSuccess }: AddSubscriptionPlanModalProps) {
  const [loading, setLoading] = useState(false);
  const [potenciaIlimitada, setPotenciaIlimitada] = useState(false);
  const [potenciaOpcao, setPotenciaOpcao] = useState<string>('10');
  const [potenciaCustomizada, setPotenciaCustomizada] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PlanFormData>();

  const onSubmit = async (data: PlanFormData) => {
    setLoading(true);

    try {
      // Determinar a potência máxima
      let potencia_maxima_kwp: number | null = null;

      if (!potenciaIlimitada) {
        if (potenciaOpcao === 'outro') {
          const customValue = parseFloat(potenciaCustomizada);
          if (!potenciaCustomizada || isNaN(customValue) || customValue <= 0) {
            toast({
              title: 'Erro de validação',
              description: 'Informe um valor válido para a potência customizada',
              variant: 'destructive',
            });
            setLoading(false);
            return;
          }
          potencia_maxima_kwp = customValue;
        } else {
          potencia_maxima_kwp = parseFloat(potenciaOpcao);
        }
      }

      const payload = {
        ...data,
        potencia_maxima_kwp,
      };

      devLog.log('[AddSubscriptionPlanModal] Criando plano:', payload);

      const response = await fetch('/api/admin/planos-assinatura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success || !response.ok) {
        throw new Error(result.error || 'Erro ao criar plano');
      }

      toast({
        title: 'Plano criado!',
        description: `O plano "${data.nome}" foi criado com sucesso`,
      });

      reset();
      setPotenciaIlimitada(false);
      setPotenciaOpcao('10');
      setPotenciaCustomizada('');
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[AddSubscriptionPlanModal] Erro ao criar plano:', error);
      toast({
        title: 'Erro ao criar plano',
        description: error.message || 'Ocorreu um erro ao criar o plano',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-indigo-600" />
            Criar Novo Plano de Assinatura
          </DialogTitle>
          <DialogDescription>
            Configure um novo plano de assinatura mensal para seus clientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome do Plano <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <CalendarCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="nome"
                {...register('nome', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Plano Mensal Básico"
                className="h-11 pl-10"
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome.message}</p>
            )}
          </div>

          {/* Quantidade Mensal */}
          <div className="space-y-2">
            <Label htmlFor="quantidade_mensal" className="text-sm font-medium text-gray-700">
              Projetos por Mês <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="quantidade_mensal"
                type="number"
                min="1"
                step="1"
                {...register('quantidade_mensal', {
                  required: 'Quantidade é obrigatória',
                  min: { value: 1, message: 'Deve ser pelo menos 1 projeto' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 5"
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Quantidade de projetos que o cliente pode criar por mês
            </p>
            {errors.quantidade_mensal && (
              <p className="text-sm text-red-600">{errors.quantidade_mensal.message}</p>
            )}
          </div>

          {/* Valor Mensal */}
          <div className="space-y-2">
            <Label htmlFor="valor_mensal" className="text-sm font-medium text-gray-700">
              Valor Mensal (R$) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="valor_mensal"
                type="number"
                min="0"
                step="0.01"
                {...register('valor_mensal', {
                  required: 'Valor é obrigatório',
                  min: { value: 0, message: 'Valor não pode ser negativo' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 500.00"
                className="h-11 pl-10"
              />
            </div>
            {errors.valor_mensal && (
              <p className="text-sm text-red-600">{errors.valor_mensal.message}</p>
            )}
          </div>

          {/* Dia de Renovação */}
          <div className="space-y-2">
            <Label htmlFor="dia_renovacao" className="text-sm font-medium text-gray-700">
              Dia de Renovação <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="dia_renovacao"
                type="number"
                min="1"
                max="31"
                step="1"
                {...register('dia_renovacao', {
                  required: 'Dia de renovação é obrigatório',
                  min: { value: 1, message: 'Deve ser entre 1 e 31' },
                  max: { value: 31, message: 'Deve ser entre 1 e 31' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 1"
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Dia do mês em que a assinatura será renovada (1-31)
            </p>
            {errors.dia_renovacao && (
              <p className="text-sm text-red-600">{errors.dia_renovacao.message}</p>
            )}
          </div>

          {/* Potência Máxima */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Potência Máxima por Projeto <span className="text-red-500">*</span>
            </Label>

            {/* Checkbox Ilimitado */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="potencia_ilimitada"
                checked={potenciaIlimitada}
                onCheckedChange={(checked) => setPotenciaIlimitada(checked as boolean)}
              />
              <label
                htmlFor="potencia_ilimitada"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Sem limitação de potência (Ilimitado)
              </label>
            </div>

            {/* Seleção de Potência */}
            {!potenciaIlimitada && (
              <div className="space-y-2">
                <div className="relative">
                  <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={potenciaOpcao}
                    onChange={(e) => setPotenciaOpcao(e.target.value)}
                    className="h-11 pl-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="10">Até 10 kWp</option>
                    <option value="20">Até 20 kWp</option>
                    <option value="30">Até 30 kWp</option>
                    <option value="40">Até 40 kWp</option>
                    <option value="50">Até 50 kWp</option>
                    <option value="60">Até 60 kWp</option>
                    <option value="75">Até 75 kWp</option>
                    <option value="outro">Outro valor (customizado)</option>
                  </select>
                </div>

                {/* Campo Customizado */}
                {potenciaOpcao === 'outro' && (
                  <div className="relative">
                    <Zap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={potenciaCustomizada}
                      onChange={(e) => setPotenciaCustomizada(e.target.value)}
                      placeholder="Ex: 100"
                      className="h-11 pl-10"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      kWp
                    </span>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              {potenciaIlimitada
                ? 'Clientes poderão criar projetos com qualquer potência'
                : 'Limite máximo de potência permitida para cada projeto do plano'
              }
            </p>
          </div>

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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Plano'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
