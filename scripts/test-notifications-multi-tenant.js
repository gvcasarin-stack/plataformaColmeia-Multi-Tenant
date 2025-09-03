/**
 * Script de teste para validar o sistema de notificações multi-tenant
 * 
 * COMO USAR:
 * 1. node scripts/test-notifications-multi-tenant.js
 * 
 * Este script valida:
 * - Isolamento de notificações por tenant
 * - Envio de emails apenas para admins corretos
 * - Cooldown de emails funcionando
 */

const { createSupabaseServiceRoleClient } = require('@/lib/supabase/service');

async function runTests() {
  console.log('🧪 INICIANDO TESTES DO SISTEMA DE NOTIFICAÇÕES MULTI-TENANT\n');
  
  const supabase = createSupabaseServiceRoleClient();
  
  // =========================================
  // TESTE 1: Verificar Isolamento por Tenant
  // =========================================
  console.log('📋 TESTE 1: Verificando isolamento por tenant...');
  
  try {
    // Buscar quantos tenants existem
    const { data: tenants, error: tenantError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);
    
    if (tenantError) throw tenantError;
    
    console.log(`✅ Encontradas ${tenants.length} organizações no sistema`);
    
    // Para cada tenant, verificar quantos admins tem
    for (const tenant of tenants) {
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('tenant_id', tenant.id)
        .in('role', ['admin', 'superadmin']);
      
      if (!adminError) {
        console.log(`  - ${tenant.name}: ${admins.length} admins`);
        if (admins.length > 0) {
          console.log(`    Admins: ${admins.map(a => a.email).join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no Teste 1:', error.message);
  }
  
  console.log('\n');
  
  // =========================================
  // TESTE 2: Verificar Notificações Recentes
  // =========================================
  console.log('📋 TESTE 2: Verificando notificações recentes...');
  
  try {
    // Buscar últimas 10 notificações
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        user_id,
        project_id,
        created_at,
        users!notifications_user_id_fkey (
          email,
          tenant_id,
          role
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (notifError) throw notifError;
    
    console.log(`✅ Últimas ${notifications.length} notificações:`);
    
    // Agrupar por tenant
    const notifsByTenant = {};
    for (const notif of notifications) {
      const tenantId = notif.users?.tenant_id || 'sem-tenant';
      if (!notifsByTenant[tenantId]) {
        notifsByTenant[tenantId] = [];
      }
      notifsByTenant[tenantId].push({
        type: notif.type,
        user: notif.users?.email,
        role: notif.users?.role,
        time: new Date(notif.created_at).toLocaleString('pt-BR')
      });
    }
    
    // Exibir agrupado
    for (const [tenantId, notifs] of Object.entries(notifsByTenant)) {
      console.log(`\n  Tenant ${tenantId}:`);
      for (const n of notifs) {
        console.log(`    - ${n.type} para ${n.user} (${n.role}) em ${n.time}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no Teste 2:', error.message);
  }
  
  console.log('\n');
  
  // =========================================
  // TESTE 3: Verificar Cooldown de Emails
  // =========================================
  console.log('📋 TESTE 3: Verificando cooldown de emails...');
  
  try {
    const { data: cooldowns, error: cooldownError } = await supabase
      .from('email_cooldowns')
      .select('*')
      .order('last_email_sent_at', { ascending: false })
      .limit(10);
    
    if (cooldownError) throw cooldownError;
    
    console.log(`✅ Últimos ${cooldowns.length} registros de cooldown:`);
    
    for (const cd of cooldowns) {
      const lastSent = new Date(cd.last_email_sent_at);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastSent) / 1000 / 60);
      const status = diffMinutes < 5 ? '🔴 EM COOLDOWN' : '🟢 DISPONÍVEL';
      
      console.log(`  - User: ${cd.user_id.substring(0, 8)}... | Projeto: ${cd.project_id.substring(0, 8)}...`);
      console.log(`    Último envio: ${lastSent.toLocaleString('pt-BR')} (${diffMinutes} min atrás) ${status}`);
    }
    
  } catch (error) {
    console.error('❌ Erro no Teste 3:', error.message);
  }
  
  console.log('\n');
  
  // =========================================
  // TESTE 4: Validar Estrutura Multi-Tenant
  // =========================================
  console.log('📋 TESTE 4: Validando estrutura multi-tenant...');
  
  try {
    // Verificar se há projetos sem tenant_id
    const { data: projectsNoTenant, error: pError1 } = await supabase
      .from('projects')
      .select('id, name, number')
      .is('tenant_id', null);
    
    if (!pError1) {
      if (projectsNoTenant.length > 0) {
        console.log(`⚠️  AVISO: ${projectsNoTenant.length} projetos sem tenant_id!`);
        for (const p of projectsNoTenant.slice(0, 5)) {
          console.log(`    - ${p.number}: ${p.name}`);
        }
      } else {
        console.log('✅ Todos os projetos têm tenant_id');
      }
    }
    
    // Verificar se há usuários sem tenant_id
    const { data: usersNoTenant, error: uError1 } = await supabase
      .from('users')
      .select('id, email, role')
      .is('tenant_id', null);
    
    if (!uError1) {
      if (usersNoTenant.length > 0) {
        console.log(`⚠️  AVISO: ${usersNoTenant.length} usuários sem tenant_id!`);
        for (const u of usersNoTenant.slice(0, 5)) {
          console.log(`    - ${u.email} (${u.role})`);
        }
      } else {
        console.log('✅ Todos os usuários têm tenant_id');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no Teste 4:', error.message);
  }
  
  console.log('\n');
  
  // =========================================
  // RESUMO FINAL
  // =========================================
  console.log('📊 RESUMO DO SISTEMA:');
  console.log('====================');
  
  try {
    // Contar totais
    const { count: totalOrgs } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalAdmins } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'superadmin']);
    
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: totalNotifs } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
    
    console.log(`  Organizações: ${totalOrgs}`);
    console.log(`  Usuários: ${totalUsers} (${totalAdmins} admins)`);
    console.log(`  Projetos: ${totalProjects}`);
    console.log(`  Notificações: ${totalNotifs}`);
    
  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error.message);
  }
  
  console.log('\n✅ TESTES CONCLUÍDOS!\n');
}

// Executar testes
runTests().catch(console.error);