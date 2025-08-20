const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateUsers() {
  console.log('🔍 INVESTIGANDO OS DOIS USUÁRIOS DOS LOGS...\n');
  
  const userIds = [
    'ad51ccbe-be06-40b8-a841-e4810085a839', // Usuário que falha
    '85605d4d-d176-4e0a-ab00-ab43972cdd93'  // César da Silva que funciona
  ];
  
  for (const userId of userIds) {
    console.log(`\n=== USUÁRIO: ${userId} ===`);
    
    // 1. Verificar em auth.users
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError) {
        console.log(`❌ Auth: ${authError.message}`);
      } else {
        console.log(`✅ Auth: ${authUser.user?.email} | confirmado: ${!!authUser.user?.email_confirmed_at} | criado: ${authUser.user?.created_at}`);
        console.log(`   Metadados: ${JSON.stringify(authUser.user?.user_metadata || {})}`);
      }
    } catch (e) {
      console.log(`❌ Auth: ${e.message}`);
    }
    
    // 2. Verificar em public.users (service role)
    try {
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('id', userId)
        .single();
        
      if (publicError) {
        if (publicError.code === 'PGRST116') {
          console.log('❌ Public: Usuário NÃO encontrado (PGRST116)');
          console.log('   🔍 DIAGNÓSTICO: Trigger handle_new_user não executou para este usuário!');
        } else {
          console.log(`❌ Public: ${publicError.message} (código: ${publicError.code})`);
        }
      } else {
        console.log(`✅ Public: ${publicUser.email} | ${publicUser.full_name} | ${publicUser.role} | criado: ${publicUser.created_at}`);
      }
    } catch (e) {
      console.log(`❌ Public: ${e.message}`);
    }
    
    // 3. Testar acesso com client comum (simular o que acontece no frontend)
    const publicSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    try {
      console.log('   🧪 Testando acesso público (sem service role):');
      const { data: testData, error: testError } = await publicSupabase
        .from('users')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .single();
        
      if (testError) {
        console.log(`   ❌ Acesso público: ${testError.message} (código: ${testError.code})`);
        if (testError.code === 'PGRST301') {
          console.log('   🔍 DIAGNÓSTICO: Políticas RLS estão bloqueando o acesso!');
        }
      } else {
        console.log(`   ✅ Acesso público: ${testData.email} acessível`);
      }
    } catch (e) {
      console.log(`   ❌ Acesso público: ${e.message}`);
    }
  }
  
  // 4. Verificar se há duplicatas na auth.users com mesmo email
  console.log('\n=== VERIFICANDO DUPLICATAS POR EMAIL ===');
  try {
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 100 });
    const emails = {};
    
    allUsers.users.forEach(user => {
      const email = user.email;
      if (!emails[email]) {
        emails[email] = [];
      }
      emails[email].push({
        id: user.id,
        confirmed: !!user.email_confirmed_at,
        created: user.created_at
      });
    });
    
    Object.entries(emails).forEach(([email, users]) => {
      if (users.length > 1) {
        console.log(`🔄 Email duplicado: ${email}`);
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.id} | confirmado: ${user.confirmed} | criado: ${user.created}`);
        });
      }
    });
    
  } catch (e) {
    console.log(`❌ Erro ao verificar duplicatas: ${e.message}`);
  }
}

// Executar investigação
investigateUsers().catch(console.error); 