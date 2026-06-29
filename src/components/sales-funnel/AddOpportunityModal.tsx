'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/lib/hooks/useAuth';
import { createTenantHeaders } from '@/lib/utils/tenant-helper';
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

interface AddOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function AddOpportunityModal({ open, onOpenChange, onSuccess, statuses }: AddOpportunityModalProps) {
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

  // Carregar leads e membros da equipe quando abrir o modal
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      // Buscar leads
      const leadsRes = await fetch('/api/leads');
      const leadsData = await leadsRes.json();
      if (leadsData.success) {
        setLeads(leadsData.data || []);
      }

      // Buscar membros da equipe (colaboradores)
      const tenantHeaders = await createTenantHeaders(user?.id || '')
      const teamRes = await fetch('/api/admin/team-members', { headers: tenantHeaders });
      const teamData = await teamRes.json();
      if (teamData.success) {
        setTeamMembers(teamData.data || []);
      }

    } catch (error) {
      devLog.error('[AddOpportunityModal] Erro ao carregar dados:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data: OpportunityFormData) => {
    setLoading(true);

    try {
      devLog.log('[AddOpportunityModal] Criando oportunidade:', data);

      const response = await fetch('/api/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          ...data,
          // Limpar campos vazios
          lead_id: data.lead_id || null,
          responsible_id: data.responsible_id || null,
          estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
          probability: data.probability ? Number(data.probability) : 50,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar oportunidade');
      }

      toast({
        title: 'Oportunidade criada!',
        description: 'A oportunidade foi criada com sucesso',
      });

      reset();
      onOpenChange(false);
      onSuccess();

    } catch (error: any) {
      devLog.error('[AddOpportunityModal] Erro ao criar oportunidade:', error);
      toast({
        title: 'Erro ao criar oportunidade',
        description: error.message || 'Ocorreu um erro ao criar a oportunidade',
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
          <DialogTitle className="text-xl font-bold text-gray-900">
            Nova Oportunidade
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
                value={selectedLeadId || undefined}
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
                value={selectedResponsibleId || undefined}
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
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Adicionar Oportunidade'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
