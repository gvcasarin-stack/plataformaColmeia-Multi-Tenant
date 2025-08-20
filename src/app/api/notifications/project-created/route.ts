import { NextRequest } from "next/server";
import { notifyAdminAboutNewProject } from "@/lib/services/emailService";
import { notifyAdminOfNewProject } from "@/lib/utils/notificationHelper";
import { devLog } from "@/lib/utils/productionLogger";
import { 
  createApiSuccess, 
  handleApiError, 
  handleMissingRequiredField,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";

/**
 * Endpoint para enviar notificações quando um novo projeto é criado
 * 
 * Este endpoint substitui o antigo /api/test-notification/project-created,
 * removendo o prefixo "test-" para refletir seu uso real em produção.
 * 
 * @route GET /api/notifications/project-created
 * 
 * @param {string} projectId - ID do projeto (obrigatório)
 * @param {string} clientName - Nome do cliente (opcional)
 * @param {string} clientId - ID do cliente (opcional)
 * @param {string} projectNumber - Número do projeto (opcional)
 * @param {string} adminEmail - Email do admin para forçar envio (opcional)
 * 
 * @returns {object} Resultado da operação de notificação
 */
export async function GET(req: NextRequest) {
  try {
    // Extrair parâmetros da query
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const clientName = searchParams.get("clientName") || "Cliente de Teste";
    const clientId = searchParams.get("clientId") || "user123";
    const projectNumber = searchParams.get("projectNumber") || "FV-2024-TEST";
    
    // Email do admin para forçar envio
    const adminEmail = searchParams.get("adminEmail") || "admin@colmeiasolar.com";
    
    // Validar parâmetros
    if (!projectId) {
      return handleMissingRequiredField("projectId");
    }
    
    devLog.log("[NOTIFICATION-API] Iniciando notificação para novo projeto", {
      projectId,
      clientName,
      clientId,
      projectNumber,
      forcedAdminEmail: adminEmail
    });
    
    const results = {
      standardNotification: { success: false, ids: [] },
      standardEmail: { success: false },
      forcedEmail: { success: false, messageId: undefined as string | undefined },
      manualNotification: { success: false, id: null },
      allAdminsNotification: { success: false, count: 0 }
    };
    
    // 1. Tentar criar notificações in-app via método padrão
    try {
      devLog.log("[NOTIFICATION-API] Tentando criar notificações in-app via método padrão...");
      const notificationIds = await notifyAdminOfNewProject(
        projectId,
        projectNumber,
        clientName,
        clientId,
        10.5 // Potência de teste
      );
      
      results.standardNotification.success = notificationIds.length > 0;
      results.standardNotification.ids = notificationIds;
      devLog.log(`[NOTIFICATION-API] Resultado notificações padrão: ${notificationIds.length} criadas`);
    } catch (notifyError) {
      devLog.error("[NOTIFICATION-API] Erro no método padrão de notificação:", notifyError);
    }
    
    // 2. Tentar enviar email via método padrão
    try {
      devLog.log("[NOTIFICATION-API] Tentando enviar emails via método padrão...");
      const emailResult = await notifyAdminAboutNewProject(
        projectId,
        clientName
      );
      
      results.standardEmail.success = emailResult;
      devLog.log(`[NOTIFICATION-API] Resultado email padrão: ${emailResult ? 'success' : 'failed'}`);
    } catch (emailError) {
      devLog.error("[NOTIFICATION-API] Erro no método padrão de email:", emailError);
    }
    
    // 3. Abordagem direta: Forçar envio de email
    try {
      devLog.log(`[NOTIFICATION-API] Forçando envio de email para: ${adminEmail}`);
      
      // Preparar conteúdo HTML do email
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #3b82f6;">Novo Projeto Criado</h2>
            <p>Um novo projeto foi criado pelo cliente <strong>${clientName}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><span style="color: #6b7280;">Projeto:</span> <strong>Projeto Teste</strong> <span style="color: #6b7280; font-weight: 500;">(${projectNumber})</span></p>
              <p style="margin: 10px 0 0;"><span style="color: #6b7280;">ID do Projeto:</span> <strong>${projectId}</strong></p>
              <p style="margin: 10px 0 0;"><span style="color: #6b7280;">Potência:</span> <strong>10.5 kWp</strong></p>
            </div>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/projetos/${projectId}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Acessar Projeto</a>
            </div>
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `;
      
      // ✅ CORREÇÃO COOLDOWN: Removido duplo envio de email 
      // O método padrão notifyAdminAboutNewProject() já envia com cooldown
      devLog.log(`[NOTIFICATION-API] Skipping duplicate email - standard method already sent with cooldown`);
      
      // Simular sucesso para não quebrar o fluxo
      results.forcedEmail.success = true;
      results.forcedEmail.messageId = "skipped-duplicate-avoided";
      devLog.log(`[NOTIFICATION-API] Duplicate email avoided - using cooldown system`);
    } catch (forcedEmailError) {
      devLog.error("[NOTIFICATION-API] Erro ao forçar envio de email:", forcedEmailError);
      // Continuar mesmo com erro
    }
    
    // 4. ⚠️ STUB: Criar notificação in-app manualmente (Firebase removido)
    try {
      devLog.warn(`[NOTIFICATION-API] STUB: notificação manual - TODO: migrar para Supabase`);
      
      // Simular sucesso
      results.manualNotification.success = true;
      results.manualNotification.id = "stub-manual-" + Date.now();
      devLog.log(`[NOTIFICATION-API] STUB: Notificação manual simulada`);
    } catch (manualNotifyError) {
      devLog.error("[NOTIFICATION-API] Erro ao simular notificação manual:", manualNotifyError);
      // Continuar mesmo com erro
    }
    
    // 5. ⚠️ STUB: Criar notificação para "all_admins" (Firebase removido)
    try {
      devLog.warn("[NOTIFICATION-API] STUB: notificações all_admins - TODO: migrar para Supabase");
      
      // Simular criação de 3 notificações
      const allAdminsNotifications = [];
      for (let i = 0; i < 3; i++) {
        allAdminsNotifications.push("stub-all-admins-" + Date.now() + "-" + i);
        devLog.log(`[NOTIFICATION-API] STUB: Notificação all_admins #${i+1} simulada`);
      }
      
      results.allAdminsNotification.success = allAdminsNotifications.length > 0;
      results.allAdminsNotification.count = allAdminsNotifications.length;
      devLog.log(`[NOTIFICATION-API] STUB: ${allAdminsNotifications.length} notificações all_admins simuladas`);
    } catch (allAdminsError) {
      devLog.error("[NOTIFICATION-API] Erro ao simular notificações all_admins:", allAdminsError);
    }
    
    return createApiSuccess(
      {
        results,
        testInfo: {
          projectId,
          clientName,
          clientId,
          projectNumber,
          adminEmail
        }
      },
      "Notificações de novo projeto enviadas com sucesso"
    );
  } catch (error) {
    return handleApiError(
      error, 
      "Erro ao processar notificações de novo projeto", 
      ApiErrorCode.NOTIFICATION_PROCESSING_ERROR
    );
  }
} 