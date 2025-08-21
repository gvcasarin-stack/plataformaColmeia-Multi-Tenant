import { devLog } from "@/lib/utils/productionLogger";
// ✅ API ROUTES - Serviço de cobranças usando rotas de API
import { toast } from '@/components/ui/use-toast';

/**
 * SERVIÇO DE COBRANÇAS VIA API ROUTES
 * 
 * Implementação que usa rotas de API para acessar os dados de cobrança
 * de forma segura, permitindo o uso do service role client no servidor.
 */

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
export interface PaymentDetails {
  valorTotal: number;
  valorParcela1?: number;
  valorParcela2?: number;
  dataParcela1?: string;
  dataParcela2?: string;
  observacoes?: string;
}

/**
 * Busca todos os projetos com informações de cobrança via API
 */
export async function getProjectsWithBilling(): Promise<ProjectWithBilling[]> {
  try {
    devLog.log('[BillingService.API] Buscando projetos com informações de cobrança via API');

    const response = await fetch('/api/billing/projects', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API:', errorData);
      throw new Error(errorData.error || 'Erro ao buscar projetos');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Projetos recebidos via API:', {
      count: result.data?.length || 0,
      sample: result.data?.slice(0, 2)
    });

    return result.data || [];

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao buscar projetos:', error);
    
    toast({
      title: 'Erro ao carregar projetos',
      description: 'Ocorreu um erro ao carregar os dados de cobrança. Tente novamente.',
      variant: 'destructive',
    });
    
    return [];
  }
}

/**
 * Busca clientes para o sistema de cobrança via API
 */
export async function getBillingClients(): Promise<any[]> {
  try {
    devLog.log('[BillingService.API] Buscando clientes para cobrança via API');

    const response = await fetch('/api/billing/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API de clientes:', errorData);
      throw new Error(errorData.error || 'Erro ao buscar clientes');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Clientes recebidos via API:', {
      count: result.data?.length || 0
    });

    return result.data || [];

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao buscar clientes:', error);
    
    toast({
      title: 'Erro ao carregar clientes',
      description: 'Ocorreu um erro ao carregar os dados dos clientes. Tente novamente.',
      variant: 'destructive',
    });
    
    return [];
  }
}

/**
 * Atualiza o status de pagamento de um projeto via API
 */
export async function updatePaymentStatus(
  projectId: string,
  paymentStatus: PaymentStatus,
  paymentDetails?: PaymentDetails
): Promise<boolean> {
  try {
    devLog.log('[BillingService.API] Atualizando status de pagamento via API:', {
      projectId,
      paymentStatus
    });

    const response = await fetch('/api/billing/update-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        paymentStatus,
        paymentDetails
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API de atualização:', errorData);
      throw new Error(errorData.error || 'Erro ao atualizar status de pagamento');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Status de pagamento atualizado com sucesso via API');
    return true;

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao atualizar status de pagamento:', error);
    
    toast({
      title: 'Erro ao atualizar pagamento',
      description: 'Ocorreu um erro ao atualizar o status de pagamento. Tente novamente.',
      variant: 'destructive',
    });
    
    return false;
  }
}

/**
 * Marcar projeto como primeira parcela paga via API
 */
export async function markFirstPayment(projectId: string): Promise<boolean> {
  try {
    devLog.log('[BillingService.API] Marcando primeira parcela como paga via API:', projectId);

    const response = await fetch(`/api/projects/${projectId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'parcela1'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API:', errorData);
      throw new Error(errorData.error || 'Erro ao marcar primeira parcela');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Primeira parcela marcada com sucesso via API');
    return true;

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao marcar primeira parcela:', error);
    return false;
  }
}

/**
 * Marcar projeto como segunda parcela paga (projeto finalizado) via API
 */
export async function markSecondPayment(projectId: string): Promise<boolean> {
  try {
    devLog.log('[BillingService.API] Marcando segunda parcela como paga via API:', projectId);

    const response = await fetch(`/api/projects/${projectId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pago'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API:', errorData);
      throw new Error(errorData.error || 'Erro ao marcar segunda parcela');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Segunda parcela marcada com sucesso via API');
    return true;

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao marcar segunda parcela:', error);
    return false;
  }
}

/**
 * Marcar projeto como totalmente pago (pagamento único) via API
 */
export async function markFullPayment(projectId: string): Promise<boolean> {
  try {
    devLog.log('[BillingService.API] Marcando projeto como totalmente pago via API:', projectId);

    const response = await fetch(`/api/projects/${projectId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pago'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API:', errorData);
      throw new Error(errorData.error || 'Erro ao marcar pagamento total');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Pagamento total marcado com sucesso via API');
    return true;

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao marcar pagamento total:', error);
    return false;
  }
}

/**
 * Reverter status de pagamento para pendente via API
 */
export async function revertPaymentStatus(projectId: string): Promise<boolean> {
  try {
    devLog.log('[BillingService.API] Revertendo status de pagamento para pendente via API:', projectId);

    const response = await fetch(`/api/projects/${projectId}/payment`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pendente'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      devLog.error('[BillingService.API] Erro na resposta da API:', errorData);
      throw new Error(errorData.error || 'Erro ao reverter status de pagamento');
    }

    const result = await response.json();
    
     if (!result.success) {
      throw new Error(result.error || 'Resposta inválida da API');
    }

    devLog.log('[BillingService.API] Status revertido com sucesso via API');
    return true;

  } catch (error) {
    devLog.error('[BillingService.API] Exceção ao reverter status de pagamento:', error);
    return false;
  }
}
