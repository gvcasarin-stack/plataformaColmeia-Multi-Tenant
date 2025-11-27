import { createNotificationDirectly, notifyAllAdmins } from './notificationService/core';
import { devLog } from '@/lib/utils/productionLogger';

interface BillingNotificationParams {
  projectId: string;
  projectNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  billingMode: 'avulso' | 'pacote' | 'assinatura';
  warnings: Array<{
    type: string;
    severity?: 'low' | 'medium' | 'high';
    message: string;
  }>;
  potencia?: number;
  potenciaMaxima?: number;
  pacoteNome?: string;
  assinaturaNome?: string;
}

/**
 * Envia notificações de billing após criação de projeto
 * - Para o cliente: informando sobre situação do pacote/assinatura
 * - Para os admins: alertando sobre projetos fora dos limites
 */
export async function sendBillingNotifications(params: BillingNotificationParams): Promise<void> {
  const {
    projectId,
    projectNumber,
    userId,
    userName,
    userEmail,
    billingMode,
    warnings,
    potencia,
    potenciaMaxima,
    pacoteNome,
    assinaturaNome
  } = params;

  devLog.log('[BillingNotifications] Processando notificações:', {
    projectId,
    projectNumber,
    billingMode,
    warningsCount: warnings.length
  });

  // Se não há warnings, não precisa notificar
  if (warnings.length === 0) {
    devLog.log('[BillingNotifications] Nenhum warning, pulando notificações');
    return;
  }

  // Preparar nome do plano para mensagens
  const planoNome = pacoteNome || assinaturaNome || 'plano';

  // ========================================
  // NOTIFICAÇÕES PARA O CLIENTE
  // ========================================

  // 1. Pacote esgotado
  if (warnings.some(w => w.type === 'package_exhausted')) {
    await createNotificationDirectly({
      type: 'warning',
      title: 'Projeto criado fora do pacote',
      message: `Você criou o projeto #${projectNumber}, mas seu pacote está esgotado. Este projeto será cobrado como avulso.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        pacoteNome,
        warningType: 'package_exhausted'
      }
    });
  }

  // 2. Pacote expirado
  if (warnings.some(w => w.type === 'package_expired')) {
    await createNotificationDirectly({
      type: 'warning',
      title: 'Projeto criado com pacote expirado',
      message: `Você criou o projeto #${projectNumber}, mas seu pacote expirou. Este projeto será cobrado como avulso.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        pacoteNome,
        warningType: 'package_expired'
      }
    });
  }

  // 3. Assinatura esgotada
  if (warnings.some(w => w.type === 'subscription_exhausted')) {
    await createNotificationDirectly({
      type: 'warning',
      title: 'Cota mensal esgotada',
      message: `Você criou o projeto #${projectNumber}, mas sua cota mensal está esgotada. Aguarde a renovação ou entre em contato.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        assinaturaNome,
        warningType: 'subscription_exhausted'
      }
    });
  }

  // 4. Assinatura pendente de renovação
  if (warnings.some(w => w.type === 'subscription_pending_renewal')) {
    await createNotificationDirectly({
      type: 'warning',
      title: 'Assinatura pendente de renovação',
      message: `Você criou o projeto #${projectNumber}, mas sua assinatura está pendente de renovação. Efetue o pagamento para continuar criando projetos.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        assinaturaNome,
        warningType: 'subscription_pending_renewal'
      }
    });
  }

  // 5. Assinatura suspensa
  if (warnings.some(w => w.type === 'subscription_suspended')) {
    await createNotificationDirectly({
      type: 'error',
      title: 'Assinatura suspensa',
      message: `Você criou o projeto #${projectNumber}, mas sua assinatura está suspensa. Entre em contato com o administrador.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        assinaturaNome,
        warningType: 'subscription_suspended'
      }
    });
  }

  // 6. Potência excedida (validar se potência foi informada)
  if (potencia && potenciaMaxima && potencia > potenciaMaxima) {
    await createNotificationDirectly({
      type: 'info',
      title: 'Potência excede limite do plano',
      message: `O projeto #${projectNumber} tem potência de ${potencia} kWp, mas seu ${billingMode === 'pacote' ? 'pacote' : 'plano'} permite até ${potenciaMaxima} kWp. A diferença será cobrada como avulso.`,
      userId,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/cliente/projetos/${projectId}`,
      data: {
        billingMode,
        pacoteNome,
        assinaturaNome,
        potencia,
        potenciaMaxima,
        warningType: 'potencia_excedida'
      }
    });
  }

  // ========================================
  // NOTIFICAÇÕES PARA OS ADMINS
  // ========================================

  // 1. Cliente criou projeto com pacote esgotado
  if (warnings.some(w => w.type === 'package_exhausted')) {
    await notifyAllAdmins({
      type: 'info',
      title: 'Cliente criou projeto fora do pacote',
      message: `Cliente ${userName} (${userEmail}) criou projeto #${projectNumber} mas o pacote está esgotado. Projeto será cobrado como avulso.`,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/admin/projetos/${projectId}`,
      data: {
        userId,
        userName,
        userEmail,
        billingMode,
        pacoteNome,
        warningType: 'package_exhausted'
      }
    });
  }

  // 2. Cliente criou projeto com pacote expirado
  if (warnings.some(w => w.type === 'package_expired')) {
    await notifyAllAdmins({
      type: 'warning',
      title: 'Cliente criou projeto com pacote expirado',
      message: `Cliente ${userName} (${userEmail}) criou projeto #${projectNumber} mas o pacote expirou. Projeto será cobrado como avulso.`,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/admin/clientes`,
      data: {
        userId,
        userName,
        userEmail,
        billingMode,
        pacoteNome,
        warningType: 'package_expired'
      }
    });
  }

  // 3. Cliente criou projeto com assinatura suspensa/pendente
  if (warnings.some(w => w.type === 'subscription_suspended' || w.type === 'subscription_pending_renewal')) {
    await notifyAllAdmins({
      type: 'error',
      title: 'Cliente criou projeto com assinatura suspensa',
      message: `Cliente ${userName} (${userEmail}) criou projeto #${projectNumber} mas a assinatura está suspensa/pendente de renovação.`,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/admin/clientes`,
      data: {
        userId,
        userName,
        userEmail,
        billingMode,
        assinaturaNome,
        warningType: 'subscription_suspended'
      }
    });
  }

  // 4. Cliente excedeu limite de potência
  if (potencia && potenciaMaxima && potencia > potenciaMaxima) {
    await notifyAllAdmins({
      type: 'info',
      title: 'Cliente excedeu limite de potência',
      message: `Cliente ${userName} criou projeto #${projectNumber} com ${potencia} kWp, mas o limite do ${billingMode === 'pacote' ? 'pacote' : 'plano'} é ${potenciaMaxima} kWp.`,
      senderId: 'system',
      senderName: 'Sistema',
      senderType: 'system',
      projectId,
      projectNumber,
      link: `/admin/projetos/${projectId}`,
      data: {
        userId,
        userName,
        userEmail,
        billingMode,
        pacoteNome,
        assinaturaNome,
        potencia,
        potenciaMaxima,
        warningType: 'potencia_excedida'
      }
    });
  }

  devLog.log('[BillingNotifications] Notificações enviadas com sucesso');
}
