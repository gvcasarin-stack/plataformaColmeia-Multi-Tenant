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
import { Loader2, Package, DollarSign, Calendar, Hash, Zap } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AddPackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PackageFormData {
  nome: string;
  quantidade_projetos: number;
  valor: number;
  validade_dias: number;
  potencia_maxima_kwp?: number | null;
}

export function AddPackageModal({ open, onOpenChange, onSuccess }: AddPackageModalProps) {
  const [loading, setLoading] = useState(false);
  const [potenciaIlimitada, setPotenciaIlimitada] = useState(false);
  const [potenciaOpcao, setPotenciaOpcao] = useState<string>('10');
  const [potenciaCustomizada, setPotenciaCustomizada] = useState<string>('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<PackageFormData>();

  const onSubmit = async (data: PackageFormData) => {
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

      devLog.log('[AddPackageModal] Criando pacote:', payload);

      const response = await fetch('/api/admin/pacotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.success || !response.ok) {
        throw new Error(result.error || 'Erro ao criar pacote');
      }

      toast({
        title: 'Pacote criado!',
        description: `O pacote "${data.nome}" foi criado com sucesso`,
      });

      reset();
      setPotenciaIlimitada(false);
      setPotenciaOpcao('10');
      setPotenciaCustomizada('');
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[AddPackageModal] Erro ao criar pacote:', error);
      toast({
        title: 'Erro ao criar pacote',
        description: error.message || 'Ocorreu um erro ao criar o pacote',
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
            <Package className="h-5 w-5 text-indigo-600" />
            Criar Novo Pacote
          </DialogTitle>
          <DialogDescription>
            Configure um novo pacote de projetos para seus clientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome do Pacote <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="nome"
                {...register('nome', { required: 'Nome é obrigatório' })}
                placeholder="Ex: Pacote Bronze"
                className="h-11 pl-10"
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome.message}</p>
            )}
          </div>

          {/* Quantidade de Projetos */}
          <div className="space-y-2">
            <Label htmlFor="quantidade_projetos" className="text-sm font-medium text-gray-700">
              Quantidade de Projetos <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="quantidade_projetos"
                type="number"
                min="1"
                step="1"
                {...register('quantidade_projetos', {
                  required: 'Quantidade é obrigatória',
                  min: { value: 1, message: 'Deve ser pelo menos 1 projeto' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 10"
                className="h-11 pl-10"
              />
            </div>
            {errors.quantidade_projetos && (
              <p className="text-sm text-red-600">{errors.quantidade_projetos.message}</p>
            )}
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="valor" className="text-sm font-medium text-gray-700">
              Valor do Pacote (R$) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="valor"
                type="number"
                min="0"
                step="0.01"
                {...register('valor', {
                  required: 'Valor é obrigatório',
                  min: { value: 0, message: 'Valor não pode ser negativo' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 5000.00"
                className="h-11 pl-10"
              />
            </div>
            {errors.valor && (
              <p className="text-sm text-red-600">{errors.valor.message}</p>
            )}
          </div>

          {/* Validade em Dias */}
          <div className="space-y-2">
            <Label htmlFor="validade_dias" className="text-sm font-medium text-gray-700">
              Validade (dias) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                id="validade_dias"
                type="number"
                min="1"
                step="1"
                {...register('validade_dias', {
                  required: 'Validade é obrigatória',
                  min: { value: 1, message: 'Deve ser pelo menos 1 dia' },
                  valueAsNumber: true,
                })}
                placeholder="Ex: 30"
                className="h-11 pl-10"
              />
            </div>
            <p className="text-xs text-gray-500">
              Prazo em que o cliente deve usar os projetos do pacote
            </p>
            {errors.validade_dias && (
              <p className="text-sm text-red-600">{errors.validade_dias.message}</p>
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
                : 'Limite máximo de potência permitida para cada projeto do pacote'
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
                'Criar Pacote'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
