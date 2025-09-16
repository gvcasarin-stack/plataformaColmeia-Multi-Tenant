import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * API PARA CONTAR CLIENTES NO PAINEL ADMIN
 * GET /api/admin/client-count
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Admin] [ClientCount] Iniciando contagem de clientes');

    // Verificar headers do middleware
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');

    devLog.log('[API] [Admin] [ClientCount] Headers recebidos:', {
      tenantId,
      tenantSlug
    });

    // Verificar se Service Role Key está disponível
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Admin] [ClientCount] Service Role Key não disponível');
      return NextResponse.json({
        success: true,
        count: 0,
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Construir query com Service Role (tem permissões completas)
    let query = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'cliente');

    // Aplicar filtro de tenant se disponível
    if (tenantId && tenantId !== 'null') {
      query = query.eq('tenant_id', tenantId);
      devLog.log('[API] [Admin] [ClientCount] Aplicando filtro de tenant:', tenantId);
    }

    const { count, error } = await query;

    if (error) {
      devLog.error('[API] [Admin] [ClientCount] Erro na query:', error);
      
      // Diagnosticar possíveis causas
      const diagnostics = {
        errorCode: error.code,
        errorMessage: error.message,
        possibleCauses: []
      };

      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        diagnostics.possibleCauses.push('Tabela users não existe');
      }
      
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        diagnostics.possibleCauses.push('Coluna role não existe na tabela users');
      }
      
      if (error.message?.includes('RLS') || error.message?.includes('permission')) {
        diagnostics.possibleCauses.push('Política RLS bloqueando acesso (improvável com Service Role)');
      }

      return NextResponse.json({
        success: false,
        error: 'Erro ao contar clientes',
        details: error.message,
        diagnostics
      }, { status: 500 });
    }

    const clientCount = count || 0;
    
    devLog.log('[API] [Admin] [ClientCount] Contagem concluída:', {
      count: clientCount,
      tenantId,
      tenantSlug
    });

    return NextResponse.json({
      success: true,
      count: clientCount,
      tenantId,
      tenantSlug
    });

  } catch (error: any) {
    devLog.error('[API] [Admin] [ClientCount] Exceção:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }, { status: 500 });
  }
}