/**
 * ✅ SERVIÇO DE NOTIFICAÇÕES DE QUOTA
 * 
 * Este serviço é responsável por notificar clientes e administradores quando:
 * - Pacote de projetos esgota ou expira
 * - Assinatura mensal atinge o limite de quota
 * - Assinatura está suspensa ou pendente
 * 
 * Notificações são enviadas tanto para o cliente quanto para os administradores
 * para garantir transparência e acompanhamento adequado.
 */

import { createNotificationDirectly, createNotificationForAllAdmins } from './notificationService/core';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Parâmetros para envio de notificações de quota
 */
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
 * Envia notificações de esgotamento de quota após criação de projeto
 * 
 * @param params - Parâmetros do projeto e warnings de quota
 * 
 * Comportamento:
 * - Para o CLIENTE: Informa sobre situação do pacote/assinatura (quota esgotada, expiração, etc)
 * - Para os ADMINS: Alerta sobre projetos criados fora dos limites de quota
 * 
 * Tipos de warnings suportados:
 * - package_exhausted: Pacote esgotou todos os projetos disponíveis
 * - package_expired: Pacote expirou (data de validade passou)
 * - subscription_exhausted: Cota mensal da assinatura esgotada
 * - subscription_suspended: Assinatura suspensa ou cancelada
 * - subscription_pending_renewal: Assinatura pendente de renovação
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

  devLog.log('[QuotaNotifications] Processando notificações de quota:', {
    projectId,
    projectNumber,
    billingMode,
    warningsCount: warnings.length
  });

  // Se não há warnings, não precisa notificar
  if (warnings.length === 0) {
    devLog.log('[QuotaNotifications] Nenhum warning de quota, pulando notificações');
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
      title: 'Pacote de projetos esgotado',
      message: `Você criou o projeto #${projectNumber}, mas seu pacote de projetos está com a cota esgotada. Portanto, esse novo projeto foi criado como avulso. Para incluir projetos no pacote, entre em contato com a equipe administrativa.`,
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
      title: 'Pacote de projetos expirado',
      message: `Você criou o projeto #${projectNumber}, mas seu pacote de projetos expirou. Portanto, esse novo projeto foi criado como avulso. Para renovar seu pacote, entre em contato com a equipe administrativa.`,
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
      message: `Você criou o projeto #${projectNumber}, mas sua assinatura mensal está com a cota esgotada. Portanto, esse novo projeto foi criado como avulso. Para incluir projetos na assinatura, aguarde a renovação ou entre em contato com a equipe administrativa.`,
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
      message: `Você criou o projeto #${projectNumber}, mas sua assinatura está pendente de renovação. Portanto, esse novo projeto foi criado como avulso. Para continuar incluindo projetos na assinatura, efetue o pagamento ou entre em contato com a equipe administrativa.`,
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
      type: 'warning',
      title: 'Assinatura suspensa',
      message: `Você criou o projeto #${projectNumber}, mas sua assinatura está suspensa. Portanto, esse novo projeto foi criado como avulso. Para reativar sua assinatura, entre em contato com a equipe administrativa.`,
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
      type: 'warning',
      title: 'Potência excede limite do plano',
      message: `Você criou o projeto #${projectNumber} com potência de ${potencia} kWp, mas seu ${billingMode === 'pacote' ? 'pacote' : 'plano'} permite até ${potenciaMaxima} kWp. Portanto, a diferença de potência será cobrada como avulso. Para ajustar seu plano, entre em contato com a equipe administrativa.`,
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
    await createNotificationForAllAdmins({
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
    await createNotificationForAllAdmins({
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
    await createNotificationForAllAdmins({
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
    await createNotificationForAllAdmins({
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

  devLog.log('[QuotaNotifications] Notificações de esgotamento de quota enviadas com sucesso');
}
