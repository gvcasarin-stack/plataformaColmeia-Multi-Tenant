// ✅ SUPABASE - Serviços de autenticação migrados para Supabase
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'user' | 'cliente';
  userType?: 'superadmin' | 'admin' | 'user' | 'cliente';
  createdAt: string;
  updatedAt: string;
  phone?: string;
  phoneNumber?: string;
  isCompany?: boolean;
  companyName?: string;
  cnpj?: string;
  cpf?: string;
  pendingApproval?: boolean;
  emailNotifications?: boolean;
  whatsappNotifications?: boolean;
  emailNotificationStatus?: boolean;
  emailNotificationDocuments?: boolean;
  emailNotificationComments?: boolean;
  emailNotificacaoStatus?: boolean;
  emailNotificacaoDocumentos?: boolean;
  emailNotificacaoComentarios?: boolean;
  // Campos adicionais para integração
  empresaIntegradora?: string;
  document?: string;
  companyDocument?: string;
  full_name?: string; // Campo do Supabase
}

/**
 * ✅ SUPABASE - Busca dados do usuário no Supabase (versão cliente)
 */
export async function getUserDataSupabase(userId: string): Promise<UserData | null> {
  try {
    devLog.log(`[getUserDataSupabase] Buscando dados do usuário: ${userId}`);
    
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        devLog.warn(`[getUserDataSupabase] Usuário não encontrado: ${userId}`);
        return null;
      }
      devLog.error(`[getUserDataSupabase] Erro ao buscar usuário ${userId}:`, error);
      throw new Error(`Erro ao buscar dados do usuário: ${error.message}`);
    }

    if (!data) {
      devLog.warn(`[getUserDataSupabase] Nenhum dado retornado para usuário: ${userId}`);
      return null;
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear campos do Supabase para a interface UserData
    const userData: UserData = {
      id: data.id,
      email: data.email || '',
      name: data.full_name || data.name || data.email || '',
      role: data.role || 'cliente',
      userType: data.role || 'cliente',
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
      phone: data.phone,
      phoneNumber: data.phone,
      isCompany: data.is_company,
      companyName: data.company_name,
      cnpj: data.cnpj,
      cpf: data.cpf,
      pendingApproval: data.pending_approval,
      emailNotifications: data.email_notifications,
      whatsappNotifications: data.whatsapp_notifications,
      emailNotificationStatus: data.email_notification_status,
      emailNotificationDocuments: data.email_notification_documents,
      emailNotificationComments: data.email_notification_comments,
      emailNotificacaoStatus: data.email_notification_status,
      emailNotificacaoDocumentos: data.email_notification_documents,
      emailNotificacaoComentarios: data.email_notification_comments,
      empresaIntegradora: data.empresa_integradora,
      document: data.document,
      companyDocument: data.company_document,
      full_name: data.full_name
    };

    devLog.log(`[getUserDataSupabase] Dados do usuário carregados com sucesso:`, {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    });

    return userData;
  } catch (error) {
    devLog.error(`[getUserDataSupabase] Erro ao buscar dados do usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * ✅ SUPABASE - Busca dados do usuário no Supabase (versão admin com Service Role)
 */
export async function getUserDataAdminSupabase(userId: string): Promise<UserData | null> {
  try {
    devLog.log(`[getUserDataAdminSupabase] Buscando dados do usuário (admin): ${userId}`);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        devLog.warn(`[getUserDataAdminSupabase] Usuário não encontrado: ${userId}`);
        return null;
      }
      devLog.error(`[getUserDataAdminSupabase] Erro ao buscar usuário ${userId}:`, error);
      throw new Error(`Erro ao buscar dados do usuário: ${error.message}`);
    }

    if (!data) {
      devLog.warn(`[getUserDataAdminSupabase] Nenhum dado retornado para usuário: ${userId}`);
      return null;
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear campos do Supabase para a interface UserData
    const userData: UserData = {
      id: data.id,
      email: data.email || '',
      name: data.full_name || data.name || data.email || '',
      role: data.role || 'cliente',
      userType: data.role || 'cliente',
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
      phone: data.phone,
      phoneNumber: data.phone,
      isCompany: data.is_company,
      companyName: data.company_name,
      cnpj: data.cnpj,
      cpf: data.cpf,
      pendingApproval: data.pending_approval,
      emailNotifications: data.email_notifications,
      whatsappNotifications: data.whatsapp_notifications,
      emailNotificationStatus: data.email_notification_status,
      emailNotificationDocuments: data.email_notification_documents,
      emailNotificationComments: data.email_notification_comments,
      emailNotificacaoStatus: data.email_notification_status,
      emailNotificacaoDocumentos: data.email_notification_documents,
      emailNotificacaoComentarios: data.email_notification_comments,
      empresaIntegradora: data.empresa_integradora,
      document: data.document,
      companyDocument: data.company_document,
      full_name: data.full_name
    };

    devLog.log(`[getUserDataAdminSupabase] Dados do usuário carregados com sucesso:`, {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    });

    return userData;
  } catch (error) {
    devLog.error(`[getUserDataAdminSupabase] Erro ao buscar dados do usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * ✅ SUPABASE - Atualiza dados do usuário no Supabase
 */
export async function updateUserDataSupabase(userId: string, updates: Partial<UserData>): Promise<UserData | null> {
  try {
    devLog.log(`[updateUserDataSupabase] Atualizando dados do usuário: ${userId}`, updates);
    
    const supabase = createSupabaseBrowserClient();
    
    // Mapear campos da interface UserData para campos do Supabase
    const supabaseUpdates: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) supabaseUpdates.full_name = updates.name;
    if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
    if (updates.isCompany !== undefined) supabaseUpdates.is_company = updates.isCompany;
    if (updates.companyName !== undefined) supabaseUpdates.company_name = updates.companyName;
    if (updates.cnpj !== undefined) supabaseUpdates.cnpj = updates.cnpj;
    if (updates.cpf !== undefined) supabaseUpdates.cpf = updates.cpf;
    if (updates.pendingApproval !== undefined) supabaseUpdates.pending_approval = updates.pendingApproval;
    if (updates.emailNotifications !== undefined) supabaseUpdates.email_notifications = updates.emailNotifications;
    if (updates.whatsappNotifications !== undefined) supabaseUpdates.whatsapp_notifications = updates.whatsappNotifications;
    if (updates.emailNotificationStatus !== undefined) supabaseUpdates.email_notification_status = updates.emailNotificationStatus;
    if (updates.emailNotificationDocuments !== undefined) supabaseUpdates.email_notification_documents = updates.emailNotificationDocuments;
    if (updates.emailNotificationComments !== undefined) supabaseUpdates.email_notification_comments = updates.emailNotificationComments;
    if (updates.empresaIntegradora !== undefined) supabaseUpdates.empresa_integradora = updates.empresaIntegradora;
    if (updates.document !== undefined) supabaseUpdates.document = updates.document;
    if (updates.companyDocument !== undefined) supabaseUpdates.company_document = updates.companyDocument;

    const { data, error } = await supabase
      .from('users')
      .update(supabaseUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      devLog.error(`[updateUserDataSupabase] Erro ao atualizar usuário ${userId}:`, error);
      throw new Error(`Erro ao atualizar dados do usuário: ${error.message}`);
    }

    devLog.log(`[updateUserDataSupabase] Dados do usuário atualizados com sucesso:`, data);
    
    // Retornar os dados atualizados
    return await getUserDataSupabase(userId);
  } catch (error) {
    devLog.error(`[updateUserDataSupabase] Erro ao atualizar dados do usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * ✅ SUPABASE - Reset de senha via email
 * @param email Email do usuário
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    devLog.log('[Auth] Attempting to send password reset email to:', email);
    
    const supabase = createSupabaseBrowserClient();
    
    // Determinar URL de redirecionamento baseado na seção atual
    const isAdminSection = typeof window !== 'undefined' ? window.location.pathname.includes('/admin') : false;
    const redirectPath = isAdminSection ? '/admin' : '/cliente/login';
    const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}${redirectPath}`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });
    
    if (error) {
      devLog.error('[Auth] Erro ao enviar email de reset:', error);
      throw new Error('Erro ao enviar email de recuperação de senha. Verifique se o email está correto.');
    }
    
    devLog.log('[Auth] Password reset email sent successfully to:', email);
  } catch (error) {
    devLog.error('[Auth] Erro no resetPassword:', error);
    throw error;
  }
}

/**
 * ✅ SUPABASE - Alterar senha do usuário
 * @param currentPassword Senha atual (não usada no Supabase, mas mantida para compatibilidade)
 * @param newPassword Nova senha
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    devLog.log('[Auth] Attempting to change password');
    
    const supabase = createSupabaseBrowserClient();
    
    // No Supabase, não precisamos da senha atual para alterar
    // A autenticação já é verificada pela sessão ativa
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      devLog.error('[Auth] Erro ao alterar senha:', error);
      
      if (error.message.includes('Password should be at least')) {
        throw new Error('A nova senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (error.message.includes('Unable to validate JWT')) {
        throw new Error('Esta operação requer autenticação recente. Por favor, faça login novamente.');
      } else {
        throw new Error('Erro ao alterar a senha. Por favor, tente novamente.');
      }
    }
    
    devLog.log('[Auth] Password changed successfully');
  } catch (error) {
    devLog.error('[Auth] Erro no changePassword:', error);
    throw error;
  }
} 