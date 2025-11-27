'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Loader2 } from 'lucide-react';

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ColumnFormData {
  name: string;
  color: string;
}

export function AddColumnDialog({ open, onOpenChange, onSuccess }: AddColumnDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ColumnFormData>({
    defaultValues: {
      color: '#3B82F6'
    }
  });

  const onSubmit = async (data: ColumnFormData) => {
    setLoading(true);

    try {
      devLog.log('[AddColumnDialog] Criando coluna:', data);

      const response = await fetch('/api/opportunity-statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ...data
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar coluna');
      }

      toast({
        title: 'Coluna criada!',
        description: 'A nova coluna foi criada com sucesso',
      });

      reset();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[AddColumnDialog] Erro ao criar coluna:', error);
      toast({
        title: 'Erro ao criar coluna',
        description: error.message || 'Ocorreu um erro ao criar a coluna',
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
          <DialogTitle className="text-xl font-bold text-gray-900">
            Adicionar Nova Coluna
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nome da Coluna <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              {...register('name', { required: 'Nome é obrigatório' })}
              placeholder="Ex: Em Análise"
              className="h-11"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label htmlFor="color" className="text-sm font-medium text-gray-700">
              Cor
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="color"
                type="color"
                {...register('color')}
                className="h-11 w-20 cursor-pointer"
              />
              <Input
                type="text"
                {...register('color')}
                placeholder="#3B82F6"
                className="h-11 flex-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              Escolha uma cor para identificar esta coluna no Kanban
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
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Adicionar Coluna'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
