import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de diagnóstico do sistema
 * GET /api/debug/system-health
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    devLog.log('[System Health] Iniciando diagnóstico do sistema...');
    
    // 1. Verificar headers do middleware
    const headersList = headers();
    const middlewareHeaders = {
      tenantId: headersList.get('x-tenant-id'),
      tenantSlug: headersList.get('x-tenant-slug'),
      tenantName: headersList.get('x-tenant-name'),
      host: headersList.get('host'),
      userAgent: headersList.get('user-agent'),
    };
    
    devLog.log('[System Health] Headers do middleware:', middlewareHeaders);
    
    // 2. Testar conexão com Supabase
    let supabaseStatus = 'OK';
    let supabaseError = null;
    let organizationCount = 0;
    let usersCount = 0;
    
    try {
      const supabase = createSupabaseServiceRoleClient();
      
      // Testar query simples
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (orgError) {
        supabaseError = orgError.message;
        supabaseStatus = 'ERROR';
      } else {
        organizationCount = orgCount || 0;
      }
      
      // Testar query de usuários
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) {
        supabaseError = userError.message;
        supabaseStatus = 'ERROR';
      } else {
        usersCount = userCount || 0;
      }
      
    } catch (dbError: any) {
      supabaseStatus = 'EXCEPTION';
      supabaseError = dbError.message;
    }
    
    // 3. Verificar variáveis de ambiente críticas
    const envStatus = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      nextjsVersion: process.env.npm_package_dependencies_next || 'unknown'
    };
    
    // 4. Testar rota específica que está falhando
    let apiTestStatus = 'PENDING';
    let apiTestError = null;
    
    try {
      // Simular chamada interna para user profile
      const testUserId = 'test-user-id';
      const response = await fetch(`${request.nextUrl.origin}/api/user/profile?userId=${testUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        apiTestStatus = 'OK';
      } else {
        apiTestStatus = `ERROR_${response.status}`;
        apiTestError = await response.text().catch(() => 'Unknown error');
      }
      
    } catch (apiError: any) {
      apiTestStatus = 'EXCEPTION';
      apiTestError = apiError.message;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      status: 'COMPLETED',
      middleware: {
        status: middlewareHeaders.tenantId ? 'TENANT_DETECTED' : 'NO_TENANT',
        headers: middlewareHeaders
      },
      database: {
        status: supabaseStatus,
        error: supabaseError,
        organizationCount,
        usersCount
      },
      environment: envStatus,
      apiTest: {
        status: apiTestStatus,
        error: apiTestError,
        testedEndpoint: '/api/user/profile'
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    };
    
    devLog.log('[System Health] Diagnóstico completo:', diagnosticReport);
    
    return NextResponse.json({
      success: true,
      report: diagnosticReport
    });
    
  } catch (error: any) {
    devLog.error('[System Health] Erro no diagnóstico:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`
    }, { status: 500 });
  }
}
