import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * Teste direto do Service Role Client - ISOLADO
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[TEST SERVICE ROLE] Iniciando teste...');
    
    // 1. Teste de criação do client
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      console.log('[TEST SERVICE ROLE] Client criado com sucesso');
    } catch (clientError: any) {
      return NextResponse.json({
        error: 'Erro ao criar Service Role Client',
        details: clientError.message,
        step: 'client_creation'
      });
    }

    // 2. Teste de conectividade básica
    console.log('[TEST SERVICE ROLE] Testando conectividade...');
    try {
      const { data: healthData, error: healthError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (healthError) {
        return NextResponse.json({
          error: 'Erro de conectividade',
          details: healthError.message,
          code: healthError.code,
          step: 'connectivity_test'
        });
      }
      
      console.log('[TEST SERVICE ROLE] Conectividade OK');
    } catch (connectError: any) {
      return NextResponse.json({
        error: 'Exceção na conectividade',
        details: connectError.message,
        step: 'connectivity_exception'
      });
    }

    // 3. Teste de busca de usuário específico
    const userId = 'c8064568-bc85-4bc6-ad6d-5562049c9865';
    console.log('[TEST SERVICE ROLE] Buscando usuário:', userId);
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', userId)
        .single();

      if (userError) {
        return NextResponse.json({
          error: 'Erro ao buscar usuário',
          details: userError.message,
          code: userError.code,
          userId,
          step: 'user_fetch'
        });
      }

      console.log('[TEST SERVICE ROLE] Usuário encontrado:', userData?.email);
      
      return NextResponse.json({
        success: true,
        message: 'Service Role Client funcionando perfeitamente',
        user: {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          tenant_id: userData.tenant_id,
          status: userData.status
        },
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      });

    } catch (userException: any) {
      return NextResponse.json({
        error: 'Exceção ao buscar usuário',
        details: userException.message,
        userId,
        step: 'user_exception'
      });
    }

  } catch (error: any) {
    console.error('[TEST SERVICE ROLE] Erro crítico:', error);
    return NextResponse.json({
      error: 'Erro crítico no teste',
      details: error.message,
      step: 'critical_error'
    }, { status: 500 });
  }
}