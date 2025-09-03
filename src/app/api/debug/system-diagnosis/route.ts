import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API DE DIAGNÓSTICO COMPLETO DO SISTEMA
 * Verifica todos os componentes críticos
 */
export async function GET(request: NextRequest) {
  console.log('🏥 [SYSTEM-DIAGNOSIS] =================================');
  console.log('🏥 [SYSTEM-DIAGNOSIS] INICIANDO DIAGNÓSTICO COMPLETO');
  console.log('🏥 [SYSTEM-DIAGNOSIS] Timestamp:', new Date().toISOString());
  
  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: {} as any,
    database: {} as any,
    services: {} as any,
    multiTenant: {} as any,
    errors: [] as string[]
  };
  
  try {
    // 1. VERIFICAR VARIÁVEIS DE AMBIENTE
    console.log('🏥 [SYSTEM-DIAGNOSIS] 1. Verificando variáveis de ambiente...');
    diagnosis.environment = {
      NODE_ENV: process.env.NODE_ENV,
      AWS: {
        REGION: process.env.AWS_REGION ? '✅' : '❌',
        ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID ? '✅' : '❌',
        SECRET_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '✅' : '❌',
        SES_SENDER: process.env.SES_SENDER_EMAIL || process.env.EMAIL_FROM || '❌ NÃO DEFINIDO'
      },
      SUPABASE: {
        URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
        ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌',
        SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'
      },
      APP: {
        URL: process.env.NEXT_PUBLIC_APP_URL || 'NÃO DEFINIDO'
      }
    };
    
    // 2. VERIFICAR CONEXÃO COM BANCO
    console.log('🏥 [SYSTEM-DIAGNOSIS] 2. Verificando conexão com Supabase...');
    const supabase = createSupabaseServiceRoleClient();
    
    try {
      const { count: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      const { count: projectCount, error: projectError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      const { count: notifCount, error: notifError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });
      
      const { count: orgCount, error: orgError } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      diagnosis.database = {
        connected: true,
        users: userError ? `❌ Erro: ${userError.message}` : `✅ ${userCount} usuários`,
        projects: projectError ? `❌ Erro: ${projectError.message}` : `✅ ${projectCount} projetos`,
        notifications: notifError ? `❌ Erro: ${notifError.message}` : `✅ ${notifCount} notificações`,
        organizations: orgError ? `❌ Erro: ${orgError.message}` : `✅ ${orgCount} organizações`
      };
    } catch (dbError: any) {
      diagnosis.database = {
        connected: false,
        error: dbError.message
      };
      diagnosis.errors.push(`Database: ${dbError.message}`);
    }
    
    // 3. VERIFICAR SERVIÇOS
    console.log('🏥 [SYSTEM-DIAGNOSIS] 3. Verificando serviços...');
    
    // Testar importação do emailService
    try {
      const emailModule = await import('@/lib/services/emailService');
      diagnosis.services.emailService = emailModule.sendEmail ? '✅ Disponível' : '❌ Função sendEmail não encontrada';
    } catch (emailError: any) {
      diagnosis.services.emailService = `❌ Erro: ${emailError.message}`;
      diagnosis.errors.push(`EmailService: ${emailError.message}`);
    }
    
    // Testar importação do notificationService
    try {
      const notifModule = await import('@/lib/services/notificationService');
      diagnosis.services.notificationService = notifModule.createNotification ? '✅ Disponível' : '❌ Função createNotification não encontrada';
    } catch (notifError: any) {
      diagnosis.services.notificationService = `❌ Erro: ${notifError.message}`;
      diagnosis.errors.push(`NotificationService: ${notifError.message}`);
    }
    
    // Testar importação do userService
    try {
      const userModule = await import('@/lib/services/userService/core');
      diagnosis.services.userService = {
        getAllAdminUsers: userModule.getAllAdminUsers ? '✅' : '❌',
        getAllAdminUsersByTenant: userModule.getAllAdminUsersByTenant ? '✅' : '❌',
        getUserById: userModule.getUserById ? '✅' : '❌'
      };
    } catch (userError: any) {
      diagnosis.services.userService = `❌ Erro: ${userError.message}`;
      diagnosis.errors.push(`UserService: ${userError.message}`);
    }
    
    // 4. VERIFICAR ESTRUTURA MULTI-TENANT
    console.log('🏥 [SYSTEM-DIAGNOSIS] 4. Verificando estrutura multi-tenant...');
    
    if (diagnosis.database.connected) {
      try {
        // Verificar usuários sem tenant_id
        const { count: usersNoTenant, error: utError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .is('tenant_id', null);
        
        // Verificar projetos sem tenant_id
        const { count: projectsNoTenant, error: ptError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .is('tenant_id', null);
        
        // Verificar admins por tenant
        const { data: tenantAdmins, error: taError } = await supabase
          .from('users')
          .select('tenant_id')
          .in('role', ['admin', 'superadmin'])
          .not('tenant_id', 'is', null);
        
        const adminsByTenant: Record<string, number> = {};
        if (tenantAdmins) {
          tenantAdmins.forEach(admin => {
            const tid = admin.tenant_id || 'sem-tenant';
            adminsByTenant[tid] = (adminsByTenant[tid] || 0) + 1;
          });
        }
        
        diagnosis.multiTenant = {
          usersWithoutTenant: utError ? `❌ Erro` : `${usersNoTenant || 0} usuários sem tenant`,
          projectsWithoutTenant: ptError ? `❌ Erro` : `${projectsNoTenant || 0} projetos sem tenant`,
          adminDistribution: Object.keys(adminsByTenant).length > 0 
            ? adminsByTenant 
            : 'Nenhum admin com tenant_id',
          status: (usersNoTenant === 0 && projectsNoTenant === 0) ? '✅ OK' : '⚠️ Atenção necessária'
        };
      } catch (mtError: any) {
        diagnosis.multiTenant = {
          error: mtError.message
        };
        diagnosis.errors.push(`MultiTenant: ${mtError.message}`);
      }
    }
    
    // 5. TESTE RÁPIDO DE FUNÇÕES
    console.log('🏥 [SYSTEM-DIAGNOSIS] 5. Testando funções principais...');
    
    // Testar getAllAdminUsersByTenant
    try {
      const { getAllAdminUsersByTenant } = await import('@/lib/services/userService/core');
      
      // Pegar um tenant_id válido para teste
      const { data: sampleOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();
      
      if (sampleOrg) {
        const admins = await getAllAdminUsersByTenant(sampleOrg.id);
        diagnosis.services.functionTest = {
          getAllAdminUsersByTenant: `✅ Retornou ${admins.length} admins`
        };
      }
    } catch (funcError: any) {
      diagnosis.services.functionTest = {
        error: funcError.message
      };
    }
    
    // RESUMO FINAL
    console.log('🏥 [SYSTEM-DIAGNOSIS] DIAGNÓSTICO COMPLETO:', diagnosis);
    
    const hasErrors = diagnosis.errors.length > 0;
    const status = hasErrors ? 500 : 200;
    
    return NextResponse.json({
      ...diagnosis,
      summary: {
        healthy: !hasErrors,
        totalErrors: diagnosis.errors.length,
        message: hasErrors 
          ? `Sistema com ${diagnosis.errors.length} erro(s) detectado(s)` 
          : 'Sistema operacional'
      }
    }, { status });
    
  } catch (error: any) {
    console.error('❌ [SYSTEM-DIAGNOSIS] ERRO CRÍTICO:', error);
    return NextResponse.json({ 
      error: 'Erro crítico no diagnóstico',
      details: error.message,
      stack: error.stack,
      diagnosis
    }, { status: 500 });
  } finally {
    console.log('🏥 [SYSTEM-DIAGNOSIS] FIM DO DIAGNÓSTICO');
    console.log('🏥 [SYSTEM-DIAGNOSIS] =================================');
  }
}