import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API DE DIAGNÓSTICO COMPLETA
 * Esta API vai mapear TUDO que está errado no sistema
 * GET /api/debug/complete-diagnosis
 */
export async function GET(request: NextRequest) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    url: request.url,
    hostname: '',
    isSubdomain: false,
    extractedSlug: null,
    middleware: {
      executed: false,
      headers: {},
      bypassReason: null
    },
    environment: {},
    supabase: {
      connectivity: false,
      serviceRole: false,
      errors: []
    },
    tenant: {
      found: false,
      data: null,
      error: null
    },
    user: {
      found: false,
      data: null,
      error: null
    },
    apis: {
      working: [],
      failing: []
    },
    recommendations: []
  };

  try {
    const headersList = headers();
    diagnosis.hostname = headersList.get('host') || '';
    
    // 1. ANÁLISE DO HOSTNAME
    diagnosis.isSubdomain = diagnosis.hostname.includes('.gerenciamentofotovoltaico.com.br') && 
                           !diagnosis.hostname.includes('www.') && 
                           !diagnosis.hostname.includes('registro.');
    
    if (diagnosis.isSubdomain) {
      diagnosis.extractedSlug = diagnosis.hostname.split('.')[0];
    }

    // 2. ANÁLISE DOS HEADERS DO MIDDLEWARE
    diagnosis.middleware.headers = {
      'host': headersList.get('host'),
      'x-tenant-id': headersList.get('x-tenant-id'),
      'x-tenant-slug': headersList.get('x-tenant-slug'), 
      'x-tenant-name': headersList.get('x-tenant-name'),
      'x-tenant-trial': headersList.get('x-tenant-trial'),
      'x-middleware-error': headersList.get('x-middleware-error'),
      'x-is-registro-site': headersList.get('x-is-registro-site')
    };

    diagnosis.middleware.executed = !!(
      diagnosis.middleware.headers['x-tenant-slug'] || 
      diagnosis.middleware.headers['x-middleware-error'] ||
      diagnosis.middleware.headers['x-is-registro-site']
    );

    // Determinar por que o middleware fez bypass
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    if (pathname.startsWith('/admin')) {
      diagnosis.middleware.bypassReason = 'admin_route_bypass';
    } else if (!diagnosis.isSubdomain) {
      diagnosis.middleware.bypassReason = 'not_subdomain';
    } else if (pathname.startsWith('/api/debug/')) {
      diagnosis.middleware.bypassReason = 'debug_api_bypass';
    }

    // 3. ANÁLISE DO AMBIENTE
    diagnosis.environment = {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      platform: 'vercel' // assumindo Vercel
    };

    // 4. TESTE DO SUPABASE SERVICE ROLE
    try {
      const supabase = createSupabaseServiceRoleClient();
      diagnosis.supabase.serviceRole = true;
      
      // Teste de conectividade
      try {
        const { data: healthData, error: healthError } = await supabase
          .from('organizations')
          .select('count')
          .limit(1);
        
        if (healthError) {
          diagnosis.supabase.errors.push({
            test: 'connectivity',
            error: healthError.message,
            code: healthError.code
          });
        } else {
          diagnosis.supabase.connectivity = true;
        }
      } catch (connectError: any) {
        diagnosis.supabase.errors.push({
          test: 'connectivity_exception',
          error: connectError.message
        });
      }

      // 5. TESTE DO TENANT (se aplicável)
      if (diagnosis.extractedSlug && diagnosis.supabase.connectivity) {
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, slug, status, trial_end_date, is_trial')
            .eq('slug', diagnosis.extractedSlug)
            .single();

          if (orgError) {
            diagnosis.tenant.error = orgError.message;
            
            // Tentar buscar com qualquer status
            const { data: anyOrgData, error: anyOrgError } = await supabase
              .from('organizations')
              .select('id, name, slug, status, trial_end_date, is_trial')
              .eq('slug', diagnosis.extractedSlug);

            if (!anyOrgError && anyOrgData && anyOrgData.length > 0) {
              diagnosis.tenant.data = anyOrgData[0];
              diagnosis.tenant.found = true;
              diagnosis.tenant.error = `Tenant encontrado mas com status: ${anyOrgData[0].status}`;
            }
          } else {
            diagnosis.tenant.found = true;
            diagnosis.tenant.data = orgData;
          }
        } catch (tenantError: any) {
          diagnosis.tenant.error = tenantError.message;
        }
      }

      // 6. TESTE DE USUÁRIO (se tenant encontrado)
      if (diagnosis.tenant.found) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email, role, tenant_id, status')
            .eq('tenant_id', diagnosis.tenant.data.id)
            .limit(1);

          if (userError) {
            diagnosis.user.error = userError.message;
          } else if (userData && userData.length > 0) {
            diagnosis.user.found = true;
            diagnosis.user.data = {
              count: userData.length,
              sample: userData[0]
            };
          }
        } catch (userError: any) {
          diagnosis.user.error = userError.message;
        }
      }

    } catch (supabaseError: any) {
      diagnosis.supabase.errors.push({
        test: 'service_role_creation',
        error: supabaseError.message
      });
    }

    // 7. TESTE DE APIs CRÍTICAS
    const criticalApis = [
      '/api/user/profile',
      '/api/notifications/count',
      '/api/billing/projects',
      '/api/admin/client-requests'
    ];

    // Simular teste das APIs (não fazer requests reais para evitar loops)
    for (const api of criticalApis) {
      if (diagnosis.middleware.headers['x-tenant-id']) {
        diagnosis.apis.working.push(api);
      } else {
        diagnosis.apis.failing.push({
          api,
          reason: 'missing_x_tenant_id'
        });
      }
    }

    // 8. GERAR RECOMENDAÇÕES
    if (!diagnosis.environment.hasSupabaseUrl) {
      diagnosis.recommendations.push('❌ CRÍTICO: Variável NEXT_PUBLIC_SUPABASE_URL não configurada');
    }
    
    if (!diagnosis.environment.hasServiceRoleKey) {
      diagnosis.recommendations.push('❌ CRÍTICO: Variável SUPABASE_SERVICE_ROLE_KEY não configurada');
    }

    if (!diagnosis.supabase.connectivity) {
      diagnosis.recommendations.push('❌ CRÍTICO: Não consegue conectar ao Supabase');
    }

    if (diagnosis.isSubdomain && !diagnosis.middleware.headers['x-tenant-id']) {
      diagnosis.recommendations.push('🎯 PROBLEMA PRINCIPAL: Middleware não configura x-tenant-id para subdomínios');
      diagnosis.recommendations.push('💡 SOLUÇÃO: Middleware precisa configurar headers mesmo para rotas admin');
    }

    if (diagnosis.extractedSlug && !diagnosis.tenant.found) {
      diagnosis.recommendations.push(`❌ Tenant "${diagnosis.extractedSlug}" não encontrado no banco`);
    }

    if (diagnosis.tenant.found && diagnosis.tenant.data.status !== 'active') {
      diagnosis.recommendations.push(`⚠️ Tenant encontrado mas com status: ${diagnosis.tenant.data.status}`);
    }

    if (diagnosis.middleware.bypassReason === 'admin_route_bypass') {
      diagnosis.recommendations.push('🔍 Admin route bypass ativo - headers não configurados para APIs');
    }

    if (diagnosis.apis.failing.length > 0) {
      diagnosis.recommendations.push(`❌ ${diagnosis.apis.failing.length} APIs vão falhar por falta de x-tenant-id`);
    }

    if (diagnosis.recommendations.length === 0) {
      diagnosis.recommendations.push('✅ Sistema parece estar funcionando corretamente');
    }

    return NextResponse.json(diagnosis, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      ...diagnosis,
      criticalError: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}