import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient, createSupabaseBrowserClient } from '@/lib/supabase/client';
import { headers } from 'next/headers';

/**
 * API MASTER DE DIAGNÓSTICO - Analisa contexto completo de autorização
 * 
 * Compara Service Role vs Browser Client para identificar onde quebra a autorização
 * 
 * @route GET /api/debug/auth-context-analyzer
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[MASTER DEBUG] Iniciando análise completa de contexto...');

    const hdrs = headers();
    const authHeader = hdrs.get('authorization');
    const tenantHeader = hdrs.get('x-tenant-id');
    const userAgent = hdrs.get('user-agent');
    const host = hdrs.get('host');

    // ===============================
    // FASE 1: ANÁLISE DE HEADERS E CONTEXTO
    // ===============================
    const contextAnalysis = {
      headers: {
        hasAuthToken: !!authHeader,
        authTokenPreview: authHeader ? authHeader.substring(0, 20) + '...' : null,
        hasTenantId: !!tenantHeader,
        tenantId: tenantHeader,
        host: host,
        userAgent: userAgent?.substring(0, 50) + '...'
      },
      timestamp: new Date().toISOString()
    };

    // ===============================
    // FASE 2: TESTE COM SERVICE ROLE (DEVE SEMPRE FUNCIONAR)
    // ===============================
    const serviceRoleTests = {};
    
    try {
      const supabaseService = createSupabaseServiceRoleClient();
      
      // Teste 1: Buscar usuário atual por tenant
      if (tenantHeader) {
        const { data: currentUser, error: userError } = await supabaseService
          .from('users')
          .select('id, email, name, role, tenant_id, permissions')
          .eq('tenant_id', tenantHeader)
          .limit(1);

        serviceRoleTests.currentUser = {
          success: !userError,
          data: currentUser?.[0] || null,
          error: userError?.message
        };
      }

      // Teste 2: APIs problemáticas via Service Role
      const { data: projects, error: projectsError } = await supabaseService
        .from('projects')
        .select('id, name, status')
        .eq('tenant_id', tenantHeader)
        .limit(5);

      serviceRoleTests.projectsAccess = {
        success: !projectsError,
        count: projects?.length || 0,
        error: projectsError?.message
      };

      // Teste 3: Organizações
      const { data: org, error: orgError } = await supabaseService
        .from('organizations')
        .select('*')
        .eq('id', tenantHeader)
        .single();

      serviceRoleTests.organizationAccess = {
        success: !orgError,
        data: org || null,
        error: orgError?.message
      };

    } catch (err) {
      serviceRoleTests.error = `Service Role falhou: ${err.message}`;
    }

    // ===============================
    // FASE 3: TESTE COM BROWSER CLIENT (ONDE PODE FALHAR)
    // ===============================
    const browserClientTests = {};

    try {
      const supabaseBrowser = createSupabaseBrowserClient();

      // Teste 1: Verificar sessão atual
      const { data: session, error: sessionError } = await supabaseBrowser.auth.getSession();
      
      browserClientTests.session = {
        hasSession: !!session?.session,
        user: session?.session?.user ? {
          id: session.session.user.id,
          email: session.session.user.email,
          role: session.session.user.user_metadata?.role
        } : null,
        error: sessionError?.message
      };

      // Teste 2: Tentar acessar dados com Browser Client
      if (session?.session) {
        const { data: userData, error: userDataError } = await supabaseBrowser
          .from('users')
          .select('id, email, name, role, tenant_id')
          .eq('id', session.session.user.id)
          .single();

        browserClientTests.userDataAccess = {
          success: !userDataError,
          data: userData,
          error: userDataError?.message
        };

        // Teste 3: Tentar acessar projetos (API que estava falhando)
        const { data: userProjects, error: userProjectsError } = await supabaseBrowser
          .from('projects')
          .select('id, name, status')
          .limit(3);

        browserClientTests.projectsAccess = {
          success: !userProjectsError,
          count: userProjects?.length || 0,
          error: userProjectsError?.message
        };
      } else {
        browserClientTests.noSession = 'Sem sessão ativa - não pode testar Browser Client';
      }

    } catch (err) {
      browserClientTests.error = `Browser Client falhou: ${err.message}`;
    }

    // ===============================
    // FASE 4: SIMULAÇÃO DAS APIs PROBLEMÁTICAS
    // ===============================
    const apiSimulation = {};

    // Lista das APIs que estavam retornando 403
    const problematicAPIs = [
      '/api/admin/config',
      '/api/projects/unified',
      '/api/admin/clients'
    ];

    for (const apiPath of problematicAPIs) {
      try {
        const response = await fetch(`${request.nextUrl.origin}${apiPath}`, {
          headers: {
            'authorization': authHeader || '',
            'x-tenant-id': tenantHeader || '',
            'content-type': 'application/json'
          }
        });

        apiSimulation[apiPath] = {
          status: response.status,
          success: response.ok,
          statusText: response.statusText
        };

        if (response.ok) {
          try {
            const data = await response.json();
            apiSimulation[apiPath].hasData = Array.isArray(data.data) ? data.data.length > 0 : !!data.data;
          } catch {
            apiSimulation[apiPath].hasData = 'Could not parse JSON';
          }
        }

      } catch (err) {
        apiSimulation[apiPath] = {
          status: 'ERROR',
          error: err.message
        };
      }
    }

    // ===============================
    // FASE 5: ANÁLISE COMPARATIVA E DIAGNÓSTICO
    // ===============================
    const diagnosis = {
      serviceRoleWorks: Object.values(serviceRoleTests).some(test => test.success),
      browserClientWorks: Object.values(browserClientTests).some(test => test.success),
      problematicAPIsWork: Object.values(apiSimulation).some(api => api.success),
      
      // Identificar problemas específicos
      issues: [],
      recommendations: []
    };

    // Detectar problemas
    if (!contextAnalysis.headers.hasAuthToken) {
      diagnosis.issues.push('CRÍTICO: Sem token de autorização');
      diagnosis.recommendations.push('Verificar se usuário está logado corretamente');
    }

    if (!contextAnalysis.headers.hasTenantId) {
      diagnosis.issues.push('CRÍTICO: Sem header x-tenant-id');
      diagnosis.recommendations.push('Verificar middleware de tenant');
    }

    if (diagnosis.serviceRoleWorks && !diagnosis.browserClientWorks) {
      diagnosis.issues.push('PROBLEMA: Service Role funciona, Browser Client falha');
      diagnosis.recommendations.push('Verificar RLS policies e sessão do usuário');
    }

    if (diagnosis.serviceRoleWorks && !diagnosis.problematicAPIsWork) {
      diagnosis.issues.push('PROBLEMA: Dados existem, mas APIs retornam 403');
      diagnosis.recommendations.push('Verificar middleware de autorização nas APIs');
    }

    // Score de saúde
    const totalTests = 
      Object.keys(serviceRoleTests).length + 
      Object.keys(browserClientTests).length + 
      Object.keys(apiSimulation).length;
    
    const successfulTests = 
      Object.values(serviceRoleTests).filter(t => t.success).length +
      Object.values(browserClientTests).filter(t => t.success).length +
      Object.values(apiSimulation).filter(t => t.success).length;

    diagnosis.healthScore = Math.round((successfulTests / totalTests) * 100);

    devLog.log('[MASTER DEBUG] Diagnóstico concluído:', {
      healthScore: diagnosis.healthScore,
      issues: diagnosis.issues.length
    });

    return NextResponse.json({
      success: true,
      context: contextAnalysis,
      serviceRoleTests,
      browserClientTests,
      apiSimulation,
      diagnosis,
      summary: {
        healthScore: `${diagnosis.healthScore}%`,
        totalIssues: diagnosis.issues.length,
        criticalProblems: diagnosis.issues.filter(i => i.includes('CRÍTICO')).length,
        tenantId: tenantHeader,
        timestamp: contextAnalysis.timestamp
      }
    });

  } catch (err) {
    devLog.error('[MASTER DEBUG] Erro na análise:', err);
    return NextResponse.json({ 
      error: 'Erro na análise completa', 
      details: err instanceof Error ? err.message : String(err)
    });
  }
}