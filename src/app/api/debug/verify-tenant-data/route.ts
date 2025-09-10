import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para verificar se os dados do tenant estão corretos após o script SQL
 * GET /api/debug/verify-tenant-data
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[Verify Tenant Data] 🔍 Verificando dados do tenant...');
    
    // Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const tenantSlug = headersList.get('x-tenant-slug');
    
    if (!tenantId) {
      return NextResponse.json({
        error: 'Tenant ID não encontrado nos headers',
        headers: Object.fromEntries(headersList.entries())
      }, { status: 400 });
    }
    
    const supabase = createSupabaseServiceRoleClient();
    
    // ========================================
    // 1. VERIFICAR ORGANIZAÇÃO
    // ========================================
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    // ========================================
    // 2. VERIFICAR USUÁRIOS DO TENANT
    // ========================================
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, tenant_id, status')
      .eq('tenant_id', tenantId);
    
    // ========================================
    // 3. VERIFICAR PROJETOS DO TENANT
    // ========================================
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, number, tenant_id, created_by')
      .eq('tenant_id', tenantId);
    
    // ========================================
    // 4. VERIFICAR PROJETOS ÓRFÃOS (SEM TENANT_ID)
    // ========================================
    const { data: orphanProjects, error: orphanError } = await supabase
      .from('projects')
      .select('id, number, tenant_id, created_by')
      .is('tenant_id', null);
    
    // ========================================
    // 5. VERIFICAR USUÁRIOS ÓRFÃOS (SEM TENANT_ID)
    // ========================================
    const { data: orphanUsers, error: orphanUsersError } = await supabase
      .from('users')
      .select('id, name, email, tenant_id')
      .is('tenant_id', null);
    
    const report = {
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        slug: tenantSlug,
        found: !orgError && !!orgData,
        data: orgData,
        error: orgError?.message || null
      },
      users: {
        count: usersData?.length || 0,
        data: usersData || [],
        error: usersError?.message || null,
        roles: usersData ? [...new Set(usersData.map(u => u.role))] : []
      },
      projects: {
        count: projectsData?.length || 0,
        data: projectsData || [],
        error: projectsError?.message || null
      },
      orphans: {
        projects: {
          count: orphanProjects?.length || 0,
          data: orphanProjects || [],
          error: orphanError?.message || null
        },
        users: {
          count: orphanUsers?.length || 0,
          data: orphanUsers || [],
          error: orphanUsersError?.message || null
        }
      },
      summary: {
        tenantConfigured: !orgError && !!orgData,
        hasUsers: (usersData?.length || 0) > 0,
        hasProjects: (projectsData?.length || 0) > 0,
        hasOrphanProjects: (orphanProjects?.length || 0) > 0,
        hasOrphanUsers: (orphanUsers?.length || 0) > 0,
        needsScriptRerun: (orphanProjects?.length || 0) > 0 || (orphanUsers?.length || 0) > 0
      }
    };
    
    devLog.log('[Verify Tenant Data] 📊 Relatório completo:', report);
    
    return NextResponse.json({
      success: true,
      report,
      recommendations: report.summary.needsScriptRerun ? [
        'EXECUTE O SCRIPT NOVAMENTE: Ainda há dados órfãos',
        `${report.orphans.projects.count} projetos sem tenant_id`,
        `${report.orphans.users.count} usuários sem tenant_id`,
        'Execute: scripts/fix-all-tenant-issues-passo2-em-diante.sql'
      ] : [
        'DADOS CORRETOS: Não precisa executar o script novamente',
        'Todos os dados estão associados ao tenant correto',
        'Sistema multi-tenant funcionando perfeitamente'
      ]
    });
    
  } catch (error: any) {
    devLog.error('[Verify Tenant Data] ❌ Erro na verificação:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
