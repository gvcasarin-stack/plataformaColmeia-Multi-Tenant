import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";

/**
 * API para restaurar projeto arquivado
 *
 * @route POST /api/projects/[id]/restore
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    devLog.log('[API Projects Restore] POST - Restaurando projeto:', projectId);

    // ✅ SEGURANÇA: Obter tenant_id e user_id dos headers
    const { headers: requestHeaders } = request;
    const headersList = requestHeaders;
    const tenantId = headersList.get('x-tenant-id');
    const userId = headersList.get('x-user-id');

    if (!tenantId) {
      devLog.error('[API Projects Restore] Tenant ID não encontrado nos headers');
      return createApiError(
        'Acesso negado: tenant não identificado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // ✅ PERMISSÕES: Verificar se usuário é admin ou superadmin
    const supabase = createSupabaseServiceRoleClient();

    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';

      if (!isAdmin) {
        devLog.warn('[API Projects Restore] Usuário sem permissão para restaurar projetos', { userId, role: userData?.role });
        return createApiError(
          'Apenas administradores podem restaurar projetos',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
    }

    // ✅ SEGURANÇA: Verificar se projeto existe e está arquivado
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, tenant_id, deleted_at, name')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingProject) {
      devLog.error('[API Projects Restore] Projeto não encontrado:', {
        projectId,
        tenantId,
        error: checkError
      });
      return createApiError(
        'Projeto não encontrado',
        ApiErrorCode.NOT_FOUND,
        404
      );
    }

    if (!existingProject.deleted_at) {
      return createApiError(
        'Este projeto não está arquivado',
        ApiErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // ✅ RESTAURAR: Limpar campos de soft delete
    const { error: restoreError } = await supabase
      .from('projects')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .eq('tenant_id', tenantId);

    if (restoreError) {
      devLog.error('[API Projects Restore] Erro ao restaurar projeto:', restoreError);
      return createApiError(
        'Erro ao restaurar projeto',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    devLog.log('[API Projects Restore] Projeto restaurado com sucesso:', projectId);

    return NextResponse.json({
      success: true,
      message: 'Projeto restaurado com sucesso'
    });

  } catch (error) {
    devLog.error('[API Projects Restore] Erro inesperado:', error);
    return createApiError(
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      500
    );
  }
}
