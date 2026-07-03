import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';

/**
 * API para calcular estatísticas de uso atual vs limites do plano
 * GET /api/admin/billing/usage-stats
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Usage Stats] Calculando estatísticas de uso...');

    // ✅ SEGURANÇA MULTI-TENANT: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    devLog.log('[API Usage Stats] Headers recebidos:', {
      tenantId,
      allHeaders: Object.fromEntries(headersList.entries())
    });

    if (!tenantId) {
      devLog.error('[API Usage Stats] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        {
          error: 'Acesso negado: tenant não identificado',
          debug: {
            receivedHeaders: Object.fromEntries(headersList.entries()),
            expectedHeader: 'x-tenant-id'
          }
        },
        { status: 403 }
      );
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários
    const tempTenantResponse = handleTempTenant(tenantId, 'object', 'UsageStats');
    if (tempTenantResponse) {
      return tempTenantResponse;
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar informações da organização e plano atual
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('plan_id, name')
      .eq('id', tenantId)
      .single();

    if (orgError || !orgData) {
      devLog.error('[API Usage Stats] Organização não encontrada:', orgError);
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    // Buscar dados do plano atual
    const { data: planData, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', orgData.plan_id)
      .single();

    if (planError || !planData) {
      devLog.error('[API Usage Stats] Plano não encontrado:', planError);
      return NextResponse.json(
        { error: 'Plano da organização não encontrado' },
        { status: 404 }
      );
    }

    const limits = {
      max_projects: planData.max_projects,
      max_users: planData.max_users,
      max_clients: planData.max_clients,
      max_storage_gb: planData.max_storage_gb,
      api_calls_per_day: planData.api_calls_per_day
    };

    // ✅ CORREÇÃO: Calcular projetos ATIVOS (excluindo finalizados e cancelados),
    // mesma lógica usada em "Projetos Ativos" na aba Métricas do painel admin.
    const TERMINAL_PROJECT_STATUSES = ['finalizado', 'cancelado'];
    const { count: projectsCount, error: projectsError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .not('status', 'in', `(${TERMINAL_PROJECT_STATUSES.join(',')})`);

    // ✅ CORREÇÃO: "Usuários" deve contar apenas membros da equipe (mesmos
    // roles usados em /admin/equipe), não clientes.
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('role', ['superadmin', 'owner', 'admin', 'colaborador'])
      .eq('status', 'active');

    // ✅ CORREÇÃO: role de cliente é 'client' (inglês), mesmo valor usado em
    // /api/admin/clients — antes filtrava por 'cliente' e nunca encontrava nada.
    const { count: clientsCount, error: clientsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .eq('status', 'active');

    const uniqueClientsCount = clientsCount || 0;

    // ✅ CORREÇÃO: Calcular storage real usado pelo tenant
    let storageUsed = 0; // GB
    try {
      // Calcular storage dos arquivos de projetos do tenant
      const { data: projectFiles, error: filesError } = await supabase
        .from('projects')
        .select('files')
        .eq('tenant_id', tenantId)
        .not('files', 'is', null);

      if (!filesError && projectFiles) {
        let totalBytes = 0;

        projectFiles.forEach(project => {
          if (!project.files) return;

          // A coluna 'files' é jsonb: o Supabase-js já retorna array/objeto
          // (nunca string), então precisa tratar os dois formatos possíveis.
          let files: any = project.files;
          if (typeof files === 'string') {
            try {
              files = JSON.parse(files);
            } catch (parseError) {
              return;
            }
          }

          if (Array.isArray(files)) {
            files.forEach(file => {
              if (file?.size && typeof file.size === 'number') {
                totalBytes += file.size;
              }
            });
          }
        });
        
        // Converter bytes para GB
        storageUsed = totalBytes / (1024 * 1024 * 1024);
      }
      
      devLog.log('[API Usage Stats] Storage calculado:', {
        tenantId,
        totalBytes: storageUsed * 1024 * 1024 * 1024,
        storageGB: storageUsed,
        projectsWithFiles: projectFiles?.length || 0
      });
    } catch (storageError) {
      devLog.error('[API Usage Stats] Erro ao calcular storage:', storageError);
      storageUsed = 0; // Default para 0 em caso de erro
    }

    // Preparar estatísticas de uso
    const usageStats = {
      projects: {
        current: projectsCount || 0,
        limit: limits.max_projects || 30,
        percentage: Math.round(((projectsCount || 0) / (limits.max_projects || 30)) * 100)
      },
      users: {
        current: usersCount || 0,
        limit: limits.max_users || 10,
        percentage: Math.round(((usersCount || 0) / (limits.max_users || 10)) * 100)
      },
      clients: {
        current: uniqueClientsCount,
        limit: limits.max_clients || 100,
        percentage: Math.round((uniqueClientsCount / (limits.max_clients || 100)) * 100)
      },
      storage: {
        current: storageUsed,
        limit: limits.max_storage_gb || 3,
        percentage: Math.round((storageUsed / (limits.max_storage_gb || 3)) * 100)
      }
    };

    devLog.log('[API Usage Stats] Estatísticas calculadas:', {
      tenantId,
      orgName: orgData.name,
      planCode: planData.plan_code,
      planName: planData.name,
      rawCounts: {
        projectsCount,
        usersCount,
        clientsCount,
        storageGB: storageUsed
      },
      usageStats
    });

    return NextResponse.json({
      success: true,
      data: usageStats,
      organization: {
        name: orgData.name,
        plan: planData.plan_code,
        planName: planData.name,
        limits: limits
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    devLog.error('[API Usage Stats] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao calcular estatísticas de uso' },
      { status: 500 }
    );
  }
}
