import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de diagnóstico específica para problemas de tenant
 * GET /api/debug/tenant-diagnostic?userId=ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    devLog.log('[TENANT DIAGNOSTIC] Iniciando diagnóstico de tenant');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const headersList = headers();
    
    // Coletar todos os headers relevantes
    const relevantHeaders = {
      'x-tenant-id': headersList.get('x-tenant-id'),
      'x-tenant-slug': headersList.get('x-tenant-slug'),
      'x-tenant-name': headersList.get('x-tenant-name'),
      'x-tenant-trial': headersList.get('x-tenant-trial'),
      'host': headersList.get('host'),
      'origin': headersList.get('origin'),
      'referer': headersList.get('referer')
    };

    devLog.log('[TENANT DIAGNOSTIC] Headers capturados:', relevantHeaders);

    const diagnostic = {
      userId,
      timestamp: new Date().toISOString(),
      headers: relevantHeaders,
      tests: [] as any[]
    };

    // 1. Verificar se usuário existe e tem tenant_id
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status, created_at')
        .eq('id', userId)
        .single();

      diagnostic.tests.push({
        test: 'user-exists',
        success: !userError && !!userData,
        error: userError?.message || null,
        data: userData || null,
        details: userData ? {
          hasTenantId: !!userData.tenant_id,
          tenantId: userData.tenant_id,
          role: userData.role,
          status: userData.status
        } : null
      });

      // 2. Se usuário tem tenant_id, verificar se organização existe
      if (userData?.tenant_id) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, status, trial_end_date, is_trial, created_at')
          .eq('id', userData.tenant_id)
          .single();

        diagnostic.tests.push({
          test: 'organization-exists',
          success: !orgError && !!orgData,
          error: orgError?.message || null,
          data: orgData || null,
          details: orgData ? {
            slug: orgData.slug,
            status: orgData.status,
            isTrial: orgData.is_trial,
            trialEndDate: orgData.trial_end_date
          } : null
        });

        // 3. Verificar se tenant do header bate com tenant do usuário
        const headerTenantId = headersList.get('x-tenant-id');
        diagnostic.tests.push({
          test: 'tenant-header-match',
          success: headerTenantId === userData.tenant_id,
          error: headerTenantId !== userData.tenant_id ? 
            `Header tenant (${headerTenantId}) não bate com tenant do usuário (${userData.tenant_id})` : null,
          data: {
            headerTenantId,
            userTenantId: userData.tenant_id,
            match: headerTenantId === userData.tenant_id
          }
        });

        // 4. Verificar se consegue fazer query com filtro de tenant
        const { data: tenantFilteredUser, error: tenantFilterError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .eq('id', userId)
          .eq('tenant_id', userData.tenant_id)
          .single();

        diagnostic.tests.push({
          test: 'tenant-filtered-query',
          success: !tenantFilterError && !!tenantFilteredUser,
          error: tenantFilterError?.message || null,
          data: tenantFilteredUser || null
        });

      } else {
        diagnostic.tests.push({
          test: 'user-has-tenant',
          success: false,
          error: 'Usuário não tem tenant_id associado',
          data: null
        });
      }

    } catch (error: any) {
      diagnostic.tests.push({
        test: 'user-exists',
        success: false,
        error: error.message,
        data: null
      });
    }

    // 5. Testar se hostname corresponde a algum tenant
    const hostname = headersList.get('host') || '';
    if (hostname.includes('.gerenciamentofotovoltaico.com.br') && 
        !hostname.includes('www.') && 
        !hostname.includes('registro.')) {
      
      const tenantSlug = hostname.split('.')[0];
      
      // Primeiro, buscar organizações com esse slug (qualquer status)
      const { data: allOrgData, error: allOrgError } = await supabase
        .from('organizations')
        .select('id, name, slug, status, trial_end_date, is_trial')
        .eq('slug', tenantSlug);

      diagnostic.tests.push({
        test: 'hostname-tenant-any-status',
        success: !allOrgError && !!allOrgData && allOrgData.length > 0,
        error: allOrgError?.message || null,
        data: allOrgData || null,
        details: {
          extractedSlug: tenantSlug,
          hostname,
          found: allOrgData?.length || 0
        }
      });

      // Segundo, buscar especificamente com status ativo
      const { data: activeOrgData, error: activeOrgError } = await supabase
        .from('organizations')
        .select('id, name, slug, status, trial_end_date, is_trial')
        .eq('slug', tenantSlug)
        .eq('status', 'active')
        .single();

      diagnostic.tests.push({
        test: 'hostname-tenant-active-only',
        success: !activeOrgError && !!activeOrgData,
        error: activeOrgError?.message || null,
        data: activeOrgData || null,
        details: {
          extractedSlug: tenantSlug,
          hostname
        }
      });
    }

    // Calcular resumo
    const summary = {
      totalTests: diagnostic.tests.length,
      passed: diagnostic.tests.filter(t => t.success).length,
      failed: diagnostic.tests.filter(t => !t.success).length,
      passRate: Math.round((diagnostic.tests.filter(t => t.success).length / diagnostic.tests.length) * 100)
    };

    devLog.log('[TENANT DIAGNOSTIC] Diagnóstico completo:', summary);

    return NextResponse.json({
      summary,
      diagnostic,
      recommendations: generateRecommendations(diagnostic.tests)
    });

  } catch (error: any) {
    devLog.error('[TENANT DIAGNOSTIC] Erro crítico:', error);
    return NextResponse.json(
      { 
        error: 'Erro crítico no diagnóstico de tenant',
        details: error.message
      },
      { status: 500 }
    );
  }
}

function generateRecommendations(tests: any[]): string[] {
  const recommendations = [];
  
  const userExists = tests.find(t => t.test === 'user-exists');
  if (!userExists?.success) {
    recommendations.push('❌ Usuário não encontrado no banco de dados - verificar se ID está correto');
  }

  const userHasTenant = userExists?.data?.tenant_id;
  if (!userHasTenant) {
    recommendations.push('❌ Usuário não tem tenant_id - executar script de associação de tenant');
  }

  const orgExists = tests.find(t => t.test === 'organization-exists');
  if (userHasTenant && !orgExists?.success) {
    recommendations.push('❌ Organização do usuário não existe - verificar tabela organizations');
  }

  const headerMatch = tests.find(t => t.test === 'tenant-header-match');
  if (!headerMatch?.success) {
    recommendations.push('❌ Tenant do header não bate com tenant do usuário - verificar middleware');
  }

  const tenantQuery = tests.find(t => t.test === 'tenant-filtered-query');
  if (!tenantQuery?.success) {
    recommendations.push('❌ Query filtrada por tenant falha - verificar RLS ou dados corrompidos');
  }

  const hostnameTest = tests.find(t => t.test === 'hostname-tenant-exists');
  if (hostnameTest && !hostnameTest.success) {
    recommendations.push('❌ Hostname não corresponde a tenant ativo - verificar domínio ou status da org');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Configuração de tenant parece estar correta');
  }

  return recommendations;
}