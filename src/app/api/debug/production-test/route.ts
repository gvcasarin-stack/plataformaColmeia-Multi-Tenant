import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API DE TESTE COMPLETA PARA PRODUÇÃO
 * GET /api/debug/production-test
 * 
 * Testa TUDO que pode estar causando problemas:
 * - Middleware headers
 * - Conexão Supabase
 * - Tenant específico
 * - APIs críticas
 * - Variáveis de ambiente
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    devLog.log('[Production Test] 🚀 Iniciando teste completo de produção...');
    
    // ========================================
    // 1. TESTE DO MIDDLEWARE E HEADERS
    // ========================================
    const headersList = headers();
    const middlewareTest = {
      tenantId: headersList.get('x-tenant-id'),
      tenantSlug: headersList.get('x-tenant-slug'),
      tenantName: headersList.get('x-tenant-name'),
      tenantTrial: headersList.get('x-tenant-trial'),
      host: headersList.get('host'),
      userAgent: headersList.get('user-agent'),
      allHeaders: Object.fromEntries(headersList.entries())
    };
    
    devLog.log('[Production Test] 📋 Headers do middleware:', middlewareTest);
    
    // ========================================
    // 2. TESTE DE CONEXÃO SUPABASE
    // ========================================
    let supabaseTest = {
      status: 'UNKNOWN',
      error: null,
      organizationCount: 0,
      usersCount: 0,
      supremaTenant: null
    };
    
    try {
      const supabase = createSupabaseServiceRoleClient();
      
      // Testar contagem de organizações
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (orgError) {
        throw new Error(`Organizations query failed: ${orgError.message}`);
      }
      
      supabaseTest.organizationCount = orgCount || 0;
      
      // Testar contagem de usuários
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      if (userError) {
        throw new Error(`Users query failed: ${userError.message}`);
      }
      
      supabaseTest.usersCount = userCount || 0;
      
      // Buscar especificamente o tenant "suprema"
      const { data: supremaData, error: supremaError } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', 'suprema')
        .single();
      
      if (supremaError && supremaError.code !== 'PGRST116') {
        throw new Error(`Suprema query failed: ${supremaError.message}`);
      }
      
      supabaseTest.supremaTenant = supremaData || 'NOT_FOUND';
      supabaseTest.status = 'OK';
      
    } catch (dbError: any) {
      supabaseTest.status = 'ERROR';
      supabaseTest.error = dbError.message;
    }
    
    devLog.log('[Production Test] 🗄️ Teste Supabase:', supabaseTest);
    
    // ========================================
    // 3. TESTE DE VARIÁVEIS DE AMBIENTE
    // ========================================
    const envTest = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel'
    };
    
    devLog.log('[Production Test] 🔧 Variáveis de ambiente:', envTest);
    
    // ========================================
    // 4. TESTE DE APIS CRÍTICAS (SIMULADO)
    // ========================================
    const apiTests = [];
    
    // Teste API user/profile (simulado)
    try {
      const testUserId = 'c35c1f3d-7cde-4ef8-a6d1-bea1ab6f2315'; // Do erro que você mostrou
      
      // Simular a busca que o AuthContext faz
      const supabase = createSupabaseServiceRoleClient();
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', testUserId)
        .single();
      
      apiTests.push({
        api: '/api/user/profile (simulado)',
        status: userError ? 'ERROR' : 'OK',
        error: userError?.message || null,
        data: userData || null
      });
      
    } catch (apiError: any) {
      apiTests.push({
        api: '/api/user/profile (simulado)',
        status: 'EXCEPTION',
        error: apiError.message,
        data: null
      });
    }
    
    // Teste tenant/organization (simulado)
    try {
      const supabase = createSupabaseServiceRoleClient();
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, is_trial, trial_start_date, trial_end_date, subscription_status, status')
        .eq('slug', 'suprema')
        .eq('status', 'active')
        .single();
      
      apiTests.push({
        api: '/api/tenant/organization (simulado)',
        status: orgError ? 'ERROR' : 'OK',
        error: orgError?.message || null,
        data: orgData || null
      });
      
    } catch (apiError: any) {
      apiTests.push({
        api: '/api/tenant/organization (simulado)',
        status: 'EXCEPTION',
        error: apiError.message,
        data: null
      });
    }
    
    devLog.log('[Production Test] 🔌 Testes de API:', apiTests);
    
    // ========================================
    // 5. DIAGNÓSTICO FINAL
    // ========================================
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const finalReport = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isVercel: !!process.env.VERCEL_ENV,
        vercelEnv: process.env.VERCEL_ENV
      },
      middleware: middlewareTest,
      database: supabaseTest,
      environment_variables: envTest,
      api_tests: apiTests,
      summary: {
        middlewareWorking: !!middlewareTest.tenantId,
        databaseWorking: supabaseTest.status === 'OK',
        supremaTenantFound: supabaseTest.supremaTenant !== 'NOT_FOUND' && supabaseTest.supremaTenant !== null,
        envVarsComplete: envTest.supabaseUrl === 'SET' && envTest.supabaseServiceKey === 'SET',
        overallStatus: 'CALCULATED_BELOW'
      }
    };
    
    // Calcular status geral
    const issues = [];
    if (!finalReport.summary.middlewareWorking) issues.push('MIDDLEWARE_NO_TENANT');
    if (!finalReport.summary.databaseWorking) issues.push('DATABASE_ERROR');
    if (!finalReport.summary.supremaTenantFound) issues.push('SUPREMA_TENANT_MISSING');
    if (!finalReport.summary.envVarsComplete) issues.push('ENV_VARS_MISSING');
    
    finalReport.summary.overallStatus = issues.length === 0 ? 'ALL_OK' : `ISSUES: ${issues.join(', ')}`;
    
    devLog.log('[Production Test] 📊 Relatório final:', finalReport);
    
    return NextResponse.json({
      success: true,
      report: finalReport,
      recommendations: issues.length === 0 ? [
        'Sistema parece estar funcionando corretamente',
        'Se ainda há erros 404, pode ser problema de cache do navegador',
        'Tente fazer hard refresh (Ctrl+Shift+R)'
      ] : [
        'Problemas identificados no relatório acima',
        'Verifique especialmente a seção "summary" para problemas principais',
        issues.includes('SUPREMA_TENANT_MISSING') ? 'Execute o script SQL para corrigir dados do tenant' : null
      ].filter(Boolean)
    });
    
  } catch (error: any) {
    devLog.error('[Production Test] ❌ Erro crítico no teste:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      duration: `${Date.now() - startTime}ms`,
      recommendation: 'Erro crítico no sistema - verifique logs do servidor'
    }, { status: 500 });
  }
}
