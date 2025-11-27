'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, PlusCircle, Edit, Loader2, Eye, EyeOff } from 'lucide-react';
import { AddSubscriptionPlanModal } from './AddSubscriptionPlanModal';
import { EditSubscriptionPlanModal } from './EditSubscriptionPlanModal';

export interface SubscriptionPlan {
  id: string;
  tenant_id: string;
  nome: string;
  quantidade_mensal: number;
  valor_mensal: number;
  dia_renovacao: number;
  potencia_maxima_kwp?: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function SubscriptionPlansTab() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/planos-assinatura');
      const result = await response.json();

      if (result.success && result.data) {
        setPlans(result.data);
      } else {
        throw new Error(result.error || 'Erro ao carregar planos');
      }
    } catch (error: any) {
      devLog.error('[SubscriptionPlansTab] Erro ao carregar planos:', error);
      toast({
        title: 'Erro ao carregar planos',
        description: error.message || 'Ocorreu um erro ao buscar os planos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    try {
      const response = await fetch(`/api/admin/planos-assinatura/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !plan.ativo }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: plan.ativo ? 'Plano desativado' : 'Plano ativado',
          description: `O plano "${plan.nome}" foi ${plan.ativo ? 'desativado' : 'ativado'} com sucesso`,
        });
        loadPlans();
      } else {
        throw new Error(result.error || 'Erro ao alterar status');
      }
    } catch (error: any) {
      devLog.error('[SubscriptionPlansTab] Erro ao alterar status:', error);
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredPlans = showInactive
    ? plans
    : plans.filter(plan => plan.ativo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Ocultar Inativos
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Mostrar Inativos
              </>
            )}
          </Button>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-600">Carregando planos...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {showInactive
              ? 'Nenhum plano cadastrado'
              : 'Nenhum plano ativo encontrado'}
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Criar Primeiro Plano
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead className="font-semibold">Nome do Plano</TableHead>
                <TableHead className="font-semibold">Projetos Mensais</TableHead>
                <TableHead className="font-semibold">Potência Máxima</TableHead>
                <TableHead className="font-semibold">Valor Mensal</TableHead>
                <TableHead className="font-semibold">Dia de Renovação</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id} className={!plan.ativo ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{plan.nome}</TableCell>
                  <TableCell>{plan.quantidade_mensal} projetos/mês</TableCell>
                  <TableCell>
                    {plan.potencia_maxima_kwp
                      ? `${plan.potencia_maxima_kwp} kWp`
                      : 'Ilimitado'
                    }
                  </TableCell>
                  <TableCell>
                    R$ {plan.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>Dia {plan.dia_renovacao}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.ativo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {plan.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPlan(plan)}
                        title="Editar plano"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(plan)}
                        title={plan.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {plan.ativo ? (
                          <EyeOff className="h-4 w-4 text-red-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <AddSubscriptionPlanModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={loadPlans}
      />

      <EditSubscriptionPlanModal
        open={!!editingPlan}
        onOpenChange={(open) => !open && setEditingPlan(null)}
        plan={editingPlan}
        onSuccess={loadPlans}
      />
    </div>
  );
}
