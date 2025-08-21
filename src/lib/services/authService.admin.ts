import 'server-only';
// ✅ MIGRADO PARA SUPABASE
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";
import { UserData } from './authService'; // Importar o tipo UserData

// Função para buscar dados do usuário com Supabase Service Client (para uso no backend)
export async function getUserDataAdmin(userId: string): Promise<UserData | null> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        devLog.warn(`[getUserDataAdmin] User document not found for ID: ${userId} (authService.admin.ts)`);
        return null;
      }
      throw error;
    }

    if (!userData) {
      devLog.warn(`[getUserDataAdmin] User document not found for ID: ${userId} (authService.admin.ts)`);
      return null;
    }

    // Mapear dados do Supabase para o formato UserData esperado
    return {
      id: userData.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      userType: userData.role,
      createdAt: userData.created_at,
      updatedAt: userData.updated_at,
      // Campos de notificação
      emailNotificacaoStatus: userData.email_notificacao_status,
      emailNotificacaoDocumentos: userData.email_notificacao_documentos,
      emailNotificacaoComentarios: userData.email_notificacao_comentarios,
      // Campos opcionais
      phone: userData.phone,
      phoneNumber: userData.phone_number,
      isCompany: userData.is_company,
      companyName: userData.company_name,
      cnpj: userData.cnpj,
      cpf: userData.cpf,
      pendingApproval: userData.pending_approval,
      emailNotifications: userData.email_notifications,
      whatsappNotifications: userData.whatsapp_notifications,
      emailNotificationStatus: userData.email_notification_status,
      emailNotificationDocuments: userData.email_notification_documents,
      emailNotificationComments: userData.email_notification_comments,
      empresaIntegradora: userData.empresa_integradora,
      document: userData.document,
      companyDocument: userData.company_document,
    } as UserData;
  } catch (error) {
    devLog.error(`[getUserDataAdmin] Error fetching user data for ID ${userId} (authService.admin.ts):`, error);
    return null; 
  }
}
