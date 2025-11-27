import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";
import { canEditProjects, canDeleteProjects } from '@/lib/utils/check-permissions';

/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * Esta API precisa ser migrada do Firebase para Supabase
 * 
 * Project by ID - STUB TEMPORÁRIO
 * 
 * @route GET|PUT|DELETE /api/projects/[id]
 */
export async function GET(request: NextRequest) {
  devLog.warn('[API] projects/[id]: STUB - TODO: migrar para Supabase');
  
  return createApiError(
    'API em migração para Supabase - funcionalidade temporariamente indisponível',
    ApiErrorCode.SERVICE_UNAVAILABLE,
    503
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    devLog.log('[API Projects] PUT - Atualizando projeto:', projectId);

    // ✅ SEGURANÇA: Obter tenant_id e user_id dos headers
    const { headers: requestHeaders } = request;
    const headersList = requestHeaders;
    const tenantId = headersList.get('x-tenant-id');
    const userId = headersList.get('x-user-id');

    if (!tenantId) {
      devLog.error('[API Projects] Tenant ID não encontrado nos headers');
      return createApiError(
        'Acesso negado: tenant não identificado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // ✅ PERMISSÕES: Verificar se usuário pode editar projetos
    if (userId) {
      const supabase = createSupabaseServiceRoleClient();
      const { data: userData } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (userData && !canEditProjects(userData)) {
        devLog.warn('[API Projects] Usuário sem permissão para editar projetos', { userId, role: userData.role });
        return createApiError(
          'Você não tem permissão para editar projetos',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
    }

    const body = await request.json();
    const supabase = createSupabaseServiceRoleClient();

    // ✅ VALIDAÇÃO: Se status foi fornecido, verificar se existe no tenant
    if (body.status) {
      const { data: statusExists } = await supabase
        .from('project_statuses')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('slug', body.status)
        .eq('is_active', true)
        .single();

      if (!statusExists) {
        return createApiError(
          'Status de projeto inválido para este tenant',
          ApiErrorCode.VALIDATION_ERROR,
          400
        );
      }

      devLog.log('[API Projects] Status validado:', {
        status: body.status,
        statusName: statusExists.name
      });
    }

    // ✅ SEGURANÇA: Verificar se projeto pertence ao tenant
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingProject) {
      return createApiError(
        'Projeto não encontrado',
        ApiErrorCode.NOT_FOUND,
        404
      );
    }

    // Preparar dados de atualização
    const updateData = {
      ...body,
      updated_at: new Date().toISOString(),
      // ✅ SEGURANÇA: Não permitir mudança de tenant_id
      tenant_id: tenantId
    };

    // Remover campos que não devem ser atualizados
    delete updateData.id;
    delete updateData.created_at;

    // Atualizar projeto
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[API Projects] Erro ao atualizar projeto:', updateError);
      return createApiError(
        'Erro ao atualizar projeto',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    devLog.log('[API Projects] Projeto atualizado com sucesso:', projectId);

    return NextResponse.json({
      success: true,
      data: updatedProject,
      message: 'Projeto atualizado com sucesso'
    });

  } catch (error) {
    devLog.error('[API Projects] Erro inesperado no PUT:', error);
    return createApiError(
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    devLog.log('[API Projects] DELETE - Excluindo projeto:', projectId);

    // ✅ SEGURANÇA: Obter tenant_id e user_id dos headers
    const { headers: requestHeaders } = request;
    const headersList = requestHeaders;
    const tenantId = headersList.get('x-tenant-id');
    const userId = headersList.get('x-user-id');

    if (!tenantId) {
      devLog.error('[API Projects] Tenant ID não encontrado nos headers');
      return createApiError(
        'Acesso negado: tenant não identificado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ PERMISSÕES: Verificar se usuário pode deletar projetos
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (userData && !canDeleteProjects(userData)) {
        devLog.warn('[API Projects] Usuário sem permissão para deletar projetos', { userId, role: userData.role });
        return createApiError(
          'Você não tem permissão para deletar projetos',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
    }

    // ✅ SEGURANÇA: Verificar se projeto pertence ao tenant antes de deletar
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingProject) {
      devLog.error('[API Projects] Projeto não encontrado ou não pertence ao tenant:', {
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

    // ✅ SOFT DELETE: Arquivar projeto ao invés de deletar permanentemente
    const { error: archiveError } = await supabase
      .from('projects')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId || null
      })
      .eq('id', projectId)
      .eq('tenant_id', tenantId);

    if (archiveError) {
      devLog.error('[API Projects] Erro ao arquivar projeto:', archiveError);
      return createApiError(
        'Erro ao arquivar projeto',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    devLog.log('[API Projects] Projeto arquivado com sucesso:', projectId);

    return NextResponse.json({
      success: true,
      message: 'Projeto arquivado com sucesso'
    });

  } catch (error) {
    devLog.error('[API Projects] Erro inesperado no DELETE:', error);
    return createApiError(
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      500
    );
  }
}