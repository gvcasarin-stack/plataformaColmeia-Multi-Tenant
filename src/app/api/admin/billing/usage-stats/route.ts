import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

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

    // Calcular uso atual de projetos
    const { count: projectsCount, error: projectsError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_archived', false);

    // Calcular uso atual de usuários
    const { count: usersCount, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    // ✅ CORREÇÃO: Calcular clientes reais do tenant (usuários com role 'cliente')
    const { count: clientsCount, error: clientsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'cliente')
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
          if (project.files && typeof project.files === 'string') {
            try {
              const files = JSON.parse(project.files);
              if (Array.isArray(files)) {
                files.forEach(file => {
                  if (file.size && typeof file.size === 'number') {
                    totalBytes += file.size;
                  }
                });
              }
            } catch (parseError) {
              // Ignorar erros de parse de JSON
            }
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

    // ✅ CORREÇÃO: Calcular API calls reais do tenant (hoje)
    let apiCallsToday = 0;
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Buscar logs de API calls do tenant hoje (se a tabela existir)
      const { count: apiCount, error: apiError } = await supabase
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay);

      if (!apiError && apiCount !== null) {
        apiCallsToday = apiCount;
      } else {
        // Se não temos logs de API, usar 0 (mais realista para tenant novo)
        apiCallsToday = 0;
        devLog.log('[API Usage Stats] Tabela api_logs não encontrada ou sem dados, usando 0');
      }
      
      devLog.log('[API Usage Stats] API calls calculadas:', {
        tenantId,
        today: startOfDay,
        apiCallsToday,
        apiError: apiError?.message
      });
    } catch (apiError) {
      devLog.error('[API Usage Stats] Erro ao calcular API calls:', apiError);
      apiCallsToday = 0; // Default para 0 em caso de erro
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
      },
      apiCalls: {
        current: apiCallsToday,
        limit: limits.api_calls_per_day || 2000,
        percentage: Math.round((apiCallsToday / (limits.api_calls_per_day || 2000)) * 100)
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
        storageGB: storageUsed,
        apiCallsToday
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
