import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API de DIAGNÓSTICO para comparar tenants e encontrar problemas
 * 
 * @route GET /api/debug/tenant-comparison
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[DEBUG] Iniciando diagnóstico de tenants...');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role não configurado' });
    }

    const supabase = createSupabaseServiceRoleClient();
    
    // 1. Buscar todos os tenants únicos
    const { data: allUsers } = await supabase
      .from('users')
      .select('tenant_id, role, status, name, email, created_at');

    if (!allUsers) {
      return NextResponse.json({ error: 'Erro ao buscar usuários' });
    }

    // 2. Agrupar por tenant
    const tenantStats = new Map();
    const tenantSamples = new Map();

    allUsers.forEach(user => {
      const tenantId = user.tenant_id || 'NULL';
      
      if (!tenantStats.has(tenantId)) {
        tenantStats.set(tenantId, {
          total: 0,
          clients: 0,
          admins: 0,
          active: 0,
          inactive: 0,
          nullNames: 0,
          nullEmails: 0,
          roles: new Set(),
          statuses: new Set()
        });
        tenantSamples.set(tenantId, []);
      }

      const stats = tenantStats.get(tenantId);
      const samples = tenantSamples.get(tenantId);

      stats.total++;
      stats.roles.add(user.role || 'NULL');
      stats.statuses.add(user.status || 'NULL');

      if (user.role === 'client') stats.clients++;
      if (user.role === 'admin' || user.role === 'superadmin') stats.admins++;
      if (user.status === 'active') stats.active++;
      if (user.status !== 'active') stats.inactive++;
      if (!user.name) stats.nullNames++;
      if (!user.email) stats.nullEmails++;

      // Guardar amostras (máximo 2 por tenant)
      if (samples.length < 2) {
        samples.push({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status
        });
      }
    });

    // 3. Converter Sets para Arrays
    const results = Array.from(tenantStats.entries()).map(([tenantId, stats]) => ({
      tenantId,
      ...stats,
      roles: Array.from(stats.roles),
      statuses: Array.from(stats.statuses),
      samples: tenantSamples.get(tenantId),
      // Flags de problemas potenciais
      hasProblems: {
        noClients: stats.clients === 0,
        hasNullNames: stats.nullNames > 0,
        hasNullEmails: stats.nullEmails > 0,
        hasInactiveUsers: stats.inactive > 0,
        strangeRoles: Array.from(stats.roles).some(r => !['client', 'admin', 'superadmin'].includes(r)),
        strangeStatuses: Array.from(stats.statuses).some(s => !['active'].includes(s))
      }
    }));

    // 4. Ordenar por quantidade de problemas (mais problemáticos primeiro)
    results.sort((a, b) => {
      const aProblems = Object.values(a.hasProblems).filter(Boolean).length;
      const bProblems = Object.values(b.hasProblems).filter(Boolean).length;
      return bProblems - aProblems;
    });

    // 5. Resumo executivo
    const summary = {
      totalTenants: results.length,
      tenantsWithClients: results.filter(r => r.clients > 0).length,
      tenantsWithProblems: results.filter(r => Object.values(r.hasProblems).some(Boolean)).length,
      totalUsers: allUsers.length,
      totalClients: results.reduce((sum, r) => sum + r.clients, 0)
    };

    devLog.log('[DEBUG] Diagnóstico concluído:', summary);

    return NextResponse.json({
      success: true,
      summary,
      tenants: results,
      recommendations: [
        'Tenants com hasProblems: true podem estar causando erros',
        'Verificar tenants com noClients: true se deveriam ter clientes',
        'Tenants com strangeRoles/strangeStatuses podem ter dados inconsistentes'
      ]
    });

  } catch (err) {
    devLog.error('[DEBUG] Erro no diagnóstico:', err);
    return NextResponse.json({ 
      error: 'Erro no diagnóstico', 
      details: err instanceof Error ? err.message : String(err)
    });
  }
}