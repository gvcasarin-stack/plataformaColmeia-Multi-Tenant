import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API de DEBUG para ver dados reais da tabela users
 * 
 * @route GET /api/debug/users-data
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[DEBUG] /users-data - Investigando dados da tabela users');
    
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    
    devLog.log('[DEBUG] tenant-id atual:', tenantId);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Env vars não configuradas' });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar TODOS os usuários para debug (campos básicos)
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, name, role, status, tenant_id, created_at')
      .limit(10);

    if (allError) {
      return NextResponse.json({ error: 'Erro na consulta', details: allError });
    }

    // Buscar usuários do tenant atual
    const { data: tenantUsers, error: tenantError } = await supabase
      .from('users')
      .select('id, email, name, role, status, tenant_id, created_at')
      .eq('tenant_id', tenantId);

    // Buscar usuários com role 'client'
    const { data: clientUsers, error: clientError } = await supabase
      .from('users')
      .select('id, email, name, role, status, tenant_id, created_at')
      .eq('role', 'client');

    // Buscar usuários com status 'active'
    const { data: activeUsers, error: activeError } = await supabase
      .from('users')
      .select('id, email, name, role, status, tenant_id, created_at')
      .eq('status', 'active');

    return NextResponse.json({ 
      debug: {
        currentTenantId: tenantId,
        allUsers: allUsers?.length || 0,
        tenantUsers: tenantUsers?.length || 0,
        clientUsers: clientUsers?.length || 0,
        activeUsers: activeUsers?.length || 0,
      },
      samples: {
        allUsers: allUsers?.slice(0, 3) || [],
        tenantUsers: tenantUsers?.slice(0, 3) || [],
        clientUsers: clientUsers?.slice(0, 3) || [],
        activeUsers: activeUsers?.slice(0, 3) || [],
      }
    });

  } catch (err) {
    devLog.error('[DEBUG] /users-data - Exceção:', err);
    return NextResponse.json({ error: 'Exceção', details: err });
  }
}