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
import { Loader2 } from 'lucide-react';

interface OpportunityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface Opportunity {
  id: string;
  title: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  lead_id: string | null;
  responsible_id: string | null;
  status_id: string;
  description: string | null;
}

interface EditOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
  onSuccess: () => void;
  statuses: OpportunityStatus[];
}

interface OpportunityFormData {
  title: string;
  estimated_value?: number;
  probability?: number;
  expected_close_date?: string;
  lead_id?: string;
  responsible_id?: string;
  status_id: string;
  description?: string;
}

export function EditOpportunityModal({ open, onOpenChange, opportunity, onSuccess, statuses }: EditOpportunityModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<OpportunityFormData>({
    defaultValues: {
      probability: 50,
      status_id: statuses[0]?.id || ''
    }
  });

  const selectedLeadId = watch('lead_id');
  const selectedResponsibleId = watch('responsible_id');
  const selectedStatusId = watch('status_id');

  // Carregar dados quando abrir o modal
  useEffect(() => {
    if (open && opportunity) {
      loadData();
      populateForm();
    }
  }, [open, opportunity]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Buscar leads
      const leadsRes = await fetch('/api/leads');
      const leadsData = await leadsRes.json();
      if (leadsData.success) {
        setLeads(leadsData.data || []);
      }

      // Buscar membros da equipe
      const teamRes = await fetch('/api/admin/team-members');
      const teamData = await teamRes.json();
      if (teamData.success) {
        setTeamMembers(teamData.data || []);
      }

    } catch (error) {
      devLog.error('[EditOpportunityModal] Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const populateForm = () => {
    if (!opportunity) return;

    setValue('title', opportunity.title);
    setValue('estimated_value', opportunity.estimated_value || undefined);
    setValue('probability', opportunity.probability);
    setValue('status_id', opportunity.status_id);
    setValue('lead_id', opportunity.lead_id || undefined);
    setValue('responsible_id', opportunity.responsible_id || undefined);
    setValue('description', opportunity.description || undefined);

    // Formatar data para input type="date" (YYYY-MM-DD)
    if (opportunity.expected_close_date) {
      const date = new Date(opportunity.expected_close_date);
      const formattedDate = date.toISOString().split('T')[0];
      setValue('expected_close_date', formattedDate);
    }
  };

  const onSubmit = async (data: OpportunityFormData) => {
    if (!opportunity) return;
    setLoading(true);

    try {
      devLog.log('[EditOpportunityModal] Atualizando oportunidade:', opportunity.id);

      // Preparar payload
      const updatePayload: any = {
        userId: user?.id,
        title: data.title,
        estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
        probability: data.probability ? Number(data.probability) : 50,
        status_id: data.status_id,
        lead_id: data.lead_id || null,
        responsible_id: data.responsible_id || null,
        description: data.description || null,
      };

      // Adicionar data apenas se tiver valor válido
      if (data.expected_close_date && data.expected_close_date.trim() !== '') {
        updatePayload.expected_close_date = data.expected_close_date;
      }

      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar oportunidade');
      }

      toast({
        title: 'Oportunidade atualizada!',
        description: 'As alterações foram salvas com sucesso',
      });

      reset();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[EditOpportunityModal] Erro ao atualizar oportunidade:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Editar Oportunidade
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">
              Título do Negócio <span className="text-red-500">*</span>
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

          {/* Lead Associado */}
          <div className="space-y-2">
            <Label htmlFor="lead_id" className="text-sm font-medium text-gray-700">
              Lead Associado
            </Label>
            {loadingData ? (
              <div className="flex items-center justify-center h-11 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select
                value={selectedLeadId || 'none'}
                onValueChange={(value) => setValue('lead_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um lead (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum lead</SelectItem>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.company || lead.name} {lead.email && `(${lead.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="responsible_id" className="text-sm font-medium text-gray-700">
              Responsável
            </Label>
            {loadingData ? (
              <div className="flex items-center justify-center h-11 border rounded-md">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            ) : (
              <Select
                value={selectedResponsibleId || 'none'}
                onValueChange={(value) => setValue('responsible_id', value === 'none' ? '' : value)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione um responsável (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Status (Coluna) */}
          <div className="space-y-2">
            <Label htmlFor="status_id" className="text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedStatusId}
              onValueChange={(value) => setValue('status_id', value)}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione o status" />
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
