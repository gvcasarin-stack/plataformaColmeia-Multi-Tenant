'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/hooks/useAuth';
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
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  estimated_value?: number;
  estimated_power?: number;
  responsible_id?: string;
  responsible?: {
    id: string;
    full_name?: string;
  };
}

interface OpportunityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface ConvertLeadToOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess: () => void;
}

interface OpportunityFormData {
  title: string;
  estimated_value?: number;
  probability?: number;
  expected_close_date?: string;
  description?: string;
  status_id: string;
}

export function ConvertLeadToOpportunityModal({
  open,
  onOpenChange,
  lead,
  onSuccess
}: ConvertLeadToOpportunityModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statuses, setStatuses] = useState<OpportunityStatus[]>([]);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<OpportunityFormData>({
    defaultValues: {
      probability: 50,
    }
  });

  const selectedStatusId = watch('status_id');

  // Carregar status de oportunidades
  useEffect(() => {
    if (open) {
      loadStatuses();
    }
  }, [open]);

  // Pré-preencher formulário quando o lead mudar
  useEffect(() => {
    if (open && lead) {
      // Título sugerido
      const suggestedTitle = lead.company
        ? `${lead.company} - ${lead.name}`
        : `Projeto ${lead.name}`;

      setValue('title', suggestedTitle);
      setValue('estimated_value', lead.estimated_value || undefined);
      setValue('probability', 50);

      // Descrição com informações do lead
      let description = `Lead convertido: ${lead.name}\n`;
      if (lead.email) description += `Email: ${lead.email}\n`;
      if (lead.phone) description += `Telefone: ${lead.phone}\n`;
      if (lead.estimated_power) description += `Potência estimada: ${lead.estimated_power} kWp\n`;

      setValue('description', description);

      // Selecionar primeiro status (geralmente "Novo Lead" ou "Qualificação")
      if (statuses.length > 0) {
        setValue('status_id', statuses[0].id);
      }
    }
  }, [open, lead, statuses, setValue]);

  const loadStatuses = async () => {
    setLoadingStatuses(true);
    try {
      const response = await fetch('/api/opportunity-statuses');
      const data = await response.json();

      if (data.success) {
        setStatuses(data.data || []);
      }
    } catch (error) {
      devLog.error('[ConvertLeadModal] Erro ao carregar status:', error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const onSubmit = async (data: OpportunityFormData) => {
    if (!lead || !user) return;

    setLoading(true);

    try {
      devLog.log('[ConvertLeadModal] Convertendo lead em oportunidade:', lead.id);

      // Preparar dados da oportunidade
      const opportunityPayload: any = {
        userId: user.id,
        title: data.title,
        lead_id: lead.id,
        responsible_id: lead.responsible_id || null,
        estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
        probability: data.probability ? Number(data.probability) : 50,
        status_id: data.status_id,
        description: data.description || null,
      };

      // Adicionar data apenas se tiver valor válido
      if (data.expected_close_date && data.expected_close_date.trim() !== '') {
        opportunityPayload.expected_close_date = data.expected_close_date;
      }

      // Criar oportunidade
      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityPayload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar oportunidade');
      }

      // Atualizar lead para marcar como convertido
      const updateResponse = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'ganho',
          converted_at: new Date().toISOString(),
          converted_to_project_id: result.data.id,
        }),
      });

      if (!updateResponse.ok) {
        devLog.warn('[ConvertLeadModal] Erro ao atualizar lead, mas oportunidade foi criada');
      }

      toast({
        title: 'Lead convertido com sucesso!',
        description: `A oportunidade "${data.title}" foi criada no funil de vendas`,
      });

      reset();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[ConvertLeadModal] Erro ao converter lead:', error);
      toast({
        title: 'Erro ao converter lead',
        description: error.message || 'Ocorreu um erro ao criar a oportunidade',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-green-600" />
            Converter Lead em Oportunidade
          </DialogTitle>
          <DialogDescription>
            Crie uma oportunidade no funil de vendas a partir deste lead. Os dados serão preenchidos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Preview do Lead */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{lead.name}</p>
                <div className="text-sm text-gray-600 space-y-1 mt-1">
                  {lead.company && <p>Empresa: {lead.company}</p>}
                  {lead.email && <p>Email: {lead.email}</p>}
                  {lead.phone && <p>Telefone: {lead.phone}</p>}
                  {lead.estimated_value && (
                    <p>Valor estimado: R$ {lead.estimated_value.toLocaleString('pt-BR')}</p>
                  )}
                  {lead.responsible?.full_name && (
                    <p>Responsável: {lead.responsible.full_name}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Título da Oportunidade <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              {...register('title', { required: 'Título é obrigatório' })}
              placeholder="Ex: Instalação Sistema Solar 10kWp"
              className="h-11"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          {/* Valor Estimado e Probabilidade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_value" className="text-sm font-medium text-gray-700">
                Valor Estimado (R$)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm font-medium pointer-events-none">
                  R$
                </span>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  {...register('estimated_value', { valueAsNumber: true, min: 0 })}
                  placeholder="Ex: 50000.00"
                  className="h-11 pl-14 pr-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability" className="text-sm font-medium text-gray-700">
                Probabilidade (%)
              </Label>
              <div className="relative">
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  {...register('probability', { valueAsNumber: true, min: 0, max: 100 })}
                  placeholder="50"
                  className="h-11 pr-10"
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm font-medium pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Status (Coluna) */}
          <div className="space-y-2">
            <Label htmlFor="status_id" className="text-sm font-medium text-gray-700">
              Status Inicial <span className="text-red-500">*</span>
            </Label>
            {loadingStatuses ? (
              <div className="flex items-center justify-center h-11 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select
                value={selectedStatusId}
                onValueChange={(value) => setValue('status_id', value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o status inicial" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Data Prevista de Fechamento */}
          <div className="space-y-2">
            <Label htmlFor="expected_close_date" className="text-sm font-medium text-gray-700">
              Data Prevista de Fechamento
            </Label>
            <Input
              id="expected_close_date"
              type="date"
              {...register('expected_close_date')}
              className="h-11"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Descrição / Observações
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Adicione detalhes sobre a oportunidade..."
              rows={4}
              className="resize-none"
            />
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
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={loading || loadingStatuses}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Convertendo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Converter em Oportunidade
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
