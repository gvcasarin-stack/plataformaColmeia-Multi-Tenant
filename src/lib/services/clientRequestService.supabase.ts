// ✅ SUPABASE - Serviço de solicitações de clientes para produção
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import logger from '@/lib/utils/logger';

/**
 * SERVIÇO DE SOLICITAÇÕES DE CLIENTES SUPABASE - PRODUÇÃO READY
 * 
 * Migração completa do Firebase Auth + Firestore para Supabase Auth + Database
 * Mantém 100% de compatibilidade com o sistema existente
 */

// Cache mechanism (mantendo estrutura original)
const CACHE_EXPIRY_TIME = 2 * 60 * 1000; // 2 minutos
let clientRequestsCache = {
  data: [] as ClientRequest[],
  timestamp: 0,
  refreshing: false
};

// Token refresh tracking (mantendo para Supabase)
let lastTokenRefresh = 0;
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

export interface ClientRequest {
  id: string;
  userId?: string;
  email: string;
  name: string;
  phone: string;
  password?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isCompany: boolean;
  razaoSocial?: string;
  nomeCompleto?: string;
  cnpj?: string;
  cpf?: string;
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
}

/**
 * ✅ PRODUÇÃO - Criar solicitação de cliente (equivalente ao Firebase)
 */
export async function createClientRequest(data: Omit<ClientRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
  let authUserId: string | null = null;

  try {
    logger.info('[ClientRequestService] [SUPABASE] Iniciando processo de registro:', {
      email: data.email,
      name: data.name,
      isCompany: data.isCompany
    });

    // ✅ PRODUÇÃO - Validações (mantendo lógica original)
    if (!data.password || data.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }

    if (data.isCompany) {
      if (!data.razaoSocial) {
        throw new Error('Razão Social é obrigatório para cadastros empresariais.');
      }
      if (!data.cnpj) {
        throw new Error('CNPJ é obrigatório para cadastros empresariais.');
      }
    }

    if (!data.isCompany && !data.cpf) {
      throw new Error('CPF é obrigatório para cadastros de pessoa física.');
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ PRODUÇÃO - 1. Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: false, // Será confirmado após aprovação admin
      user_metadata: {
        name: data.name,
        displayName: data.name
      }
    });

    if (authError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao criar usuário Auth:', authError);
      throw new Error(authError.message || 'Erro ao criar conta de usuário');
    }

    authUserId = authUser.user.id;
    logger.info('[ClientRequestService] [SUPABASE] Usuário Auth criado:', authUserId);

    // ✅ PRODUÇÃO - 2. Criar documento do usuário na tabela users (CORRIGIDO)
    const { error: userDocError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        email: data.email,
        full_name: data.name, // ✅ CORREÇÃO: Usar full_name
        role: 'cliente', // ✅ CORREÇÃO: Usar 'cliente' como padrão
        phone: data.phone,
        is_company: data.isCompany, // ✅ CORREÇÃO: Snake_case
        company_name: data.isCompany ? data.razaoSocial : null, // ✅ CORREÇÃO: Mapear company_name
        cnpj: data.isCompany ? data.cnpj : null,
        cpf: !data.isCompany ? data.cpf : null,
        pending_approval: true, // ✅ CORREÇÃO: Snake_case
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // ✅ PRODUÇÃO - Configurações padrão de notificação (snake_case)
        email_notification_status: true,
        email_notification_documents: true,
        email_notification_comments: true
      });

    if (userDocError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao criar documento usuário:', userDocError);
      
      // ✅ PRODUÇÃO - Cleanup: remover usuário Auth se falhou criar documento
      try {
        await supabase.auth.admin.deleteUser(authUserId);
        logger.info('[ClientRequestService] [SUPABASE] Usuário Auth removido após erro no documento');
      } catch (cleanupError) {
        logger.error('[ClientRequestService] [SUPABASE] Erro ao limpar usuário Auth:', cleanupError);
      }
      
      throw new Error('Erro ao criar perfil do usuário');
    }

    logger.info('[ClientRequestService] [SUPABASE] Documento do usuário criado com pendingApproval');

    // ✅ PRODUÇÃO - 3. Criar notificações para admins
    try {
      // Buscar todos os admins
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      if (adminError) {
        logger.error('[ClientRequestService] [SUPABASE] Erro ao buscar admins:', adminError);
      } else if (admins && admins.length > 0) {
        // ✅ PRODUÇÃO - Criar notificações individuais para cada admin
        const notifications = admins.map(admin => ({
          type: 'new_client_registration',
          title: 'Novo Cadastro de Cliente',
          message: `${data.name} solicitou cadastro na plataforma.`,
          userId: admin.id,
          adminId: 'system',
          read: false,
          created_at: new Date().toISOString(),
          metadata: JSON.stringify({
            clientId: authUserId,
            clientName: data.name,
            isCompany: data.isCompany,
            companyName: data.isCompany ? data.razaoSocial : null
          })
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          logger.error('[ClientRequestService] [SUPABASE] Erro ao criar notificações individuais:', notificationError);
        } else {
          logger.info('[ClientRequestService] [SUPABASE] Notificações individuais criadas para admins');
        }
      }

      // ✅ PRODUÇÃO - Criar notificação global para admins
      const { error: globalNotificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'new_client_registration',
          title: 'Novo Cadastro de Cliente',
          message: `${data.name} solicitou cadastro na plataforma.`,
          userId: 'all_admins',
          projectId: 'system',
          projectNumber: 'N/A',
          read: false,
          created_at: new Date().toISOString(),
          data: JSON.stringify({
            clientId: authUserId,
            clientName: data.name,
            isCompany: data.isCompany,
            companyName: data.isCompany ? data.razaoSocial : null
          })
        });

      if (globalNotificationError) {
        logger.error('[ClientRequestService] [SUPABASE] Erro ao criar notificação global:', globalNotificationError);
      } else {
        logger.info('[ClientRequestService] [SUPABASE] Notificação global criada para registro de cliente');
      }
      
    } catch (notificationError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro nas notificações (não-bloqueante):', notificationError);
      // Erro não-bloqueante, continuar com o registro
    }

    // ✅ PRODUÇÃO - Invalidar cache após criar nova solicitação
    clientRequestsCache.data = [];
    clientRequestsCache.timestamp = 0;

    return {
      success: true,
      userId: authUserId,
      message: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador.'
    };

  } catch (error: any) {
    logger.error('[ClientRequestService] [SUPABASE] Erro em createClientRequest:', error);
    
    // ✅ PRODUÇÃO - Cleanup se criou usuário mas falhou depois
    if (authUserId) {
      try {
        const supabase = createSupabaseServiceRoleClient();
        await supabase.auth.admin.deleteUser(authUserId);
        logger.info('[ClientRequestService] [SUPABASE] Cleanup do usuário Auth após erro');
      } catch (cleanupError) {
        logger.error('[ClientRequestService] [SUPABASE] Erro no cleanup do usuário Auth:', cleanupError);
      }
    }
    
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Buscar solicitações pendentes de cliente (CORRIGIDO)
 */
export async function getPendingClientRequests(): Promise<ClientRequest[]> {
  try {
    logger.debug('[ClientRequestService] [SUPABASE] Buscando solicitações pendentes');
    
    // ✅ PRODUÇÃO - Verificar cache (mantendo lógica original)
    const now = Date.now();
    if (clientRequestsCache.timestamp > 0 && now - clientRequestsCache.timestamp < CACHE_EXPIRY_TIME) {
      logger.debug('[ClientRequestService] [SUPABASE] Retornando solicitações do cache');
      return clientRequestsCache.data;
    }
    
    // ✅ PRODUÇÃO - Prevenir requests paralelos (mantendo lógica original)
    if (clientRequestsCache.refreshing) {
      logger.debug('[ClientRequestService] [SUPABASE] Aguardando request em andamento...');
      
      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (clientRequestsCache.timestamp > 0 && now - clientRequestsCache.timestamp < CACHE_EXPIRY_TIME) {
          logger.debug('[ClientRequestService] [SUPABASE] Cache atualizado durante espera');
          return clientRequestsCache.data;
        }
      }
    }
    
    clientRequestsCache.refreshing = true;
    
    try {
      const supabase = createSupabaseBrowserClient();
      
      // ✅ CORREÇÃO: Buscar usuários com pending_approval = true (snake_case)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('pending_approval', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('[ClientRequestService] [SUPABASE] Erro ao buscar solicitações:', error);
        throw new Error('Erro ao buscar solicitações de clientes');
      }
      
      // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
      const sanitizeDate = (dateField: any): string => {
        if (!dateField) return new Date().toISOString();
        if (typeof dateField === 'string') return dateField;
        if (dateField instanceof Date) return dateField.toISOString();
        return new Date(dateField).toISOString();
      };

      // ✅ PRODUÇÃO - Mapear para formato ClientRequest (compatibilidade)
      const clientRequests: ClientRequest[] = (data || []).map(user => ({
        id: user.id,
        userId: user.id,
        email: user.email,
        name: user.full_name || user.name, // ✅ CORREÇÃO: Usar full_name se disponível
        phone: user.phone || '',
        status: 'pending' as const,
        isCompany: user.is_company || false, // ✅ CORREÇÃO: Snake_case
        razaoSocial: user.company_name || undefined, // ✅ CORREÇÃO: Mapear company_name
        nomeCompleto: user.full_name || undefined,
        cnpj: user.cnpj || undefined,
        cpf: user.cpf || undefined,
        createdAt: sanitizeDate(user.created_at),
        updatedAt: sanitizeDate(user.updated_at),
        rejectionReason: undefined
      }));
      
      // ✅ PRODUÇÃO - Atualizar cache
      clientRequestsCache.data = clientRequests;
      clientRequestsCache.timestamp = now;
      
      logger.info('[ClientRequestService] [SUPABASE] Solicitações obtidas:', clientRequests.length);
      return clientRequestsCache.data;
      
    } finally {
      clientRequestsCache.refreshing = false;
    }
    
  } catch (error) {
    logger.error('[ClientRequestService] [SUPABASE] Erro em getPendingClientRequests:', error);
    
    // ✅ PRODUÇÃO - Fallback: retornar cache expirado se disponível
    if (clientRequestsCache.data.length > 0) {
      logger.warn('[ClientRequestService] [SUPABASE] Retornando cache expirado devido a erro');
      return clientRequestsCache.data;
    }
    
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Aprovar solicitação de cliente
 */
export async function approveClientRequest(requestId: string): Promise<void> {
  try {
    logger.info('[ClientRequestService] [SUPABASE] Aprovando solicitação:', requestId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ PRODUÇÃO - 1. Atualizar pendingApproval para false
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        pending_approval: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (updateError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao atualizar usuário:', updateError);
      throw new Error('Erro ao aprovar solicitação de cliente');
    }
    
    // ✅ PRODUÇÃO - 2. Confirmar email no Supabase Auth
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      requestId,
      { email_confirm: true }
    );
    
    if (confirmError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao confirmar email:', confirmError);
      // Não-bloqueante, apenas log
    }
    
    // ✅ PRODUÇÃO - 3. Invalidar cache
    clientRequestsCache.data = [];
    clientRequestsCache.timestamp = 0;
    
    logger.info('[ClientRequestService] [SUPABASE] Solicitação aprovada com sucesso');
    
  } catch (error: any) {
    logger.error('[ClientRequestService] [SUPABASE] Erro em approveClientRequest:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Rejeitar solicitação de cliente
 */
export async function rejectClientRequest(requestId: string, reason?: string): Promise<void> {
  try {
    logger.info('[ClientRequestService] [SUPABASE] Rejeitando solicitação:', requestId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ PRODUÇÃO - 1. Buscar dados do usuário antes de deletar
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('email, name')
      .eq('id', requestId)
      .single();
    
    if (fetchError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao buscar dados do usuário:', fetchError);
      throw new Error('Usuário não encontrado');
    }
    
    // ✅ PRODUÇÃO - 2. Remover usuário da tabela users
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', requestId);
    
    if (deleteUserError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao remover usuário:', deleteUserError);
      throw new Error('Erro ao rejeitar solicitação de cliente');
    }
    
    // ✅ PRODUÇÃO - 3. Remover usuário do Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(requestId);
    
    if (deleteAuthError) {
      logger.error('[ClientRequestService] [SUPABASE] Erro ao remover usuário Auth (não-bloqueante):', deleteAuthError);
      // Não-bloqueante, pois o importante é remover da tabela users
    }
    
    // ✅ PRODUÇÃO - 4. Invalidar cache
    clientRequestsCache.data = [];
    clientRequestsCache.timestamp = 0;
    
    logger.info('[ClientRequestService] [SUPABASE] Solicitação rejeitada com sucesso');
    
  } catch (error: any) {
    logger.error('[ClientRequestService] [SUPABASE] Erro em rejectClientRequest:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Buscar solicitação por ID (CORRIGIDO)
 */
export async function getClientRequestById(requestId: string): Promise<ClientRequest> {
  try {
    logger.debug(`[ClientRequestService] [SUPABASE] Buscando solicitação ${requestId}`);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', requestId)
      .eq('pending_approval', true) // ✅ CORREÇÃO: Snake_case
      .single();
    
    if (error || !data) {
      logger.error('[ClientRequestService] [SUPABASE] Solicitação não encontrada:', error);
      throw new Error('Solicitação não encontrada');
    }
    
    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // ✅ PRODUÇÃO - Mapear para formato ClientRequest (CORRIGIDO)
    const clientRequest: ClientRequest = {
      id: data.id,
      userId: data.id,
      email: data.email,
      name: data.full_name || data.name, // ✅ CORREÇÃO: Usar full_name
      phone: data.phone || '',
      status: 'pending' as const,
      isCompany: data.is_company || false, // ✅ CORREÇÃO: Snake_case
      razaoSocial: data.company_name || undefined, // ✅ CORREÇÃO: Mapear company_name
      nomeCompleto: data.full_name || undefined,
      cnpj: data.cnpj || undefined,
      cpf: data.cpf || undefined,
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
      rejectionReason: undefined
    };
    
    logger.debug('[ClientRequestService] [SUPABASE] Solicitação encontrada:', clientRequest.id);
    return clientRequest;
    
  } catch (error: any) {
    logger.error('[ClientRequestService] [SUPABASE] Erro em getClientRequestById:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Função de verificação de saúde do serviço
 */
export async function checkClientRequestServiceHealth(): Promise<{ status: string; details: any }> {
  try {
    const startTime = Date.now();
    
    // Teste básico: buscar solicitações pendentes
    const requests = await getPendingClientRequests();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      status: 'healthy',
      details: {
        service: 'ClientRequestService Supabase',
        responseTime: `${responseTime}ms`,
        pendingRequests: requests.length,
        cacheStatus: {
          hasCache: clientRequestsCache.data.length > 0,
          cacheAge: Date.now() - clientRequestsCache.timestamp,
          isRefreshing: clientRequestsCache.refreshing
        }
      }
    };
  } catch (error) {
    logger.error('[ClientRequestService] [SUPABASE] Health check falhou:', error);
    return {
      status: 'unhealthy',
      details: {
        service: 'ClientRequestService Supabase',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    };
  }
}
