/**
 * @file supabase.ts
 * @description Serviços de usuários usando Supabase
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { UserData } from '@/lib/services/authService.supabase';
import logger from '@/lib/utils/logger';

// Cliente Supabase para operações no browser
const supabase = createSupabaseBrowserClient();

/**
 * Atualiza dados do usuário no Supabase
 * @param userId ID do usuário
 * @param updateData Dados para atualizar
 * @returns Dados atualizados do usuário
 */
export const updateUserData = async (userId: string, updateData: Partial<UserData>): Promise<UserData> => {
  try {
    logger.debug('[updateUserData] Atualizando dados do usuário:', { userId, updateData });

    // Preparar dados para atualização (mapear para formato do Supabase)
    const supabaseData: any = {
      updated_at: new Date().toISOString(),
    };

    // Mapear campos do UserData para campos do Supabase
    if (updateData.name !== undefined) supabaseData.full_name = updateData.name;
    if (updateData.email !== undefined) supabaseData.email = updateData.email;
    if (updateData.phone !== undefined) supabaseData.phone = updateData.phone;
    if (updateData.companyName !== undefined) supabaseData.company_name = updateData.companyName;
    if (updateData.isCompany !== undefined) supabaseData.is_company = updateData.isCompany;
    if (updateData.cpf !== undefined) supabaseData.cpf = updateData.cpf;
    if (updateData.cnpj !== undefined) supabaseData.cnpj = updateData.cnpj;
    if (updateData.emailNotifications !== undefined) supabaseData.email_notifications = updateData.emailNotifications;
    if (updateData.whatsappNotifications !== undefined) supabaseData.whatsapp_notifications = updateData.whatsappNotifications;
    if (updateData.emailNotificacaoStatus !== undefined) supabaseData.email_notificacao_status = updateData.emailNotificacaoStatus;
    if (updateData.emailNotificacaoDocumentos !== undefined) supabaseData.email_notificacao_documentos = updateData.emailNotificacaoDocumentos;
    if (updateData.emailNotificacaoComentarios !== undefined) supabaseData.email_notificacao_comentarios = updateData.emailNotificacaoComentarios;

    const { data, error } = await supabase
      .from('users')
      .update(supabaseData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('Nenhum dado retornado após atualização');
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear dados do Supabase de volta para UserData
    const userData: UserData = {
      id: data.id,
      name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      companyName: data.company_name || '',
      isCompany: data.is_company || false,
      cpf: data.cpf || '',
      cnpj: data.cnpj || '',
      role: data.role || 'cliente',
      pendingApproval: data.pending_approval || false,
      emailNotifications: data.email_notifications !== undefined ? data.email_notifications : true,
      whatsappNotifications: data.whatsapp_notifications !== undefined ? data.whatsapp_notifications : false,
      emailNotificacaoStatus: data.email_notificacao_status !== undefined ? data.email_notificacao_status : true,
      emailNotificacaoDocumentos: data.email_notificacao_documentos !== undefined ? data.email_notificacao_documentos : true,
      emailNotificacaoComentarios: data.email_notificacao_comentarios !== undefined ? data.email_notificacao_comentarios : true,
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
    };

    logger.debug('[updateUserData] Dados do usuário atualizados com sucesso:', { userId, userData });
    return userData;

  } catch (error) {
    logger.error('[updateUserData] Erro ao atualizar dados do usuário:', error);
    throw new Error(`Erro ao atualizar dados do usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Atualiza uma preferência específica de notificação
 * @param userId ID do usuário
 * @param preference Tipo de preferência
 * @param value Valor da preferência
 */
export const updateNotificationPreference = async (
  userId: string,
  preference: 'emailNotifications' | 'whatsappNotifications' | 'emailNotificacaoStatus' | 'emailNotificacaoDocumentos' | 'emailNotificacaoComentarios',
  value: boolean
): Promise<void> => {
  try {
    logger.debug('[updateNotificationPreference] Atualizando preferência:', { userId, preference, value });

    // Mapear preferência para campo do Supabase
    const fieldMap = {
      emailNotifications: 'email_notifications',
      whatsappNotifications: 'whatsapp_notifications',
      emailNotificacaoStatus: 'email_notificacao_status',
      emailNotificacaoDocumentos: 'email_notificacao_documentos',
      emailNotificacaoComentarios: 'email_notificacao_comentarios',
    };

    const supabaseField = fieldMap[preference];
    if (!supabaseField) {
      throw new Error(`Preferência inválida: ${preference}`);
    }

    const { error } = await supabase
      .from('users')
      .update({
        [supabaseField]: value,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.debug('[updateNotificationPreference] Preferência atualizada com sucesso:', { userId, preference, value });

  } catch (error) {
    logger.error('[updateNotificationPreference] Erro ao atualizar preferência:', error);
    throw new Error(`Erro ao atualizar preferência: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Busca dados básicos do usuário
 * @param userId ID do usuário
 * @returns Dados básicos do usuário
 */
export const getUserBasicData = async (userId: string): Promise<UserData | null> => {
  try {
    logger.debug('[getUserBasicData] Buscando dados básicos do usuário:', userId);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('[getUserBasicData] Usuário não encontrado:', userId);
        return null;
      }
      throw error;
    }

    if (!data) {
      logger.warn('[getUserBasicData] Nenhum dado retornado para usuário:', userId);
      return null;
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear dados do Supabase para UserData
    const userData: UserData = {
      id: data.id,
      name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      companyName: data.company_name || '',
      isCompany: data.is_company || false,
      cpf: data.cpf || '',
      cnpj: data.cnpj || '',
      role: data.role || 'cliente',
      pendingApproval: data.pending_approval || false,
      emailNotifications: data.email_notifications !== undefined ? data.email_notifications : true,
      whatsappNotifications: data.whatsapp_notifications !== undefined ? data.whatsapp_notifications : false,
      emailNotificacaoStatus: data.email_notificacao_status !== undefined ? data.email_notificacao_status : true,
      emailNotificacaoDocumentos: data.email_notificacao_documentos !== undefined ? data.email_notificacao_documentos : true,
      emailNotificacaoComentarios: data.email_notificacao_comentarios !== undefined ? data.email_notificacao_comentarios : true,
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
    };

    logger.debug('[getUserBasicData] Dados do usuário encontrados:', { userId, role: userData.role });
    return userData;

  } catch (error) {
    logger.error('[getUserBasicData] Erro ao buscar dados do usuário:', error);
    throw new Error(`Erro ao buscar dados do usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Atualiza múltiplos campos do usuário de uma vez
 * @param userId ID do usuário
 * @param updates Objeto com os campos a serem atualizados
 */
export const updateUserFields = async (userId: string, updates: Record<string, any>): Promise<void> => {
  try {
    logger.debug('[updateUserFields] Atualizando múltiplos campos:', { userId, updates });

    const { error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }

    logger.debug('[updateUserFields] Campos atualizados com sucesso:', { userId, fieldsCount: Object.keys(updates).length });

  } catch (error) {
    logger.error('[updateUserFields] Erro ao atualizar campos do usuário:', error);
    throw new Error(`Erro ao atualizar campos do usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};
