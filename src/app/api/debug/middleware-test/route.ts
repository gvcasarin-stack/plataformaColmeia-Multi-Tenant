import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API específica para testar se o middleware está funcionando corretamente
 * GET /api/debug/middleware-test
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[MIDDLEWARE TEST] Iniciando teste do middleware');

    const headersList = headers();
    
    // Capturar TODOS os headers relevantes
    const allHeaders = {
      'host': headersList.get('host'),
      'x-tenant-id': headersList.get('x-tenant-id'),
      'x-tenant-slug': headersList.get('x-tenant-slug'),
      'x-tenant-name': headersList.get('x-tenant-name'),
      'x-tenant-trial': headersList.get('x-tenant-trial'),
      'x-middleware-error': headersList.get('x-middleware-error'),
      'x-middleware-critical-error': headersList.get('x-middleware-critical-error')
    };

    // Teste direto da função Service Role para comparação
    let serviceRoleTest = null;
    try {
      const supabase = createSupabaseServiceRoleClient();
      const hostname = headersList.get('host') || '';
      const tenantSlug = hostname.split('.')[0];
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, status')
        .eq('slug', tenantSlug)
        .eq('status', 'active')
        .single();

      serviceRoleTest = {
        tenantSlug,
        found: !!orgData,
        error: orgError?.message || null,
        data: orgData
      };
    } catch (error: any) {
      serviceRoleTest = {
        error: 'Erro no teste Service Role: ' + error.message
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      headers: allHeaders,
      serviceRoleTest,
      middlewareWorking: !!allHeaders['x-tenant-id'],
      analysis: {
        hasSlug: !!allHeaders['x-tenant-slug'],
        hasId: !!allHeaders['x-tenant-id'],
        hasError: !!allHeaders['x-middleware-error'],
        hostname: allHeaders.host
      }
    });

  } catch (error: any) {
    devLog.error('[MIDDLEWARE TEST] Erro crítico:', error);
    return NextResponse.json(
      { 
        error: 'Erro crítico no teste do middleware',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}