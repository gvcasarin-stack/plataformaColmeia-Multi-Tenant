import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * ANÁLISE PROFUNDA E DEFINITIVA do problema de tenant
 * Esta API vai testar TUDO sem fazer alterações
 */
export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    analysis: {},
    recommendations: []
  };

  try {
    const headersList = headers();
    const hostname = headersList.get('host') || '';
    
    // 1. ANÁLISE DO HOSTNAME E EXTRAÇÃO DE SLUG
    const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && 
                       !hostname.includes('www.') && 
                       !hostname.includes('registro.');
    const extractedSlug = isSubdomain ? hostname.split('.')[0] : null;
    
    results.analysis.hostname = {
      hostname,
      isSubdomain,
      extractedSlug,
      shouldHaveTenant: isSubdomain
    };

    // 2. ANÁLISE DOS HEADERS RECEBIDOS
    const receivedHeaders = {
      'x-tenant-id': headersList.get('x-tenant-id'),
      'x-tenant-slug': headersList.get('x-tenant-slug'), 
      'x-tenant-name': headersList.get('x-tenant-name'),
      'x-tenant-trial': headersList.get('x-tenant-trial'),
      'x-middleware-error': headersList.get('x-middleware-error'),
      'x-middleware-critical-error': headersList.get('x-middleware-critical-error')
    };
    
    results.analysis.headers = {
      received: receivedHeaders,
      middlewareExecuted: !!receivedHeaders['x-tenant-slug'] || !!receivedHeaders['x-middleware-error'],
      tenantResolved: !!receivedHeaders['x-tenant-id'],
      hasError: !!receivedHeaders['x-middleware-error']
    };

    if (!isSubdomain) {
      results.recommendations.push("✅ Não é subdomínio de tenant - comportamento esperado");
      return NextResponse.json(results);
    }

    // 3. TESTE DIRETO COM SERVICE ROLE CLIENT
    results.analysis.serviceRoleTest = {};
    try {
      const supabaseService = createSupabaseServiceRoleClient();
      
      // Teste de conectividade básica
      const { data: healthCheck, error: healthError } = await supabaseService
        .from('organizations')
        .select('count')
        .limit(1);
      
      results.analysis.serviceRoleTest.connectivity = {
        success: !healthError,
        error: healthError?.message || null
      };

      if (!healthError && extractedSlug) {
        // Teste de lookup do tenant específico
        const { data: orgData, error: orgError } = await supabaseService
          .from('organizations')
          .select('id, name, slug, status, trial_end_date, is_trial, created_at')
          .eq('slug', extractedSlug)
          .single();

        results.analysis.serviceRoleTest.tenantLookup = {
          tenantSlug: extractedSlug,
          found: !!orgData,
          error: orgError?.message || null,
          errorCode: orgError?.code || null,
          data: orgData || null
        };

        // Teste com diferentes condições
        if (orgError) {
          // Tentar sem filtro de status
          const { data: orgDataAny, error: orgErrorAny } = await supabaseService
            .from('organizations')
            .select('id, name, slug, status, trial_end_date, is_trial')
            .eq('slug', extractedSlug);

          results.analysis.serviceRoleTest.tenantLookupAnyStatus = {
            found: !!orgDataAny && orgDataAny.length > 0,
            count: orgDataAny?.length || 0,
            data: orgDataAny || null,
            error: orgErrorAny?.message || null
          };
        }
      }
    } catch (error: any) {
      results.analysis.serviceRoleTest.error = error.message;
    }

    // 4. TESTE DIRETO COM SERVER CLIENT (para comparação)
    results.analysis.serverClientTest = {};
    try {
      const supabaseServer = createSupabaseServerClient();
      
      const { data: healthCheck, error: healthError } = await supabaseServer
        .from('organizations')
        .select('count')
        .limit(1);
      
      results.analysis.serverClientTest.connectivity = {
        success: !healthError,
        error: healthError?.message || null
      };

      if (!healthError && extractedSlug) {
        const { data: orgData, error: orgError } = await supabaseServer
          .from('organizations')
          .select('id, name, slug, status')
          .eq('slug', extractedSlug)
          .eq('status', 'active')
          .single();

        results.analysis.serverClientTest.tenantLookup = {
          found: !!orgData,
          error: orgError?.message || null,
          data: orgData || null
        };
      }
    } catch (error: any) {
      results.analysis.serverClientTest.error = error.message;
    }

    // 5. ANÁLISE DE VARIÁVEIS DE AMBIENTE
    results.analysis.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      nodeEnv: process.env.NODE_ENV,
      runtime: typeof window === 'undefined' ? 'server' : 'client'
    };

    // 6. GERAR RECOMENDAÇÕES BASEADAS NA ANÁLISE
    const serviceRoleWorks = results.analysis.serviceRoleTest.tenantLookup?.found;
    const serverClientWorks = results.analysis.serverClientTest.tenantLookup?.found;
    const middlewareConfiguredHeaders = results.analysis.headers.tenantResolved;

    if (!middlewareConfiguredHeaders && serviceRoleWorks) {
      results.recommendations.push("🎯 SOLUÇÃO: Middleware deve usar Service Role Client - lookup funciona mas headers não são configurados");
    }

    if (!middlewareConfiguredHeaders && !serviceRoleWorks && !serverClientWorks) {
      results.recommendations.push("❌ PROBLEMA CRÍTICO: Nenhum client do Supabase consegue encontrar o tenant");
    }

    if (middlewareConfiguredHeaders) {
      results.recommendations.push("✅ Headers configurados corretamente - problema pode estar em outro lugar");
    }

    if (!results.analysis.environment.hasServiceRoleKey) {
      results.recommendations.push("❌ FALTA: Variável SUPABASE_SERVICE_ROLE_KEY não configurada");
    }

    if (!results.analysis.environment.hasSupabaseUrl) {
      results.recommendations.push("❌ FALTA: Variável NEXT_PUBLIC_SUPABASE_URL não configurada");
    }

    // 7. DIAGNÓSTICO FINAL
    results.diagnosis = {
      middlewareExecuting: results.analysis.headers.middlewareExecuted,
      tenantLookupWorking: serviceRoleWorks || serverClientWorks,
      headersBeingSet: middlewareConfiguredHeaders,
      environmentReady: results.analysis.environment.hasSupabaseUrl && results.analysis.environment.hasServiceRoleKey,
      
      overallStatus: middlewareConfiguredHeaders ? 'WORKING' : 
                    (serviceRoleWorks ? 'FIXABLE' : 'CRITICAL'),
      
      nextAction: middlewareConfiguredHeaders ? 'Sistema funcionando' :
                 (serviceRoleWorks ? 'Corrigir middleware para usar Service Role' :
                 'Verificar configuração do banco/variáveis')
    };

    return NextResponse.json(results);

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      criticalError: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}