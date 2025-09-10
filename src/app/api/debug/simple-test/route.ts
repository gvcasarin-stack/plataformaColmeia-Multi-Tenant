import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Teste simples das funcionalidades básicas
 * GET /api/debug/simple-test?userId=ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    devLog.log('[SIMPLE TEST] Iniciando teste simples');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    const testResult = {
      timestamp: new Date().toISOString(),
      userId,
      tenantId,
      hostname: headersList.get('host'),
      tests: {} as any
    };

    if (!userId) {
      testResult.tests.validation = {
        success: false,
        error: 'userId é obrigatório'
      };
      return NextResponse.json(testResult);
    }

    const supabase = createSupabaseServiceRoleClient();

    // 1. Teste básico: consegue conectar no Supabase?
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      testResult.tests.supabaseConnection = {
        success: !connectionError,
        error: connectionError?.message || null
      };
    } catch (error: any) {
      testResult.tests.supabaseConnection = {
        success: false,
        error: error.message
      };
    }

    // 2. Teste: usuário existe?
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', userId)
        .single();

      testResult.tests.userExists = {
        success: !userError && !!userData,
        error: userError?.message || null,
        data: userData ? {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          tenant_id: userData.tenant_id,
          status: userData.status
        } : null
      };
    } catch (error: any) {
      testResult.tests.userExists = {
        success: false,
        error: error.message,
        data: null
      };
    }

    // 3. Teste: headers estão chegando?
    testResult.tests.headers = {
      success: !!tenantId,
      error: !tenantId ? 'x-tenant-id não encontrado nos headers' : null,
      data: {
        'x-tenant-id': tenantId,
        'x-tenant-slug': headersList.get('x-tenant-slug'),
        'x-tenant-name': headersList.get('x-tenant-name'),
        'host': headersList.get('host')
      }
    };

    // 4. Teste: organização existe?
    if (tenantId) {
      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, status')
          .eq('id', tenantId)
          .single();

        testResult.tests.organizationExists = {
          success: !orgError && !!orgData,
          error: orgError?.message || null,
          data: orgData || null
        };
      } catch (error: any) {
        testResult.tests.organizationExists = {
          success: false,
          error: error.message,
          data: null
        };
      }
    } else {
      testResult.tests.organizationExists = {
        success: false,
        error: 'Não há tenant_id para testar',
        data: null
      };
    }

    // 5. Teste: consegue buscar projetos?
    try {
      let projectQuery = supabase
        .from('projects')
        .select('id, number, description, status')
        .limit(3);
      
      if (tenantId) {
        projectQuery = projectQuery.eq('tenant_id', tenantId);
      }

      const { data: projectsData, error: projectsError } = await projectQuery;

      testResult.tests.projectsQuery = {
        success: !projectsError,
        error: projectsError?.message || null,
        data: projectsData ? {
          count: projectsData.length,
          hasProjects: projectsData.length > 0
        } : null
      };
    } catch (error: any) {
      testResult.tests.projectsQuery = {
        success: false,
        error: error.message,
        data: null
      };
    }

    // Calcular resumo
    const testKeys = Object.keys(testResult.tests);
    const passedTests = testKeys.filter(key => testResult.tests[key].success);
    const failedTests = testKeys.filter(key => !testResult.tests[key].success);

    testResult.summary = {
      total: testKeys.length,
      passed: passedTests.length,
      failed: failedTests.length,
      passRate: Math.round((passedTests.length / testKeys.length) * 100),
      passedTests,
      failedTests
    };

    devLog.log('[SIMPLE TEST] Teste completo:', testResult.summary);

    return NextResponse.json(testResult);

  } catch (error: any) {
    devLog.error('[SIMPLE TEST] Erro crítico:', error);
    return NextResponse.json(
      { 
        error: 'Erro crítico no teste simples',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}