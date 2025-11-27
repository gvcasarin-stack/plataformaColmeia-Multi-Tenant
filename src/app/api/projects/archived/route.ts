import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";

/**
 * API para buscar projetos arquivados (soft deleted)
 *
 * @route GET /api/projects/archived
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Projects Archived] GET - Buscando projetos arquivados');

    // ✅ SEGURANÇA: Obter tenant_id e user_id dos headers
    const { headers: requestHeaders } = request;
    const headersList = requestHeaders;
    const tenantId = headersList.get('x-tenant-id');
    const userId = headersList.get('x-user-id');

    if (!tenantId) {
      devLog.error('[API Projects Archived] Tenant ID não encontrado nos headers');
      return createApiError(
        'Acesso negado: tenant não identificado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // ✅ PERMISSÕES: Verificar se usuário é admin ou superadmin
    if (userId) {
      const supabase = createSupabaseServiceRoleClient();
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';

      if (!isAdmin) {
        devLog.warn('[API Projects Archived] Usuário sem permissão para acessar projetos arquivados', { userId, role: userData?.role });
        return createApiError(
          'Apenas administradores podem acessar projetos arquivados',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ BUSCAR: Projetos arquivados do tenant (deleted_at NOT NULL)
    const { data: archivedProjects, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (fetchError) {
      devLog.error('[API Projects Archived] Erro ao buscar projetos arquivados:', fetchError);
      return createApiError(
        `Erro ao buscar projetos arquivados: ${fetchError.message}`,
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    // ✅ BUSCAR: Informações de status para cada projeto
    if (archivedProjects && archivedProjects.length > 0) {
      const projectsWithStatus = await Promise.all(
        archivedProjects.map(async (project) => {
          if (project.status) {
            const { data: statusData } = await supabase
              .from('project_statuses')
              .select('id, name, slug, color')
              .eq('tenant_id', tenantId)
              .eq('slug', project.status)
              .single();

            return {
              ...project,
              status_info: statusData || null
            };
          }
          return project;
        })
      );

      devLog.log('[API Projects Archived] Projetos arquivados encontrados:', projectsWithStatus.length);

      return NextResponse.json({
        success: true,
        data: projectsWithStatus
      });
    }

    devLog.log('[API Projects Archived] Nenhum projeto arquivado encontrado');

    return NextResponse.json({
      success: true,
      data: []
    });

  } catch (error) {
    devLog.error('[API Projects Archived] Erro inesperado:', error);
    return createApiError(
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      500
    );
  }
}
