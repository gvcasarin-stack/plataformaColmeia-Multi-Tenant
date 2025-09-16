import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

/**
 * API de TESTE para diagnosticar problemas específicos de tenant
 * 
 * @route GET /api/debug/tenant-api-test?tenant=TENANT_ID
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const targetTenant = url.searchParams.get('tenant');
    const hdrs = headers();
    const currentTenant = hdrs.get('x-tenant-id');

    devLog.log('[DEBUG] Testando APIs para tenant:', { targetTenant, currentTenant });

    if (!targetTenant) {
      return NextResponse.json({ 
        error: 'Uso: /api/debug/tenant-api-test?tenant=TENANT_ID' 
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    const results = {};

    // Teste 1: Buscar usuários básicos
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status')
        .eq('tenant_id', targetTenant)
        .limit(5);

      results.basic_users = {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
        sample: data?.[0] || null
      };
    } catch (err) {
      results.basic_users = {
        success: false,
        error: err.message
      };
    }

    // Teste 2: Contagem de usuários
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', targetTenant);

      results.users_count = {
        success: !error,
        count: count || 0,
        error: error?.message
      };
    } catch (err) {
      results.users_count = {
        success: false,
        error: err.message
      };
    }

    // Teste 3: Buscar clientes específicos
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', targetTenant)
        .eq('role', 'client')
        .eq('status', 'active');

      results.active_clients = {
        success: !error,
        count: data?.length || 0,
        error: error?.message
      };
    } catch (err) {
      results.active_clients = {
        success: false,
        error: err.message
      };
    }

    // Teste 4: Projetos do tenant
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, created_at')
        .eq('tenant_id', targetTenant)
        .limit(5);

      results.projects = {
        success: !error,
        count: data?.length || 0,
        error: error?.message,
        sample: data?.[0] || null
      };
    } catch (err) {
      results.projects = {
        success: false,
        error: err.message
      };
    }

    // Teste 5: Notificações do tenant
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, title, created_at')
        .eq('tenant_id', targetTenant)
        .limit(5);

      results.notifications = {
        success: !error,
        count: data?.length || 0,
        error: error?.message
      };
    } catch (err) {
      results.notifications = {
        success: false,
        error: err.message
      };
    }

    // Teste 6: Organizações relacionadas
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, status, plan')
        .eq('id', targetTenant);

      results.organization = {
        success: !error,
        exists: (data?.length || 0) > 0,
        error: error?.message,
        data: data?.[0] || null
      };
    } catch (err) {
      results.organization = {
        success: false,
        error: err.message
      };
    }

    // Resumo executivo
    const successfulTests = Object.values(results).filter(r => r.success).length;
    const totalTests = Object.keys(results).length;
    const healthScore = Math.round((successfulTests / totalTests) * 100);

    const summary = {
      targetTenant,
      currentTenant,
      healthScore: `${healthScore}%`,
      successfulTests: `${successfulTests}/${totalTests}`,
      hasProblems: healthScore < 100,
      criticalIssues: Object.entries(results)
        .filter(([_, result]) => !result.success)
        .map(([test, result]) => ({ test, error: result.error }))
    };

    devLog.log('[DEBUG] Teste concluído:', summary);

    return NextResponse.json({
      success: true,
      summary,
      detailedResults: results,
      recommendations: [
        healthScore < 50 ? 'CRÍTICO: Tenant com problemas graves' : null,
        !results.organization?.exists ? 'Tenant sem organização correspondente' : null,
        !results.basic_users?.success ? 'Problema básico de acesso a usuários' : null
      ].filter(Boolean)
    });

  } catch (err) {
    devLog.error('[DEBUG] Erro no teste de tenant:', err);
    return NextResponse.json({ 
      error: 'Erro no teste', 
      details: err instanceof Error ? err.message : String(err)
    });
  }
}