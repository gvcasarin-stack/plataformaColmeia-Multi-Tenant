import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";

/**
 * API para exclusão permanente de projeto (hard delete)
 * ⚠️ APENAS SUPERADMIN
 *
 * @route DELETE /api/projects/[id]/permanent-delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    devLog.log('[API Projects Permanent Delete] DELETE - Excluindo permanentemente projeto:', projectId);

    // ✅ SEGURANÇA: Obter tenant_id e user_id dos headers
    const { headers: requestHeaders } = request;
    const headersList = requestHeaders;
    const tenantId = headersList.get('x-tenant-id');
    const userId = headersList.get('x-user-id');

    if (!tenantId) {
      devLog.error('[API Projects Permanent Delete] Tenant ID não encontrado nos headers');
      return createApiError(
        'Acesso negado: tenant não identificado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // ✅ PERMISSÕES RESTRITAS: Apenas ADMIN e SUPERADMIN podem fazer exclusão permanente
    const supabase = createSupabaseServiceRoleClient();

    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      const canDeletePermanently = userData?.role === 'superadmin' || userData?.role === 'admin';

      if (!canDeletePermanently) {
        devLog.warn('[API Projects Permanent Delete] Usuário sem permissão para exclusão permanente', { userId, role: userData?.role });
        return createApiError(
          'Apenas Administradores podem excluir projetos permanentemente',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
    }

    // ✅ SEGURANÇA: Verificar se projeto existe, pertence ao tenant e está arquivado
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, tenant_id, deleted_at, name')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingProject) {
      devLog.error('[API Projects Permanent Delete] Projeto não encontrado:', {
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

    // Verificar se projeto está arquivado (segurança extra)
    if (!existingProject.deleted_at) {
      return createApiError(
        'Apenas projetos arquivados podem ser excluídos permanentemente',
        ApiErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // ✅ EXCLUSÃO PERMANENTE: Deletar projeto e todos os dados relacionados
    // TODO: Considerar deletar também:
    // - Arquivos do storage
    // - Comentários
    // - Timeline events
    // - Dados relacionados em outras tabelas

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      devLog.error('[API Projects Permanent Delete] Erro ao deletar projeto:', deleteError);
      return createApiError(
        'Erro ao deletar projeto permanentemente',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    devLog.log('[API Projects Permanent Delete] Projeto excluído permanentemente:', projectId);

    return NextResponse.json({
      success: true,
      message: 'Projeto excluído permanentemente'
    });

  } catch (error) {
    devLog.error('[API Projects Permanent Delete] Erro inesperado:', error);
    return createApiError(
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      500
    );
  }
}
