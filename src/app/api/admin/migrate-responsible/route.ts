import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Buscar todos os tenants que têm projetos sem responsável
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, tenant_id')
      .is('admin_responsible_id', null);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
      return NextResponse.json({ success: true, migrated: 0, message: 'Nenhum projeto para migrar.' });
    }

    // Agrupar project IDs por tenant
    const byTenant = projects.reduce<Record<string, string[]>>((acc, p) => {
      if (!acc[p.tenant_id]) acc[p.tenant_id] = [];
      acc[p.tenant_id].push(p.id);
      return acc;
    }, {});

    const tenantIds = Object.keys(byTenant);

    // Para cada tenant, buscar o admin mais antigo (owner > admin > superadmin)
    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, name, email, tenant_id, role, created_at')
      .in('tenant_id', tenantIds)
      .in('role', ['owner', 'admin', 'superadmin'])
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (adminsError) throw adminsError;

    // Mapear tenant_id → admin mais antigo
    const adminByTenant: Record<string, { id: string; name: string; email: string }> = {};
    for (const admin of admins || []) {
      if (!adminByTenant[admin.tenant_id]) {
        adminByTenant[admin.tenant_id] = { id: admin.id, name: admin.name, email: admin.email };
      }
    }

    let migrated = 0;
    const skipped: string[] = [];

    for (const tenantId of tenantIds) {
      const admin = adminByTenant[tenantId];
      if (!admin) {
        skipped.push(tenantId);
        continue;
      }

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          admin_responsible_id: admin.id,
          admin_responsible_name: admin.name,
          admin_responsible_email: admin.email,
        })
        .in('id', byTenant[tenantId]);

      if (updateError) throw updateError;
      migrated += byTenant[tenantId].length;
    }

    return NextResponse.json({
      success: true,
      migrated,
      skippedTenants: skipped.length,
      message: `${migrated} projeto(s) atualizado(s) com responsável padrão.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
