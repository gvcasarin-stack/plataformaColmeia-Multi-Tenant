import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

// ✅ CORRIGIDO: Forçar runtime dinâmico
export const dynamic = 'force-dynamic';

/**
 * API de DEBUG para verificar usuários do tenant
 * GET /api/debug/check-tenant-users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    console.log('🔍 [DEBUG check-tenant-users] Tenant ID:', tenantId);

    // Buscar TODOS os usuários do tenant
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, name, email, role, status, tenant_id')
      .eq('tenant_id', tenantId);

    // Buscar apenas admins + superadmins
    const { data: adminsOnly, error: adminsError } = await supabase
      .from('users')
      .select('id, name, email, role, status, tenant_id')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin']);

    // Buscar todos administrativos (incluindo colaboradores)
    const { data: allAdmins, error: allAdminsError } = await supabase
      .from('users')
      .select('id, name, email, role, status, tenant_id')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin', 'colaborador']);

    return NextResponse.json({
      success: true,
      tenantId,
      counts: {
        allUsers: allUsers?.length || 0,
        adminsOnlySuperadmin: adminsOnly?.length || 0,
        allAdministrative: allAdmins?.length || 0
      },
      allUsers,
      adminsOnlySuperadmin: adminsOnly,
      allAdministrative: allAdmins
    });

  } catch (error) {
    console.error('🔍 [DEBUG check-tenant-users] ERRO:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
