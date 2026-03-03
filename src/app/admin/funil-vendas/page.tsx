'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Filter, TrendingUp, DollarSign, Target, TrendingDown } from 'lucide-react';
import { SalesFunnelKanban } from '@/components/sales-funnel/SalesFunnelKanban';
import { AddOpportunityModal } from '@/components/sales-funnel/AddOpportunityModal';
import { AddTaskModal } from '@/components/sales-funnel/AddTaskModal';
import { AddColumnDialog } from '@/components/sales-funnel/AddColumnDialog';
import { SalesFunnelFilters, SalesFunnelFilterOptions } from '@/components/sales-funnel/SalesFunnelFilters';
import { PipelineMetricsCards } from '@/components/sales-funnel/PipelineMetricsCards';
import { PipelineFunnelView } from '@/components/sales-funnel/PipelineFunnelView';
import { NextActionsCard } from '@/components/sales-funnel/NextActionsCard';
import { TopOpportunitiesCard } from '@/components/sales-funnel/TopOpportunitiesCard';
import { PipelineTrendCard } from '@/components/sales-funnel/PipelineTrendCard';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';

interface OpportunityStatus {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  is_final: boolean;
  is_default: boolean;
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
  position: number;
  description: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  } | null;
  responsible?: {
    id: string;
    name: string;
    email: string;
  } | null;
  status?: OpportunityStatus;
}

export default function SalesFunnelPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'oportunidades' | 'funil'>('oportunidades');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [statuses, setStatuses] = useState<OpportunityStatus[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filters, setFilters] = useState<SalesFunnelFilterOptions>({});

  // Buscar status, oportunidades e leads
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Buscar status
        const statusRes = await fetch('/api/opportunity-statuses');
        const statusData = await statusRes.json();

        if (statusData.success) {
          setStatuses(statusData.data || []);

          // Se não houver status, criar os padrões
          if (!statusData.data || statusData.data.length === 0) {
            devLog.log('[SalesFunnel] Nenhum status encontrado, criando padrões...');
            await createDefaultStatuses();
            return; // Vai recarregar depois
          }
        }

        // Buscar oportunidades
        const oppRes = await fetch('/api/opportunities');
        const oppData = await oppRes.json();

        if (oppData.success) {
          setOpportunities(oppData.data || []);
        }

        // Buscar leads
        const leadsRes = await fetch('/api/leads');
        const leadsData = await leadsRes.json();

        if (leadsData.success) {
          setLeads(leadsData.data || []);
        }

        // Buscar tarefas
        const tasksRes = await fetch('/api/tasks');
        const tasksData = await tasksRes.json();

        if (tasksData.success) {
          setTasks(tasksData.data || []);
        }

      } catch (error) {
        devLog.error('[SalesFunnel] Erro ao carregar dados:', error);
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar o funil de vendas',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user, refreshTrigger]);

  // Criar status padrão (primeira vez)
  const createDefaultStatuses = async () => {
    try {
      const defaultStatuses = [
        { name: 'Novo Lead', color: '#10B981', position: 0 },
        { name: 'Qualificação', color: '#3B82F6', position: 1 },
        { name: 'Proposta Enviada', color: '#8B5CF6', position: 2 },
        { name: 'Negociação', color: '#F59E0B', position: 3 },
        { name: 'Ganho', color: '#22C55E', position: 4 },
        { name: 'Perdido', color: '#EF4444', position: 5 }
      ];

      const promises = defaultStatuses.map(status =>
        fetch('/api/opportunity-statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, ...status })
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Status criados!',
        description: 'Colunas padrão do funil foram criadas com sucesso'
      });

      // Recarregar
      setRefreshTrigger(prev => prev + 1);

    } catch (error) {
      devLog.error('[SalesFunnel] Erro ao criar status padrão:', error);
    }
  };

  const handleAddOpportunity = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAddTask = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId, completed }),
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar a lista de tarefas localmente
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, completed } : task
          )
        );

        toast({
          title: completed ? 'Tarefa concluída!' : 'Tarefa reaberta',
          description: completed ? 'A tarefa foi marcada como concluída.' : 'A tarefa foi reaberta.',
        });
      } else {
        throw new Error(result.error || 'Erro ao atualizar tarefa');
      }
    } catch (error: any) {
      devLog.error('[SalesFunnel] Erro ao atualizar tarefa:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a tarefa.',
        variant: 'destructive',
      });
    }
  };

  // Aplicar filtros
  const handleApplyFilters = (newFilters: SalesFunnelFilterOptions) => {
    devLog.log('[SalesFunnel] Aplicando filtros:', newFilters);
    setFilters(newFilters);
  };

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.responsibleId) count++;
    if (filters.minValue !== undefined || filters.maxValue !== undefined) count++;
    if (filters.minProbability !== undefined || filters.maxProbability !== undefined) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.hasLead !== undefined) count++;
    return count;
  }, [filters]);

  // Filtrar oportunidades
  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Filtro por responsável
    if (filters.responsibleId && filters.responsibleId !== 'all') {
      filtered = filtered.filter(opp => opp.responsible_id === filters.responsibleId);
    }

    // Filtro por valor mínimo
    if (filters.minValue !== undefined) {
      filtered = filtered.filter(opp =>
        opp.estimated_value !== null && opp.estimated_value >= filters.minValue!
      );
    }

    // Filtro por valor máximo
    if (filters.maxValue !== undefined) {
      filtered = filtered.filter(opp =>
        opp.estimated_value !== null && opp.estimated_value <= filters.maxValue!
      );
    }

    // Filtro por probabilidade mínima
    if (filters.minProbability !== undefined) {
      filtered = filtered.filter(opp => opp.probability >= filters.minProbability!);
    }

    // Filtro por probabilidade máxima
    if (filters.maxProbability !== undefined) {
      filtered = filtered.filter(opp => opp.probability <= filters.maxProbability!);
    }

    // Filtro por data inicial
    if (filters.dateFrom) {
      filtered = filtered.filter(opp => {
        if (!opp.expected_close_date) return false;
        return new Date(opp.expected_close_date) >= new Date(filters.dateFrom!);
      });
    }

    // Filtro por data final
    if (filters.dateTo) {
      filtered = filtered.filter(opp => {
        if (!opp.expected_close_date) return false;
        return new Date(opp.expected_close_date) <= new Date(filters.dateTo!);
      });
    }

    // Filtro por vinculação com lead
    if (filters.hasLead !== undefined) {
      filtered = filtered.filter(opp => {
        if (filters.hasLead) {
          return opp.lead_id !== null;
        } else {
          return opp.lead_id === null;
        }
      });
    }

    devLog.log('[SalesFunnel] Oportunidades filtradas:', {
      total: opportunities.length,
      filtered: filtered.length,
      activeFilters: activeFiltersCount
    });

    return filtered;
  }, [opportunities, filters, activeFiltersCount]);

  // Calcular métricas para o dashboard
  const dashboardMetrics = useMemo(() => {
    // Total de leads
    const totalLeads = leads.length;

    // Oportunidades ativas (não finalizadas)
    const activeOpportunities = filteredOpportunities.filter(
      opp => !opp.status?.is_final
    ).length;

    // Valor total no pipeline (apenas oportunidades ativas)
    const totalValue = filteredOpportunities
      .filter(opp => !opp.status?.is_final)
      .reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

    return {
      totalLeads,
      activeOpportunities,
      totalValue
    };
  }, [leads, filteredOpportunities]);

  if (loading && statuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando funil de vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-violet-600 text-white p-6 shadow-lg rounded-lg mt-2 mr-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Pipeline</h1>
            <p className="text-sm opacity-90">
              Gerencie suas oportunidades e acompanhe o pipeline de vendas
            </p>
          </div>

          {/* Botões condicionais baseados na tab ativa */}
          <div className="flex items-center gap-3">
            {activeTab === 'oportunidades' ? (
              <>
                <Button
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 relative"
                  onClick={() => setIsFiltersOpen(true)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => setIsAddColumnOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Coluna
                </Button>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Oportunidade
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsAddTaskModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Tarefa
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="mt-6 mr-6">
        <nav className="flex space-x-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('oportunidades')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'oportunidades'
                ? 'bg-violet-600 text-white shadow-md hover:bg-violet-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Oportunidades
          </button>
          <button
            onClick={() => setActiveTab('funil')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'funil'
                ? 'bg-violet-600 text-white shadow-md hover:bg-violet-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Funil de Vendas
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-grow bg-white dark:bg-gray-800 shadow-xl rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 mt-6 mr-6">

        {/* Tab: Oportunidades (Kanban View) */}
        {activeTab === 'oportunidades' && (
          <>
            {/* Metrics Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Total de Oportunidades</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredOpportunities.length}
                    {activeFiltersCount > 0 && (
                      <span className="text-lg text-gray-500 ml-2">/ {opportunities.length}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeFiltersCount > 0 ? 'Oportunidades filtradas' : 'Oportunidades ativas'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-full">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Valor Total</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    R$ {filteredOpportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0).toLocaleString('pt-BR')}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activeFiltersCount > 0 ? 'Valor filtrado' : 'Valor estimado do pipeline'}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Ganhos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredOpportunities.filter(o => o.status?.is_won).length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Negócios fechados
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-yellow-500 rounded-full">
                      <TrendingDown className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Taxa de Conversão</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {filteredOpportunities.length > 0
                      ? Math.round((filteredOpportunities.filter(o => o.status?.is_won).length / filteredOpportunities.length) * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Taxa de conversão
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Kanban Board */}
            <div className="h-[calc(100vh-450px)]">
              <SalesFunnelKanban
                opportunities={filteredOpportunities}
                statuses={statuses}
                onOpportunityUpdate={handleAddOpportunity}
              />
            </div>
          </>
        )}

        {/* Tab: Funil de Vendas (Dashboard View) */}
        {activeTab === 'funil' && (
          <div className="space-y-6">
            {/* Dashboard Metrics */}
            <PipelineMetricsCards
              totalLeads={dashboardMetrics.totalLeads}
              activeOpportunities={dashboardMetrics.activeOpportunities}
              totalValue={dashboardMetrics.totalValue}
            />

            {/* Funnel Visualization */}
            <PipelineFunnelView
              opportunities={filteredOpportunities}
              statuses={statuses}
            />

            {/* Grid with 3 cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Next Actions */}
              <NextActionsCard
                opportunities={filteredOpportunities}
                tasks={tasks}
                onTaskComplete={handleTaskComplete}
              />

              {/* Top Opportunities */}
              <TopOpportunitiesCard opportunities={filteredOpportunities} />

              {/* Pipeline Trend */}
              <PipelineTrendCard opportunities={filteredOpportunities} />
            </div>
          </div>
        )}
      </main>

      {/* Add Opportunity Modal */}
      <AddOpportunityModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={handleAddOpportunity}
        statuses={statuses}
      />

      {/* Filters Modal */}
      <SalesFunnelFilters
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        onApplyFilters={handleApplyFilters}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Add Column Dialog */}
      <AddColumnDialog
        open={isAddColumnOpen}
        onOpenChange={setIsAddColumnOpen}
        onSuccess={handleAddOpportunity}
      />

      {/* Add Task Modal */}
      <AddTaskModal
        open={isAddTaskModalOpen}
        onOpenChange={setIsAddTaskModalOpen}
        onSuccess={handleAddTask}
        opportunities={opportunities}
      />
    </div>
  );
}
