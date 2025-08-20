const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserProfile() {
  console.log('🔍 INVESTIGANDO PROBLEMA DA BUSCA DE PERFIL...\n');
  
  try {
    // 1. Verificar usuários recentes em auth.users
    console.log('1. USUÁRIOS EM AUTH.USERS (últimos 5):');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      perPage: 5
    });
    
    if (authError) {
      console.error('❌ Erro ao buscar auth.users:', authError);
    } else {
      if (authData.users.length === 0) {
        console.log('  ❌ NENHUM USUÁRIO encontrado em auth.users!');
      } else {
        authData.users.forEach(user => {
          console.log(`  - ${user.id} | ${user.email} | confirmado: ${!!user.email_confirmed_at}`);
        });
      }
    }
    
    console.log('\n2. USUÁRIOS EM PUBLIC.USERS (últimos 5):');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (publicError) {
      console.error('❌ Erro ao buscar public.users:', publicError);
    } else {
      if (publicUsers.length === 0) {
        console.log('  ❌ NENHUM USUÁRIO encontrado na tabela public.users!');
      } else {
        publicUsers.forEach(user => {
          console.log(`  - ${user.id} | ${user.email} | ${user.full_name} | ${user.role}`);
        });
      }
    }
    
    // 3. Testar consulta que trava
    if (authData?.users?.length > 0) {
      const testUserId = authData.users[0].id;
      console.log(`\n3. TESTANDO CONSULTA QUE TRAVA (userId: ${testUserId}):`);
      
      const startTime = Date.now();
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('id', testUserId)
          .single();
          
        const duration = Date.now() - startTime;
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log('  ⚠️ Usuário não encontrado na tabela users (código PGRST116)');
            console.log('  🔍 DIAGNÓSTICO: O trigger handle_new_user pode não estar funcionando!');
          } else {
            console.error('  ❌ Erro na consulta:', error);
          }
        } else {
          console.log(`  ✅ Perfil encontrado em ${duration}ms:`, data);
        }
      } catch (queryError) {
        const duration = Date.now() - startTime;
        console.error(`  ❌ Exceção após ${duration}ms:`, queryError);
      }
    }
    
    // 4. Verificar trigger handle_new_user
    console.log('\n4. VERIFICANDO TRIGGER HANDLE_NEW_USER:');
    const { data: triggerInfo, error: triggerError } = await supabase
      .rpc('check_trigger_exists', { trigger_name: 'handle_new_user' })
      .single();
      
    if (triggerError) {
      console.log('  ⚠️ Não foi possível verificar trigger (função pode não existir)');
    } else {
      console.log(`  Trigger existe: ${triggerInfo ? 'SIM' : 'NÃO'}`);
    }
    
    // 5. Verificar diferenças entre auth e public
    if (authData?.users?.length > 0 && publicUsers?.length > 0) {
      console.log('\n5. VERIFICANDO SINCRONIZAÇÃO:');
      const authIds = new Set(authData.users.map(u => u.id));
      const publicIds = new Set(publicUsers.map(u => u.id));
      
      const onlyInAuth = authData.users.filter(u => !publicIds.has(u.id));
      
      if (onlyInAuth.length > 0) {
        console.log('  ❌ Usuários APENAS em auth.users (trigger falhou):');
        onlyInAuth.forEach(u => console.log(`    - ${u.id} | ${u.email}`));
        console.log('\n  🔧 SOLUÇÃO: O trigger handle_new_user não está populando public.users!');
      } else {
        console.log('  ✅ Todos os usuários estão sincronizados entre as tabelas');
      }
    }
    
    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log('=====================================');
    
    if (authData?.users?.length === 0) {
      console.log('❌ Problema: Nenhum usuário em auth.users');
    } else if (publicUsers?.length === 0) {
      console.log('❌ Problema: Trigger handle_new_user não está funcionando');
      console.log('   Usuários existem em auth.users mas não em public.users');
    } else {
      console.log('✅ Ambas as tabelas têm usuários');
      console.log('❓ Problema pode ser de conexão/timeout na consulta');
    }
    
  } catch (error) {
    console.error('❌ Erro geral no diagnóstico:', error);
  }
}

// Executar diagnóstico
debugUserProfile().catch(console.error); 