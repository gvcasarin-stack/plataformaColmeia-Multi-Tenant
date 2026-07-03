import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { sendClientWelcomeEmail } from '@/lib/services/emailService';
import {
  createApiSuccess,
  createApiError,
  handleApiError,
  ApiErrorCode,
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * API: POST /api/admin/create-client
 *
 * Cria um cliente diretamente pelo painel admin, sem etapa de aprovação.
 * Usa service role client. O adminUserId vem do body e é verificado no banco.
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-CreateClient] Iniciando criação de cliente');

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();

    const {
      adminUserId,
      name,
      email,
      password,
      phone,
      isCompany,
      companyName,
      cnpj,
      cpf,
    } = body;

    if (!adminUserId || !name || !email || !password) {
      return createApiError(
        'Campos obrigatórios faltando: adminUserId, name, email, password',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }

    // Verificar se o solicitante é admin
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminData) {
      logger.error('[API-CreateClient] Erro ao buscar admin:', adminError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    if (!['admin', 'superadmin', 'owner'].includes(adminData.role)) {
      return createApiError(
        'Permissões de administrador necessárias',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Obter contexto da tenant a partir dos headers injetados pelo middleware
    const tenantId = request.headers.get('x-tenant-id') || adminData.tenant_id;
    const tenantName = request.headers.get('x-tenant-name') || 'Sistema';
    const tenantSlug = request.headers.get('x-tenant-slug') || '';
    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const loginUrl = `${protocol}://${host}/cliente/login`;

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;
    const cleanCnpj = cnpj ? String(cnpj).replace(/\D/g, '') : null;
    const cleanCpf = cpf ? String(cpf).replace(/\D/g, '') : null;

    // Criar usuário no Supabase Auth com email já confirmado
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        phone: cleanPhone,
        isCompany: isCompany || false,
        companyName: isCompany ? (companyName?.trim() || null) : null,
        cnpj: isCompany ? cleanCnpj : null,
        cpf: !isCompany ? cleanCpf : null,
        role: 'cliente',
        tenant_slug: tenantSlug,
      },
    });

    if (authError || !authData.user) {
      logger.error('[API-CreateClient] Erro ao criar usuário Auth:', authError);
      if (authError?.message?.toLowerCase().includes('already registered')) {
        return createApiError('E-mail já cadastrado no sistema', ApiErrorCode.CONFLICT, 409);
      }
      return createApiError(
        authError?.message || 'Erro ao criar usuário',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    const userId = authData.user.id;

    // Criar registro na tabela users (não existe trigger automático — precisa ser inserido explicitamente)
    // role: 'client' (inglês) é o valor esperado pela query de listagem em /api/admin/clients
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: cleanEmail,
        role: 'client',
        status: 'active',
        name: name.trim(),
        phone: cleanPhone,
        is_company: isCompany || false,
        company_name: isCompany ? (companyName?.trim() || null) : null,
        cnpj: isCompany ? cleanCnpj : null,
        cpf: !isCompany ? cleanCpf : null,
        tenant_id: tenantId,
        auth_provider: 'supabase',
        is_blocked: false,
        login_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      logger.error('[API-CreateClient] Erro ao criar registro em users:', insertError);

      // Cleanup: remover usuário do Auth para não deixar registro órfão
      try {
        await supabase.auth.admin.deleteUser(userId);
        logger.info('[API-CreateClient] Usuário Auth removido após falha ao criar registro em users');
      } catch (cleanupError) {
        logger.error('[API-CreateClient] Erro ao limpar usuário Auth:', cleanupError);
      }

      return createApiError(
        'Erro ao criar registro do cliente no banco de dados',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    // Enviar e-mail de boas-vindas com credenciais (não-bloqueante)
    sendClientWelcomeEmail(cleanEmail, name.trim(), tenantName, password, loginUrl).catch((err) => {
      logger.error('[API-CreateClient] Falha ao enviar e-mail de boas-vindas:', err);
    });

    logger.info('[API-CreateClient] Cliente criado com sucesso:', { userId, email: cleanEmail });

    return createApiSuccess({
      message: 'Cliente criado com sucesso',
      userId,
      email: cleanEmail,
      tenantName,
      loginUrl,
    });
  } catch (error) {
    logger.error('[API-CreateClient] Erro interno:', error);
    return handleApiError(
      error,
      'Erro interno ao criar cliente',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
