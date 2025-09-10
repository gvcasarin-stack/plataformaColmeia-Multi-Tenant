import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * API PARA TESTAR TODAS AS ROTAS ADMIN REAIS
 * Esta API vai fazer requests reais para todas as APIs que as abas do admin usam
 * GET /api/debug/test-all-admin-apis
 */
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    hostname: '',
    middleware: {
      headers: {},
      working: true
    },
    adminApis: {
      tested: 0,
      working: 0,
      failing: 0,
      details: [] as any[]
    },
    summary: {
      allWorking: false,
      criticalErrors: [] as string[]
    }
  };

  try {
    const headersList = headers();
    results.hostname = headersList.get('host') || '';
    
    // 1. Verificar headers do middleware
    results.middleware.headers = {
      'x-tenant-id': headersList.get('x-tenant-id'),
      'x-tenant-slug': headersList.get('x-tenant-slug'),
      'x-tenant-name': headersList.get('x-tenant-name'),
      'x-tenant-trial': headersList.get('x-tenant-trial'),
      'x-middleware-error': headersList.get('x-middleware-error')
    };

    results.middleware.working = !!(
      results.middleware.headers['x-tenant-id'] && 
      results.middleware.headers['x-tenant-slug']
    );

    if (!results.middleware.working) {
      results.summary.criticalErrors.push('Headers do middleware não configurados');
      return NextResponse.json(results, { status: 500 });
    }

    // 2. Lista de TODAS as APIs que as abas admin usam
    const adminApis = [
      // Painel
      { 
        name: 'Dashboard - Status AWS', 
        url: '/api/aws/status',
        method: 'GET',
        tab: 'painel'
      },
      { 
        name: 'Dashboard - Projetos', 
        url: '/api/billing/projects',
        method: 'GET',
        tab: 'painel'
      },
      
      // Projetos
      { 
        name: 'Client Requests - Lista', 
        url: '/api/admin/client-requests',
        method: 'GET',
        tab: 'projetos'
      },
      { 
        name: 'Client Requests - Aprovar', 
        url: '/api/admin/client-requests/approve',
        method: 'POST',
        tab: 'projetos',
        skipTest: true // POST precisa de dados
      },
      { 
        name: 'Client Requests - Rejeitar', 
        url: '/api/admin/client-requests/reject',
        method: 'POST',
        tab: 'projetos',
        skipTest: true // POST precisa de dados
      },
      
      // Equipe
      { 
        name: 'Billing - Clients', 
        url: '/api/billing/clients',
        method: 'GET',
        tab: 'equipe'
      },
      
      // Financeiro
      { 
        name: 'Financial - Dashboard', 
        url: '/api/financial/dashboard',
        method: 'GET',
        tab: 'financeiro'
      },
      { 
        name: 'Financial - Fixed Costs', 
        url: '/api/financial/fixed-costs',
        method: 'GET',
        tab: 'financeiro'
      },
      { 
        name: 'Financial - Transactions', 
        url: '/api/financial/transactions',
        method: 'GET',
        tab: 'financeiro'
      },
      
      // Notificações
      { 
        name: 'Notifications - Count', 
        url: '/api/notifications/count',
        method: 'GET',
        tab: 'notificacoes'
      },
      { 
        name: 'Notifications - Project Created', 
        url: '/api/notifications/project-created',
        method: 'POST',
        tab: 'notificacoes',
        skipTest: true // POST precisa de dados
      },
      
      // Perfil/Sistema
      { 
        name: 'User Profile', 
        url: '/api/user/profile',
        method: 'GET',
        tab: 'sistema'
      },
      { 
        name: 'Tenant Organization', 
        url: '/api/tenant/organization',
        method: 'GET',
        tab: 'sistema'
      }
    ];

    // 3. Testar cada API
    const baseUrl = `https://${results.hostname}`;
    
    for (const api of adminApis) {
      results.adminApis.tested++;
      
      const testResult = {
        name: api.name,
        url: api.url,
        method: api.method,
        tab: api.tab,
        status: 'unknown' as 'success' | 'error' | 'skipped',
        statusCode: 0,
        error: null as string | null,
        responseTime: 0
      };

      if (api.skipTest) {
        testResult.status = 'skipped';
        testResult.error = 'Método POST requer dados específicos';
        results.adminApis.details.push(testResult);
        continue;
      }

      try {
        const startTime = Date.now();
        
        const response = await fetch(`${baseUrl}${api.url}`, {
          method: api.method,
          headers: {
            'Content-Type': 'application/json',
            // Propagar headers do middleware
            'x-tenant-id': results.middleware.headers['x-tenant-id']!,
            'x-tenant-slug': results.middleware.headers['x-tenant-slug']!,
            'x-tenant-name': results.middleware.headers['x-tenant-name']!,
          }
        });

        testResult.responseTime = Date.now() - startTime;
        testResult.statusCode = response.status;
        
        if (response.ok) {
          testResult.status = 'success';
          results.adminApis.working++;
        } else {
          testResult.status = 'error';
          testResult.error = `HTTP ${response.status}`;
          results.adminApis.failing++;
          
          // Tentar pegar detalhes do erro
          try {
            const errorData = await response.text();
            if (errorData && errorData.length < 200) {
              testResult.error += `: ${errorData}`;
            }
          } catch (e) {
            // Ignorar erro ao ler resposta
          }
        }

      } catch (fetchError: any) {
        testResult.status = 'error';
        testResult.error = `Fetch failed: ${fetchError.message}`;
        results.adminApis.failing++;
      }

      results.adminApis.details.push(testResult);
    }

    // 4. Gerar resumo
    results.summary.allWorking = results.adminApis.failing === 0;
    
    if (results.adminApis.failing > 0) {
      results.summary.criticalErrors.push(
        `${results.adminApis.failing} APIs falhando de ${results.adminApis.tested} testadas`
      );
      
      // Agrupar erros por aba
      const errorsByTab: Record<string, number> = {};
      results.adminApis.details
        .filter(api => api.status === 'error')
        .forEach(api => {
          errorsByTab[api.tab] = (errorsByTab[api.tab] || 0) + 1;
        });
      
      Object.entries(errorsByTab).forEach(([tab, count]) => {
        results.summary.criticalErrors.push(`Aba "${tab}": ${count} APIs com erro`);
      });
    }

    return NextResponse.json(results, { 
      status: results.summary.allWorking ? 200 : 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      criticalError: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}