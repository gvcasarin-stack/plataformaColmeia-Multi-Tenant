import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * GET /api/admin/clientes
 * Lista todos os clientes (role = 'client') do tenant atual
 * Usado para: Controle de acesso de colaboradores, filtros, etc.
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API /admin/clientes GET] Iniciando busca de clientes');

    // ✅ Obter tenant_id dos headers
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/clientes GET] Tenant ID não fornecido');
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // 🔍 Buscar todos os clientes do tenant
    const { data: clientes, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        company_name,
        phone,
        created_at,
        billing_mode
      `)
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .order('name', { ascending: true });

    if (error) {
      devLog.error('[API /admin/clientes GET] Erro ao buscar clientes:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar clientes' },
        { status: 500 }
      );
    }

    devLog.log('[API /admin/clientes GET] Clientes encontrados:', clientes?.length || 0);

    return NextResponse.json({
      success: true,
      data: clientes || [],
    });

  } catch (error: any) {
    devLog.error('[API /admin/clientes GET] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

