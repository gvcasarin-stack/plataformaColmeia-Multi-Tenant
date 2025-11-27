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
import { Loader2, Package, Calendar, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PackageDefinition } from './PackagesTab';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivatePackageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
}

interface PackageFormData {
  pacote_id: string;
}

export function ActivatePackageModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: ActivatePackageModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<PackageDefinition[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageDefinition | null>(null);

  const { handleSubmit, setValue, watch, reset } = useForm<PackageFormData>();

  const pacote_id = watch('pacote_id');

  useEffect(() => {
    if (open) {
      loadAvailablePackages();
    }
  }, [open]);

  useEffect(() => {
    if (pacote_id) {
      const pkg = availablePackages.find((p) => p.id === pacote_id);
      setSelectedPackage(pkg || null);
    } else {
      setSelectedPackage(null);
    }
  }, [pacote_id, availablePackages]);

  const loadAvailablePackages = async () => {
    try {
      setLoadingPackages(true);
      const response = await fetch('/api/admin/pacotes');
      const result = await response.json();

      if (result.success && result.data) {
        // Filtrar apenas pacotes ativos
        const activePkgs = result.data.filter((pkg: PackageDefinition) => pkg.ativo);
        setAvailablePackages(activePkgs);
      } else {
        throw new Error(result.error || 'Erro ao carregar pacotes');
      }
    } catch (error: any) {
      devLog.error('[ActivatePackageModal] Erro ao carregar pacotes:', error);
      toast({
        title: 'Erro ao carregar pacotes',
        description: error.message || 'Não foi possível carregar os pacotes disponíveis',
        variant: 'destructive',
      });
    } finally {
      setLoadingPackages(false);
    }
  };

  const onSubmit = async (data: PackageFormData) => {
    if (!data.pacote_id) {
      toast({
        title: 'Pacote não selecionado',
        description: 'Por favor, selecione um pacote para ativar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      devLog.log('[ActivatePackageModal] Ativando pacote para cliente:', {
        clientId,
        pacote_id: data.pacote_id,
      });

      const response = await fetch(`/api/admin/clients/${clientId}/packages/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pacote_id: data.pacote_id }),
      });

      const result = await response.json();

      if (!result.success || !response.ok) {
        throw new Error(result.error || 'Erro ao ativar pacote');
      }

      toast({
        title: 'Pacote ativado!',
        description: `O pacote foi ativado com sucesso para ${clientName}`,
      });

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      devLog.error('[ActivatePackageModal] Erro ao ativar pacote:', error);
      toast({
        title: 'Erro ao ativar pacote',
        description: error.message || 'Ocorreu um erro ao ativar o pacote',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateExpirationDate = () => {
    if (selectedPackage) {
      const expirationDate = addDays(new Date(), selectedPackage.validade_dias);
      return format(expirationDate, 'dd/MM/yyyy', { locale: ptBR });
    }
    return '-';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-600" />
            Ativar Pacote
          </DialogTitle>
          <DialogDescription>
            Ativar um pacote de projetos para {clientName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Seleção de Pacote */}
          <div className="space-y-2">
            <Label htmlFor="pacote_id" className="text-sm font-medium text-gray-700">
              Selecionar Pacote <span className="text-red-500">*</span>
            </Label>

            {loadingPackages ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-gray-600">Carregando pacotes...</span>
              </div>
            ) : availablePackages.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Nenhum pacote disponível</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Não há pacotes ativos cadastrados. Crie um pacote primeiro em Preferências → Pacotes de Projetos.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <Select
                value={pacote_id}
                onValueChange={(value) => setValue('pacote_id', value)}
                disabled={loading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um pacote..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{pkg.nome}</span>
                        <span className="text-xs text-gray-500">
                          {pkg.quantidade_projetos} projetos • R${' '}
                          {pkg.valor.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          • {pkg.validade_dias} dias
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Resumo do Pacote Selecionado */}
          {selectedPackage && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-900/20 p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-600" />
                Resumo do Pacote
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Nome:</span>
                  <span className="font-semibold">{selectedPackage.nome}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Projetos Inclusos:</span>
                  <span className="font-semibold">{selectedPackage.quantidade_projetos}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valor:</span>
                  <span className="font-semibold">
                    R${' '}
                    {selectedPackage.valor.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Validade:</span>
                  <span className="font-semibold">{selectedPackage.validade_dias} dias</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-indigo-200">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Data de Expiração:
                  </span>
                  <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                    {calculateExpirationDate()}
                  </span>
                </div>
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
              disabled={loading || !selectedPackage || availablePackages.length === 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Ativar Pacote'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
