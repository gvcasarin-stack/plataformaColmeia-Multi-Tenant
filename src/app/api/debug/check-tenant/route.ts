import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para verificar status de um tenant específico
 * GET /api/debug/check-tenant?slug=TENANT_SLUG
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('slug');
    
    if (!tenantSlug) {
      return NextResponse.json({
        error: 'slug é obrigatório',
        usage: '/api/debug/check-tenant?slug=suprema'
      }, { status: 400 });
    }
    
    devLog.log('[Check Tenant] Verificando tenant:', tenantSlug);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar tenant com todos os detalhes
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', tenantSlug);
    
    const result = {
      slug: tenantSlug,
      found: !orgError && orgData && orgData.length > 0,
      error: orgError?.message || null,
      data: orgData || null,
      count: orgData?.length || 0,
      activeCount: orgData?.filter(org => org.is_active).length || 0,
      timestamp: new Date().toISOString()
    };
    
    devLog.log('[Check Tenant] Resultado:', result);
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error: any) {
    devLog.error('[Check Tenant] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
