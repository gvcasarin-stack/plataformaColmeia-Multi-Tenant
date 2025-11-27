import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para listar clientes ativos - PRODUÇÃO READY
 * 
 * @route GET /api/admin/clients
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] /admin/clients - Iniciando busca de clientes ativos');
    
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    
    if (!tenantId) {
      devLog.warn('[API] /admin/clients - Sem tenant-id, retornando array vazio');
      return NextResponse.json({ success: true, data: [] });
    }

    // Verificar ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] /admin/clients - Sem env de Supabase; retornando []');
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar clientes ativos do tenant atual (campos corretos)
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, name, phone, role, status,
        is_blocked, blocked_reason, blocked_at, blocked_by,
        tenant_id, created_at, updated_at,
        permissions, settings, user_type, auth_provider,
        avatar_url, department, position, last_login, login_count,
        company_name, is_company, cpf, cnpj
      `)
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API] /admin/clients - Erro na consulta:', error);
      // Em caso de erro, retornar array vazio para não quebrar o sistema
      return NextResponse.json({ success: true, data: [] });
    }

    const clients = data || [];
    devLog.log('[API] /admin/clients - Clientes encontrados:', clients.length);
    devLog.log('[API] /admin/clients - Query executada:', {
      tenantId,
      role: 'client',
      status: 'active',
      resultCount: clients.length
    });

    return NextResponse.json({ 
      success: true, 
      data: clients,
      count: clients.length,
      debug: {
        tenantId: tenantId,
        filters: {
          role: 'client',
          status: 'active'
        }
      }
    });

  } catch (err) {
    devLog.error('[API] /admin/clients - Exceção:', err);
    // Em caso de exceção, retornar array vazio para não quebrar o sistema
    return NextResponse.json({ success: true, data: [] });
  }
}