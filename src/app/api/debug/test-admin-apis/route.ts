import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de diagnóstico para testar todas as APIs principais do admin
 * GET /api/debug/test-admin-apis?userId=ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    devLog.log('[API ADMIN DIAGNOSTIC] Iniciando diagnóstico completo das APIs admin');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    devLog.log('[API ADMIN DIAGNOSTIC] Headers e parâmetros:', {
      userId,
      tenantId,
      hostname: headersList.get('host'),
      userAgent: headersList.get('user-agent')
    });

    const results = [];

    // 1. Testar busca direta de perfil de usuário (simular API de perfil)
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de perfil de usuário...');
      let profileData = null;
      let profileError = null;
      
      if (tenantId) {
        const { data: tenantUserData, error: tenantError } = await supabase
          .from('users')
          .select('id, name, email, role, tenant_id, status')
          .eq('id', userId)
          .eq('tenant_id', tenantId)
          .single();
        
        if (tenantError) {
          // Fallback sem tenant
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('users')
            .select('id, name, email, role, tenant_id, status')
            .eq('id', userId)
            .single();
          
          profileData = fallbackData;
          profileError = fallbackError;
        } else {
          profileData = tenantUserData;
        }
      } else {
        const { data: directData, error: directError } = await supabase
          .from('users')
          .select('id, name, email, role, tenant_id, status')
          .eq('id', userId)
          .single();
        
        profileData = directData;
        profileError = directError;
      }
      
      results.push({
        api: 'user/profile-direct',
        status: profileError ? 500 : 200,
        success: !profileError && !!profileData,
        error: profileError?.message || null,
        data: profileData ? {
          id: profileData.id,
          name: profileData.name,
          email: profileData.email,
          role: profileData.role,
          tenant_id: profileData.tenant_id
        } : null
      });
    } catch (error: any) {
      results.push({
        api: 'user/profile-direct',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 2. Testar busca direta do usuário no banco
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca direta do usuário...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, tenant_id, status')
        .eq('id', userId)
        .single();

      results.push({
        api: 'direct-user-query',
        status: userError ? 500 : 200,
        success: !userError,
        error: userError?.message || null,
        data: userData || null
      });
    } catch (error: any) {
      results.push({
        api: 'direct-user-query',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 3. Testar busca de projetos
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de projetos...');
      let projectQuery = supabase
        .from('projects')
        .select('id, name, status, created_at')
        .limit(5);
      
      if (tenantId) {
        projectQuery = projectQuery.eq('tenant_id', tenantId);
      }
      
      const { data: projectsData, error: projectsError } = await projectQuery;

      results.push({
        api: 'projects-query',
        status: projectsError ? 500 : 200,
        success: !projectsError,
        error: projectsError?.message || null,
        data: projectsData ? { count: projectsData.length, projects: projectsData } : null
      });
    } catch (error: any) {
      results.push({
        api: 'projects-query',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 4. Testar busca de organização/tenant
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de organização...');
      if (tenantId) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, status, trial_end_date')
          .eq('id', tenantId)
          .single();

        results.push({
          api: 'organization-query',
          status: orgError ? 500 : 200,
          success: !orgError,
          error: orgError?.message || null,
          data: orgData || null
        });
      } else {
        results.push({
          api: 'organization-query',
          status: 400,
          success: false,
          error: 'tenant_id não encontrado nos headers',
          data: null
        });
      }
    } catch (error: any) {
      results.push({
        api: 'organization-query',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 5. Testar busca de membros da equipe
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de membros da equipe...');
      let teamQuery = supabase
        .from('users')
        .select('id, name, email, role, status')
        .in('role', ['admin', 'superadmin'])
        .limit(10);
      
      if (tenantId) {
        teamQuery = teamQuery.eq('tenant_id', tenantId);
      }
      
      const { data: teamData, error: teamError } = await teamQuery;

      results.push({
        api: 'team-members-query',
        status: teamError ? 500 : 200,
        success: !teamError,
        error: teamError?.message || null,
        data: teamData ? { count: teamData.length, members: teamData } : null
      });
    } catch (error: any) {
      results.push({
        api: 'team-members-query',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 6. Testar busca de notificações direto no banco
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de notificações...');
      let notificationQuery = supabase
        .from('notifications')
        .select('id, title, type, created_at')
        .eq('user_id', userId)
        .eq('read', false)
        .limit(5);
      
      const { data: notificationData, error: notificationError } = await notificationQuery;

      results.push({
        api: 'notifications-direct',
        status: notificationError ? 500 : 200,
        success: !notificationError,
        error: notificationError?.message || null,
        data: notificationData ? { count: notificationData.length, notifications: notificationData } : null
      });
    } catch (error: any) {
      results.push({
        api: 'notifications-direct',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // 7. Testar busca de dados financeiros direto no banco
    try {
      devLog.log('[API ADMIN DIAGNOSTIC] Testando busca de dados financeiros...');
      let transactionQuery = supabase
        .from('transactions')
        .select('id, amount, type, created_at')
        .limit(5);
      
      if (tenantId) {
        transactionQuery = transactionQuery.eq('tenant_id', tenantId);
      }
      
      const { data: transactionData, error: transactionError } = await transactionQuery;

      results.push({
        api: 'financial-transactions-direct',
        status: transactionError ? 500 : 200,
        success: !transactionError,
        error: transactionError?.message || null,
        data: transactionData ? { count: transactionData.length, transactions: transactionData } : null
      });
    } catch (error: any) {
      results.push({
        api: 'financial-transactions-direct',
        status: 500,
        success: false,
        error: error.message,
        data: null
      });
    }

    // Resumo dos resultados
    const summary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: Math.round((results.filter(r => r.success).length / results.length) * 100)
    };

    devLog.log('[API ADMIN DIAGNOSTIC] Diagnóstico completo:', summary);

    return NextResponse.json({
      summary,
      results,
      diagnosticInfo: {
        userId,
        tenantId,
        timestamp: new Date().toISOString(),
        hostname: headersList.get('host')
      }
    });

  } catch (error: any) {
    devLog.error('[API ADMIN DIAGNOSTIC] Erro crítico no diagnóstico:', error);
    return NextResponse.json(
      { 
        error: 'Erro crítico no diagnóstico das APIs admin',
        details: error.message
      },
      { status: 500 }
    );
  }
}