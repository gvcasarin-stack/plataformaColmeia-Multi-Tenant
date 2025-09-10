import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para testar se a API de usage-stats está retornando dados corretos
 * GET /api/debug/test-usage-api
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[Test Usage API] 🧪 Testando API de usage-stats...');
    
    // Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    
    if (!tenantId) {
      return NextResponse.json({
        error: 'Tenant ID não encontrado nos headers'
      }, { status: 400 });
    }
    
    // ========================================
    // 1. TESTAR CHAMADA DIRETA À API USAGE-STATS
    // ========================================
    let usageApiResult = null;
    let usageApiError = null;
    
    try {
      // Simular a chamada que a página de assinaturas faz
      const usageResponse = await fetch(`${request.nextUrl.origin}/api/admin/billing/usage-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
          'x-tenant-slug': tenantSlug || 'suprema'
        },
      });
      
      if (usageResponse.ok) {
        usageApiResult = await usageResponse.json();
      } else {
        const errorText = await usageResponse.text();
        usageApiError = `HTTP ${usageResponse.status}: ${errorText}`;
      }
      
    } catch (apiError: any) {
      usageApiError = `Exception: ${apiError.message}`;
    }
    
    // ========================================
    // 2. VERIFICAR DADOS MANUALMENTE
    // ========================================
    const supabase = createSupabaseServiceRoleClient();
    
    // Contar projetos do tenant
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_archived', false);
    
    // Contar usuários do tenant
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    
    // Contar clientes do tenant (role = 'cliente')
    const { count: clientsCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('role', 'cliente')
      .eq('status', 'active');
    
    // Verificar se há dados globais (sem tenant_id)
    const { count: globalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .is('tenant_id', null);
    
    const { count: globalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('tenant_id', null);
    
    const manualCounts = {
      tenant_projects: projectsCount || 0,
      tenant_users: usersCount || 0,
      tenant_clients: clientsCount || 0,
      global_orphan_projects: globalProjects || 0,
      global_orphan_users: globalUsers || 0
    };
    
    const report = {
      tenant: {
        id: tenantId,
        slug: tenantSlug
      },
      usage_api: {
        success: !!usageApiResult,
        error: usageApiError,
        result: usageApiResult
      },
      manual_verification: manualCounts,
      comparison: usageApiResult ? {
        api_projects: usageApiResult.data?.projects?.current || 'N/A',
        manual_projects: manualCounts.tenant_projects,
        api_users: usageApiResult.data?.users?.current || 'N/A',
        manual_users: manualCounts.tenant_users,
        api_clients: usageApiResult.data?.clients?.current || 'N/A',
        manual_clients: manualCounts.tenant_clients,
        data_matches: true // calculado abaixo
      } : null,
      issues: []
    };
    
    // Verificar se os dados batem
    if (usageApiResult?.data) {
      const apiData = usageApiResult.data;
      const matches = {
        projects: apiData.projects?.current === manualCounts.tenant_projects,
        users: apiData.users?.current === manualCounts.tenant_users,
        clients: apiData.clients?.current === manualCounts.tenant_clients
      };
      
      report.comparison!.data_matches = matches.projects && matches.users && matches.clients;
      
      if (!matches.projects) report.issues.push(`Projetos não batem: API=${apiData.projects?.current} vs Manual=${manualCounts.tenant_projects}`);
      if (!matches.users) report.issues.push(`Usuários não batem: API=${apiData.users?.current} vs Manual=${manualCounts.tenant_users}`);
      if (!matches.clients) report.issues.push(`Clientes não batem: API=${apiData.clients?.current} vs Manual=${manualCounts.tenant_clients}`);
    }
    
    if (manualCounts.global_orphan_projects > 0) {
      report.issues.push(`${manualCounts.global_orphan_projects} projetos órfãos encontrados`);
    }
    
    if (manualCounts.global_orphan_users > 0) {
      report.issues.push(`${manualCounts.global_orphan_users} usuários órfãos encontrados`);
    }
    
    return NextResponse.json({
      success: true,
      report,
      conclusion: report.issues.length === 0 ? 
        'TUDO CORRETO: API funcionando e dados isolados por tenant' :
        `PROBLEMAS ENCONTRADOS: ${report.issues.join(', ')}`
    });
    
  } catch (error: any) {
    devLog.error('[Test Usage API] ❌ Erro no teste:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
