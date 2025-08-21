/**
 * SERVICE UNIFICADO PARA PROJETOS
 * Centraliza todas as operações de projetos em uma única interface
 * Fonte única da verdade para dados de projetos
 */

import { ProjectWithBilling } from './billingService.api';
import { devLog } from '@/lib/utils/productionLogger';

interface UnifiedProjectService {
  // Buscar projetos
  getProjects(): Promise<ProjectWithBilling[]>;
  
  // Operações de pagamento
  updatePaymentStatus(projectId: string, paymentStatus: 'pendente' | 'parcela1' | 'pago'): Promise<void>;
  getPaymentStatus(projectId: string): Promise<{ pagamento: string; valor_projeto: number }>;
  
  // Criar projeto
  createProject(projectData: any): Promise<ProjectWithBilling>;
}

class UnifiedProjectServiceImpl implements UnifiedProjectService {
  private readonly baseUrl = '/api/projects/unified';

  /**
   * Buscar todos os projetos
   */
  async getProjects(): Promise<ProjectWithBilling[]> {
    try {
      devLog.log('[UnifiedProjectService] Buscando projetos via API unificada');
      
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar projetos');
      }

      devLog.log('[UnifiedProjectService] Projetos carregados:', {
        count: result.data.length,
        paymentStatuses: result.data.map((p: any) => ({ id: p.id, pagamento: p.pagamento }))
      });

      return result.data;
    } catch (error) {
      devLog.error('[UnifiedProjectService] Erro ao buscar projetos:', error);
      throw error;
    }
  }

  /**
   * Atualizar status de pagamento
   */
  async updatePaymentStatus(
    projectId: string, 
    paymentStatus: 'pendente' | 'parcela1' | 'pago'
  ): Promise<void> {
    try {
      devLog.log('[UnifiedProjectService] Atualizando pagamento:', {
        projectId,
        paymentStatus
      });

      const response = await fetch(`${this.baseUrl}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          paymentStatus,
          updatedBy: 'admin' // Pode ser dinâmico no futuro
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao atualizar pagamento');
      }

      devLog.log('[UnifiedProjectService] Pagamento atualizado:', result.data);
    } catch (error) {
      devLog.error('[UnifiedProjectService] Erro ao atualizar pagamento:', error);
      throw error;
    }
  }

  /**
   * Buscar status de pagamento de um projeto
   */
  async getPaymentStatus(projectId: string): Promise<{ pagamento: string; valor_projeto: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/payment?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao buscar status de pagamento');
      }

      return {
        pagamento: result.data.pagamento,
        valor_projeto: result.data.valor_projeto || result.data.valorProjeto || 0
      };
    } catch (error) {
      devLog.error('[UnifiedProjectService] Erro ao buscar status de pagamento:', error);
      throw error;
    }
  }

  /**
   * Criar novo projeto
   */
  async createProject(projectData: any): Promise<ProjectWithBilling> {
    try {
      devLog.log('[UnifiedProjectService] Criando projeto');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar projeto');
      }

      devLog.log('[UnifiedProjectService] Projeto criado:', result.data.id);
      return result.data;
    } catch (error) {
      devLog.error('[UnifiedProjectService] Erro ao criar projeto:', error);
      throw error;
    }
  }
}

// Instância singleton
export const unifiedProjectService = new UnifiedProjectServiceImpl();

// Funções de conveniência para manter compatibilidade
export const getProjectsWithBilling = () => unifiedProjectService.getProjects();
export const updateProjectPayment = (projectId: string, status: 'pendente' | 'parcela1' | 'pago') => 
  unifiedProjectService.updatePaymentStatus(projectId, status);
export const getProjectPaymentStatus = (projectId: string) => 
  unifiedProjectService.getPaymentStatus(projectId);
