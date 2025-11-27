import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';
import { devLog } from "@/lib/utils/productionLogger";
import { canUserPerformAction } from '@/lib/services/userBlockService';
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';

// ✅ CORRIGIDO: Forçar runtime dinâmico
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 *
 * Obtém lista de projetos do tenant atual com segurança multi-tenant
 */
export async function GET(request: NextRequest) {
  // ✅ CORRIGIDO: Evitar execução durante build
  if (isBuildTime()) {
    return createBuildTimeResponse('/api/projects');
  }

  try {
    devLog.log('[API Projects] Buscando projetos do tenant');

    // Verificar autenticação
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // ✅ PRODUÇÃO - Verificar se usuário está bloqueado
    const { allowed, reason } = await canUserPerformAction(session.user.id, 'acessar_projetos');
    if (!allowed) {
      return NextResponse.json(
        { error: reason || 'Acesso negado - usuário bloqueado' },
        { status: 403 }
      );
    }

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Projects] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários
    const tempTenantResponse = handleTempTenant(tenantId, 'array', 'Projects');
    if (tempTenantResponse) {
      return tempTenantResponse;
    }

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API Projects] Service Role Key não disponível (build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar apenas projetos ativos (não arquivados) do tenant atual com status completos
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        users!projects_created_by_fkey(
          id,
          email,
          full_name
        ),
        status_info:project_statuses!inner(
          id,
          name,
          slug,
          color,
          order_index
        )
      `)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Filtrar por tenant
      .is('deleted_at', null)  // ✅ SOFT DELETE: Excluir projetos arquivados
      .eq('project_statuses.tenant_id', tenantId) // ✅ SEGURANÇA: Status do mesmo tenant
      .eq('status', 'project_statuses.slug') // JOIN projects.status = project_statuses.slug
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API Projects] Erro ao buscar projetos:', error);

      // Fallback: buscar projetos com status simples
      const { data: projectsOnly, error: fallbackError } = await supabase
        .from('projects')
        .select(`
          *,
          status_info:project_statuses(
            id,
            name,
            slug,
            color,
            order_index
          )
        `)
        .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Fallback também deve filtrar por tenant
        .eq('project_statuses.tenant_id', tenantId) // Status do mesmo tenant
        .eq('status', 'project_statuses.slug') // JOIN por slug
        .order('created_at', { ascending: false });

      if (fallbackError) {
        devLog.error('[API Projects] Erro no fallback:', fallbackError);
        return NextResponse.json(
          { error: 'Erro ao buscar projetos', details: fallbackError.message },
          { status: 500 }
        );
      }

      devLog.log('[API Projects] Usando fallback - projetos encontrados via busca simples');
      return NextResponse.json({
        success: true,
        data: projectsOnly || [],
        count: projectsOnly?.length || 0,
        fallback: 'simple_search'
      });
    }

    devLog.log('[API Projects] Projetos encontrados:', {
      tenantId,
      userId: session.user.id,
      count: data?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    devLog.error('[API Projects] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}