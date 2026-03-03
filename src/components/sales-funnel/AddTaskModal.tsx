'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface Opportunity {
  id: string;
  title: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface AddTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  opportunities: Opportunity[];
}

interface TaskFormData {
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  opportunity_id?: string;
  assigned_to?: string;
}

export function AddTaskModal({ open, onOpenChange, onSuccess, opportunities }: AddTaskModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<TaskFormData>({
    defaultValues: {
      priority: 'medium'
    }
  });

  const selectedPriority = watch('priority');

  // Buscar membros da equipe
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        setLoadingData(true);
        const response = await fetch('/api/admin/team-members');
        const data = await response.json();

        if (data.success && data.data) {
          setTeamMembers(data.data);
        }
      } catch (error) {
        devLog.error('[AddTaskModal] Erro ao buscar membros da equipe:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  // Resetar formulário quando modal fechar
  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: TaskFormData) => {
    try {
      setLoading(true);

      // Sanitizar dados: remover campos vazios e converter para null quando necessário
      const sanitizedData = {
        title: data.title,
        description: data.description || undefined,
        due_date: data.due_date || undefined, // Remove string vazia
        priority: data.priority,
        opportunity_id: data.opportunity_id || undefined,
        assigned_to: data.assigned_to || undefined,
        created_by: user?.id,
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: 'Tarefa criada com sucesso.',
        });
        onSuccess();
        onOpenChange(false);
        reset();
      } else {
        throw new Error(result.error || 'Erro ao criar tarefa');
      }
    } catch (error: any) {
      devLog.error('[AddTaskModal] Erro ao criar tarefa:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar tarefa. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const priorityConfig = {
    low: {
      label: 'Baixa',
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    medium: {
      label: 'Média',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    high: {
      label: 'Alta',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Criar Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título da Tarefa <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title', {
                required: 'Título é obrigatório',
                minLength: { value: 3, message: 'Título deve ter no mínimo 3 caracteres' }
              })}
              placeholder="Ex: Ligar para cliente, Enviar proposta, etc."
              disabled={loading}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva os detalhes da tarefa..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data de Vencimento */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Prioridade <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedPriority}
                onValueChange={(value) => setValue('priority', value as 'low' | 'medium' | 'high')}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Oportunidade Relacionada */}
          <div className="space-y-2">
            <Label htmlFor="opportunity_id">Oportunidade Relacionada (Opcional)</Label>
            <Select
              onValueChange={(value) => setValue('opportunity_id', value)}
              disabled={loading || loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma oportunidade (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {opportunities.map((opp) => (
                  <SelectItem key={opp.id} value={opp.id}>
                    {opp.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Responsável (Opcional)</Label>
            <Select
              onValueChange={(value) => setValue('assigned_to', value)}
              disabled={loading || loadingData}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Tarefa'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
