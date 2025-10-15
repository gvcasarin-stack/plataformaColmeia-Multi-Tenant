import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';

/**
 * API para buscar perfil do usuário
 * GET /api/user/profile?userId=ID
 * 
 * COMPATÍVEL COM MULTI-TENANT - Funciona tanto para admin quanto cliente
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    devLog.log('[API User Profile] Buscando perfil do usuário:', userId);

    // ✅ MULTI-TENANT: Obter tenant_id dos headers se disponível
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    devLog.log('[API User Profile] Headers multi-tenant:', {
      tenantId,
      userId,
      hostname: headersList.get('host')
    });

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API User Profile] Tenant temporário detectado (dev), retornando perfil simulado:', tenantId);
      return NextResponse.json({
        id: userId,
        name: 'Usuário Temp (Dev)',
        email: 'temp@dev.com',
        role: 'admin' // Para permitir acesso ao painel admin em desenvolvimento
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API User Profile] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId, userId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 }); // Service Unavailable
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ SEGURANÇA MULTI-TENANT: Tentar com filtro de tenant primeiro, fallback sem filtro
    let userData = null;
    let error = null;
    
    devLog.log('[API User Profile] Tentando busca com filtro de tenant:', tenantId);
    
    if (tenantId) {
      // Primeira tentativa: com filtro de tenant
      const { data: tenantUserData, error: tenantError } = await supabase
        .from('users')
        .select(`
          id, name, email, role, tenant_id, status, phone,
          cpf, cnpj, is_company, company_name,
          permissions, settings, user_type, is_blocked, blocked_reason,
          last_login, login_count, auth_provider, avatar_url, department, position,
          created_at, updated_at, created_by
        `)
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();
      
      if (tenantError || !tenantUserData) {
        devLog.warn('[API User Profile] Busca com tenant falhou, tentando sem filtro:', {
          error: tenantError?.message,
          tenantId,
          userId
        });
        
        // Segunda tentativa: sem filtro de tenant
        const { data: fallbackUserData, error: fallbackError } = await supabase
          .from('users')
          .select(`
            id, name, email, role, tenant_id, status, phone,
            is_company, company_name, cpf, cnpj,
            email_notifications, whatsapp_notifications,
            email_notification_status, email_notification_documents, email_notification_comments,
            created_at, updated_at
          `)
          .eq('id', userId)
          .single();
        
        if (fallbackError || !fallbackUserData) {
          error = fallbackError;
          userData = null;
        } else {
          userData = fallbackUserData;
          error = null;
          
          devLog.warn('[API User Profile] Usuário encontrado sem filtro de tenant - possível inconsistência:', {
            userId,
            userTenantId: fallbackUserData.tenant_id,
            requestTenantId: tenantId,
            tenantMatch: fallbackUserData.tenant_id === tenantId
          });
        }
      } else {
        userData = tenantUserData;
        error = null;
        devLog.log('[API User Profile] Usuário encontrado com filtro de tenant com sucesso');
      }
    } else {
      // Sem tenant_id nos headers - busca direta
      devLog.warn('[API User Profile] Tenant_id não encontrado nos headers - busca direta');
      const { data: directUserData, error: directError } = await supabase
        .from('users')
        .select(`
          id, name, email, role, tenant_id, status, phone,
          cpf, cnpj, is_company, company_name,
          permissions, settings, user_type, is_blocked, blocked_reason,
          last_login, login_count, auth_provider, avatar_url, department, position,
          created_at, updated_at, created_by
        `)
        .eq('id', userId)
        .single();
      
      userData = directUserData;
      error = directError;
    }
    
    if (error) {
      devLog.error('[API User Profile] Erro final ao buscar usuário:', {
        error: error.message,
        code: error.code,
        userId,
        tenantId
      });
      
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    if (!userData) {
      devLog.warn('[API User Profile] Usuário não encontrado:', userId);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API User Profile] Perfil encontrado com sucesso:', {
      userId: userData.id,
      role: userData.role,
      tenantId: userData.tenant_id,
      requestTenant: tenantId,
      tenantMatch: userData.tenant_id === tenantId
    });
    
    // Sanitizar campos de data
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Extrair dados dos campos JSON
    let settings = {};
    let permissions = {};

    try {
      if (userData.settings) {
        settings = typeof userData.settings === 'string' ? JSON.parse(userData.settings) : userData.settings;
      }
    } catch (e) {
      devLog.warn('[API User Profile] Erro ao parsear settings JSON:', e);
    }

    try {
      if (userData.permissions) {
        permissions = typeof userData.permissions === 'string' ? JSON.parse(userData.permissions) : userData.permissions;
      }
    } catch (e) {
      devLog.warn('[API User Profile] Erro ao parsear permissions JSON:', e);
    }

    devLog.log('[API User Profile] Permissions extraídas:', { permissions, hasPermissions: !!permissions });

    // Extrair preferências de notificação dos settings
    const notifications = settings.notifications || {};

    return NextResponse.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      phone: userData.phone,
      userType: userData.user_type,
      isBlocked: userData.is_blocked,
      blockedReason: userData.blocked_reason,
      avatarUrl: userData.avatar_url,
      department: userData.department,
      position: userData.position,
      lastLogin: userData.last_login,
      loginCount: userData.login_count,
      authProvider: userData.auth_provider,
      // Campos derivados dos JSON fields
      permissions: permissions,
      settings: settings,
      // Preferências de notificação dos settings
      emailNotifications: notifications.email !== undefined ? notifications.email : true,
      whatsappNotifications: notifications.whatsapp !== undefined ? notifications.whatsapp : false,
      emailNotificacaoStatus: notifications.project_updates !== undefined ? notifications.project_updates : true,
      emailNotificacaoDocumentos: notifications.document_updates !== undefined ? notifications.document_updates : true,
      emailNotificacaoComentarios: notifications.comment_updates !== undefined ? notifications.comment_updates : true,
      // ✅ Campos de pessoa física/jurídica
      isCompany: userData.is_company || false,
      companyName: userData.company_name || '',
      cpf: userData.cpf || '',
      cnpj: userData.cnpj || '',
      createdAt: sanitizeDate(userData.created_at),
      updatedAt: sanitizeDate(userData.updated_at)
    });
    
  } catch (error) {
    devLog.error('[API User Profile] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}