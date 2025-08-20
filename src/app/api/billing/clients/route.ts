import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Billing] [Clients] Buscando clientes para cobrança');

    // ✅ PRODUÇÃO - Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Billing] [Clients] Service Role Key não disponível (provavelmente em build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, vamos verificar se a tabela users existe e sua estrutura
    devLog.log('[API] [Billing] [Clients] Verificando estrutura da tabela users...');
    
    // Buscar todos os usuários primeiro (sem filtro de role)
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .limit(5);

    if (allUsersError) {
      devLog.error('[API] [Billing] [Clients] Erro ao buscar todos os usuários:', allUsersError);
      return NextResponse.json(
        { error: 'Erro ao acessar tabela users', details: allUsersError.message },
        { status: 500 }
      );
    }

    devLog.log('[API] [Billing] [Clients] Primeiros usuários encontrados:', {
      count: allUsers?.length || 0,
      sample: allUsers?.slice(0, 3)
    });

    // Agora buscar especificamente clientes
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'cliente')
      .order('full_name', { ascending: true });

    if (error) {
      devLog.error('[API] [Billing] [Clients] Erro ao buscar clientes:', error);
      
      // Se falhar com 'cliente', tentar 'client'
      devLog.log('[API] [Billing] [Clients] Tentando com role="client"...');
      const { data: clientData, error: clientError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'client')
        .order('full_name', { ascending: true });
        
      if (clientError) {
        devLog.error('[API] [Billing] [Clients] Erro também com role="client":', clientError);
        return NextResponse.json(
          { error: 'Erro ao buscar clientes', details: error.message },
          { status: 500 }
        );
      }
      
      devLog.log('[API] [Billing] [Clients] Clientes encontrados com role="client":', clientData?.length || 0);
      return NextResponse.json({
        success: true,
        data: clientData || []
      });
    }

    devLog.log('[API] [Billing] [Clients] Clientes encontrados com role="cliente":', data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    devLog.error('[API] [Billing] [Clients] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 