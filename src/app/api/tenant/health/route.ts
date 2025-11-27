import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Health Check API para validação completa de tenant
 * GET /api/tenant/health
 *
 * Verifica:
 * - Existência do tenant
 * - Status dos recursos essenciais
 * - Configurações básicas
 * - Conectividade com banco
 */

interface HealthCheckResult {
  tenant_id: string;
  tenant_slug: string;
  tenant_name: string;
  is_temp: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    tenant_exists: boolean;
    has_project_statuses: boolean;
    database_connectivity: boolean;
    essential_functions: boolean;
  };
  resources: {
    projects_count: number;
    users_count: number;
    statuses_count: number;
  };
  issues: string[];
  recommendations: string[];
}

export async function GET(request: NextRequest) {
  try {
    devLog.log('[tenant/health] Iniciando health check do tenant');

    // Obter informações do tenant dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    const tenantName = headersList.get('x-tenant-name');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado nos headers',
        status: 'unhealthy'
      }, { status: 400 });
    }

    const isTemp = tenantId.startsWith('temp-');

    // Inicializar resultado do health check
    const healthResult: HealthCheckResult = {
      tenant_id: tenantId,
      tenant_slug: tenantSlug || 'unknown',
      tenant_name: tenantName || 'unknown',
      is_temp: isTemp,
      status: 'healthy',
      checks: {
        tenant_exists: false,
        has_project_statuses: false,
        database_connectivity: false,
        essential_functions: false
      },
      resources: {
        projects_count: 0,
        users_count: 0,
        statuses_count: 0
      },
      issues: [],
      recommendations: []
    };

    // Se é tenant temporário, fazer verificações básicas
    if (isTemp) {
      healthResult.checks.database_connectivity = true;
      healthResult.checks.tenant_exists = true;
      healthResult.checks.has_project_statuses = true; // Assumir que tem status padrão
      healthResult.checks.essential_functions = true;
      healthResult.status = 'degraded';
      healthResult.issues.push('Tenant temporário - funcionalidade limitada');
      healthResult.recommendations.push('Registrar tenant permanente para acesso completo');

      return NextResponse.json({
        success: true,
        health: healthResult
      });
    }

    // Verificar conectividade com banco
    try {
      const supabase = createSupabaseServiceRoleClient();
      healthResult.checks.database_connectivity = true;

      // 1. Verificar se tenant existe
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, plan, created_at')
        .eq('id', tenantId)
        .single();

      if (orgError || !org) {
        healthResult.checks.tenant_exists = false;
        healthResult.issues.push('Tenant não encontrado na base de dados');
        healthResult.status = 'unhealthy';
      } else {
        healthResult.checks.tenant_exists = true;
      }

      // 2. Verificar project statuses
      const { data: statuses, error: statusError } = await supabase
        .from('project_statuses')
        .select('id, name, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

      if (statusError) {
        healthResult.issues.push('Erro ao verificar status de projetos');
        healthResult.checks.has_project_statuses = false;
      } else if (!statuses || statuses.length === 0) {
        healthResult.checks.has_project_statuses = false;
        healthResult.issues.push('Nenhum status de projeto configurado');
        healthResult.recommendations.push('Criar status padrão para projetos');
      } else {
        healthResult.checks.has_project_statuses = true;
        healthResult.resources.statuses_count = statuses.length;
      }

      // 3. Contar recursos
      // Projetos
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      healthResult.resources.projects_count = projectsCount || 0;

      // Usuários (aproximação via organizações)
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', tenantId);

      healthResult.resources.users_count = usersCount || 0;

      // 4. Verificar funções SQL essenciais
      try {
        const { data: testFunction } = await supabase.rpc('get_tenant_project_statuses', {
          p_tenant_id: tenantId
        });

        healthResult.checks.essential_functions = true;
      } catch (funcError) {
        healthResult.checks.essential_functions = false;
        healthResult.issues.push('Funções SQL essenciais com problemas');
        healthResult.recommendations.push('Verificar configuração do banco de dados');
      }

      // 5. Determinar status geral
      const totalChecks = Object.values(healthResult.checks).length;
      const passedChecks = Object.values(healthResult.checks).filter(Boolean).length;

      if (passedChecks === totalChecks) {
        healthResult.status = 'healthy';
      } else if (passedChecks >= totalChecks * 0.75) {
        healthResult.status = 'degraded';
      } else {
        healthResult.status = 'unhealthy';
      }

      // 6. Adicionar recomendações baseadas nos recursos
      if (healthResult.resources.projects_count === 0) {
        healthResult.recommendations.push('Considere criar um projeto de exemplo');
      }

      if (healthResult.resources.users_count <= 1) {
        healthResult.recommendations.push('Considere convidar mais usuários para a organização');
      }

    } catch (dbError) {
      devLog.error('[tenant/health] Erro de conectividade:', dbError);
      healthResult.checks.database_connectivity = false;
      healthResult.status = 'unhealthy';
      healthResult.issues.push('Falha na conectividade com banco de dados');
    }

    devLog.log('[tenant/health] Health check concluído:', {
      tenantId,
      status: healthResult.status,
      issuesCount: healthResult.issues.length
    });

    return NextResponse.json({
      success: true,
      health: healthResult
    });

  } catch (error) {
    devLog.error('[tenant/health] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno durante health check',
      status: 'unhealthy'
    }, { status: 500 });
  }
}