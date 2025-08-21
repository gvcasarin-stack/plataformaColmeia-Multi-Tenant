// ✅ SUPABASE - Serviço de cobranças/billing
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger';

/**
 * SERVIÇO DE COBRANÇAS SUPABASE
 * 
 * ⚠️ IMPORTANTE: Este serviço usa apenas Browser Client para segurança
 * Operações privilegiadas devem ser feitas via API routes com Service Role Client
 */

// Função para criar o cliente Supabase (apenas browser client)
function createSupabaseClient() {
  // ✅ PRODUÇÃO - Sempre usar Browser Client no frontend
  logger.info('[BillingService] Usando Browser Client (seguro)');
  return createSupabaseBrowserClient();
}

// Tipos de pagamento
export type PaymentStatus = 'pendente' | 'parcela1' | 'pago';

// Interface para projeto com informações de cobrança
export interface ProjectWithBilling {
  id: string;
  name: string;
  client_id: string;
  client_name?: string;
  potencia?: number;
  price?: number;
  status?: string;
  pagamento: PaymentStatus;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

// Interface para detalhes de pagamento
// Interface removida - não usamos mais detalhes de pagamento complexos
// A coluna 'pagamento' é suficiente para controlar o status

/**
 * Busca todos os projetos com informações de cobrança
 */
export async function getProjectsWithBilling(): Promise<ProjectWithBilling[]> {
  try {
    logger.info('[BillingService] Buscando projetos com informações de cobrança');

    const supabase = createSupabaseClient();
    
    devLog.log('[BillingService] Iniciando busca de projetos para cobrança...');
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_created_by_fkey(
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[BillingService] Erro ao buscar projetos:', error);
      devLog.error('[BillingService] Detalhes do erro:', error);
      return [];
    }

    devLog.log('[BillingService] Dados brutos recebidos do Supabase:', {
      count: data?.length || 0,
      sample: data?.slice(0, 2) // Mostrar primeiros 2 projetos para debug
    });

    // Mapear dados para formato esperado
    const projectsWithBilling = data?.map(project => ({
      ...project,
      client_id: project.created_by, // Mapear created_by para client_id para compatibilidade
      client_name: project.users?.name || project.users?.email || 'Cliente sem nome',
      pagamento: project.pagamento || 'pendente' as PaymentStatus,
      // Adicionar campos de compatibilidade
      empresaIntegradora: project.empresa_integradora,
      nomeClienteFinal: project.nome_cliente_final,
      distribuidora: project.distribuidora,
      potencia: project.potencia,
      valorProjeto: project.valor_projeto || project.valorProjeto || 0
    })) || [];

    devLog.log('[BillingService] Projetos mapeados:', {
      count: projectsWithBilling.length,
      totalValue: projectsWithBilling.reduce((sum, p) => sum + (p.valorProjeto || 0), 0),
      sampleMapped: projectsWithBilling.slice(0, 2)
    });

    logger.info('[BillingService] Projetos encontrados:', { count: projectsWithBilling.length });
    return projectsWithBilling;

  } catch (error) {
    logger.error('[BillingService] Exceção ao buscar projetos:', error);
    devLog.error('[BillingService] Exceção detalhada:', error);
    return [];
  }
}

/**
 * Busca projetos com paginação
 */
export async function getProjectsWithPagination(
  pageSize: number = 50,
  offset: number = 0
): Promise<{ projects: ProjectWithBilling[]; hasMore: boolean; total: number }> {
  try {
    logger.info('[BillingService] Buscando projetos paginados:', { pageSize, offset });

    const supabase = createSupabaseClient();
    
    // Buscar projetos com paginação
    const { data, error, count } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_created_by_fkey(
          id,
          name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      logger.error('[BillingService] Erro ao buscar projetos paginados:', error);
      devLog.error('[BillingService] Detalhes do erro paginação:', error);
      return { projects: [], hasMore: false, total: 0 };
    }

    const projects = data?.map(project => ({
      ...project,
      client_id: project.created_by, // Mapear created_by para client_id para compatibilidade
      client_name: project.users?.name || project.users?.email || 'Cliente sem nome',
      pagamento: project.pagamento || 'pendente' as PaymentStatus,
      // Adicionar campos de compatibilidade
      empresaIntegradora: project.empresa_integradora,
      nomeClienteFinal: project.nome_cliente_final,
      distribuidora: project.distribuidora,
      potencia: project.potencia,
      valorProjeto: project.valor_projeto || project.valorProjeto || 0
    })) || [];

    const total = count || 0;
    const hasMore = offset + pageSize < total;

    logger.info('[BillingService] Projetos paginados encontrados:', {
      count: projects.length,
      total,
      hasMore
    });

    return { projects, hasMore, total };

  } catch (error) {
    logger.error('[BillingService] Exceção ao buscar projetos paginados:', error);
    return { projects: [], hasMore: false, total: 0 };
  }
}

/**
 * Atualiza o status de pagamento de um projeto
 */
export async function updatePaymentStatus(
  projectId: string,
  paymentStatus: PaymentStatus
): Promise<boolean> {
  try {
    logger.info('[BillingService] Atualizando status de pagamento:', {
      projectId,
      paymentStatus
    });

    const supabase = createSupabaseClient();
    
    const { error } = await supabase
      .from('projects')
      .update({
        pagamento: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (error) {
      logger.error('[BillingService] Erro ao atualizar status de pagamento:', error);
      return false;
    }

    logger.info('[BillingService] Status de pagamento atualizado com sucesso');
    return true;

  } catch (error) {
    logger.error('[BillingService] Exceção ao atualizar status de pagamento:', error);
    return false;
  }
}

/**
 * Marcar projeto como primeira parcela paga
 */
export async function markFirstPayment(projectId: string): Promise<boolean> {
  try {
    logger.info('[BillingService] Marcando primeira parcela como paga:', { projectId });
    return await updatePaymentStatus(projectId, 'parcela1');
  } catch (error) {
    logger.error('[BillingService] Exceção ao marcar primeira parcela:', error);
    return false;
  }
}

/**
 * Marcar projeto como segunda parcela paga (projeto finalizado)
 */
export async function markSecondPayment(projectId: string): Promise<boolean> {
  try {
    logger.info('[BillingService] Marcando segunda parcela como paga:', { projectId });
    return await updatePaymentStatus(projectId, 'pago');
  } catch (error) {
    logger.error('[BillingService] Exceção ao marcar segunda parcela:', error);
    return false;
  }
}

/**
 * Marcar projeto como totalmente pago (pagamento único)
 */
export async function markFullPayment(projectId: string): Promise<boolean> {
  try {
    logger.info('[BillingService] Marcando projeto como totalmente pago:', { projectId });
    return await updatePaymentStatus(projectId, 'pago');
  } catch (error) {
    logger.error('[BillingService] Exceção ao marcar pagamento total:', error);
    return false;
  }
}

/**
 * Reverter status de pagamento para pendente
 */
export async function revertPaymentStatus(projectId: string): Promise<boolean> {
  try {
    logger.info('[BillingService] Revertendo status de pagamento para pendente:', { projectId });
    return await updatePaymentStatus(projectId, 'pendente');
  } catch (error) {
    logger.error('[BillingService] Exceção ao reverter status de pagamento:', error);
    return false;
  }
}

/**
 * Busca métricas de cobrança
 */
export async function getBillingMetrics(): Promise<{
  totalPendingAmount: number;
  historicalPaidAmount: number;
  monthlyEstimatedRevenue: number;
  monthlyActualRevenue: number;
  pendingProjects: number;
  paidProjects: number;
  parcela1Projects: number;
  projectsThisMonth: number;
  paidProjectsThisMonth: number;
}> {
  try {
    logger.info('[BillingService] Calculando métricas de cobrança');

    const projects = await getProjectsWithBilling();
    
    // Calcular data do mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const metrics = {
      totalPendingAmount: 0,
      historicalPaidAmount: 0,
      monthlyEstimatedRevenue: 0,
      monthlyActualRevenue: 0,
      pendingProjects: 0,
      paidProjects: 0,
      parcela1Projects: 0,
      projectsThisMonth: 0,
      paidProjectsThisMonth: 0
    };

    projects.forEach(project => {
      const price = project.valor_projeto || project.valorProjeto || 0;
      const projectDate = new Date(project.created_at);
      const isCurrentMonth = 
        projectDate.getMonth() === currentMonth && 
        projectDate.getFullYear() === currentYear;

      // Contar projetos por status
      switch (project.pagamento) {
        case 'pendente':
          metrics.pendingProjects++;
          metrics.totalPendingAmount += price;
          break;
        case 'parcela1':
          metrics.parcela1Projects++;
          metrics.totalPendingAmount += price / 2; // Metade ainda pendente
          metrics.historicalPaidAmount += price / 2; // Metade paga
          break;
        case 'pago':
          metrics.paidProjects++;
          metrics.historicalPaidAmount += price;
          break;
      }

      // Métricas mensais
      if (isCurrentMonth) {
        metrics.projectsThisMonth++;
        metrics.monthlyEstimatedRevenue += price;
        
        if (project.pagamento === 'pago') {
          metrics.paidProjectsThisMonth++;
          metrics.monthlyActualRevenue += price;
        } else if (project.pagamento === 'parcela1') {
          metrics.monthlyActualRevenue += price / 2;
        }
      }
    });

    logger.info('[BillingService] Métricas calculadas:', metrics);
    return metrics;

  } catch (error) {
    logger.error('[BillingService] Exceção ao calcular métricas:', error);
    return {
      totalPendingAmount: 0,
      historicalPaidAmount: 0,
      monthlyEstimatedRevenue: 0,
      monthlyActualRevenue: 0,
      pendingProjects: 0,
      paidProjects: 0,
      parcela1Projects: 0,
      projectsThisMonth: 0,
      paidProjectsThisMonth: 0
    };
  }
}

/**
 * Busca clientes para o sistema de cobrança
 */
export async function getBillingClients(): Promise<any[]> {
  try {
    logger.info('[BillingService] Buscando clientes para cobrança');

    const supabase = createSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .order('name', { ascending: true });

    if (error) {
      logger.error('[BillingService] Erro ao buscar clientes:', error);
      return [];
    }

    logger.info('[BillingService] Clientes encontrados:', { count: data?.length || 0 });
    return data || [];

  } catch (error) {
    logger.error('[BillingService] Exceção ao buscar clientes:', error);
    return [];
  }
}
