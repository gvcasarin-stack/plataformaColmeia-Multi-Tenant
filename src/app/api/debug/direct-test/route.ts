import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * Teste direto do Service Role Client para debug
 * GET /api/debug/direct-test
 */
export async function GET(request: NextRequest) {
  try {
    // Teste 1: Consegue criar o cliente?
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      console.log('[DIRECT TEST] Service Role client criado com sucesso');
    } catch (error: any) {
      return NextResponse.json({
        error: 'Erro ao criar Service Role client',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Teste 2: Consegue fazer query básica?
    try {
      const { data: countData, error: countError } = await supabase
        .from('organizations')
        .select('count')
        .limit(1);

      if (countError) {
        return NextResponse.json({
          error: 'Erro na query básica',
          details: countError.message,
          code: countError.code,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      return NextResponse.json({
        error: 'Erro na execução da query básica',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Teste 3: Consegue buscar organização específica?
    const tenantSlug = 'goias-solar';
    try {
      console.log('[DIRECT TEST] Buscando org com slug:', tenantSlug);
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, status, trial_end_date, is_trial')
        .eq('slug', tenantSlug)
        .eq('status', 'active')
        .single();

      console.log('[DIRECT TEST] Resultado:', { found: !!orgData, error: orgError?.message });

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        serviceRoleWorking: true,
        basicQueryWorking: true,
        tenantSlug,
        orgLookup: {
          found: !!orgData,
          error: orgError?.message || null,
          errorCode: orgError?.code || null,
          data: orgData ? {
            id: orgData.id,
            name: orgData.name,
            slug: orgData.slug,
            status: orgData.status,
            is_trial: orgData.is_trial
          } : null
        },
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      });

    } catch (error: any) {
      return NextResponse.json({
        error: 'Erro na busca da organização',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Erro crítico no teste direto',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}