const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupDuplicateUsers() {
  console.log('🧹 LIMPEZA DE USUÁRIOS DUPLICADOS...\n');
  
  try {
    // 1. Listar todos os usuários de auth
    console.log('1. Buscando todos os usuários...');
    const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    console.log(`   Total de usuários em auth: ${allUsers.users.length}`);
    
    // 2. Agrupar por email
    const emailGroups = {};
    allUsers.users.forEach(user => {
      const email = user.email;
      if (!emailGroups[email]) {
        emailGroups[email] = [];
      }
      emailGroups[email].push(user);
    });
    
    // 3. Identificar duplicatas
    const duplicates = Object.entries(emailGroups).filter(([email, users]) => users.length > 1);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhum email duplicado encontrado!');
      return;
    }
    
    console.log(`\n⚠️ ${duplicates.length} email(s) com duplicatas encontradas:\n`);
    
    for (const [email, users] of duplicates) {
      console.log(`📧 Email: ${email} (${users.length} usuários)`);
      
      // Ordenar usuários: confirmados primeiro, depois por data de criação
      users.sort((a, b) => {
        // Prioridade 1: Email confirmado
        if (a.email_confirmed_at && !b.email_confirmed_at) return -1;
        if (!a.email_confirmed_at && b.email_confirmed_at) return 1;
        
        // Prioridade 2: Data de criação (mais recente primeiro)
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      const keepUser = users[0]; // Manter o primeiro da lista (melhor candidato)
      const deleteUsers = users.slice(1); // Deletar o resto
      
      console.log(`   ✅ MANTER: ${keepUser.id} | confirmado: ${!!keepUser.email_confirmed_at} | criado: ${keepUser.created_at}`);
      
      for (const deleteUser of deleteUsers) {
        console.log(`   ❌ DELETAR: ${deleteUser.id} | confirmado: ${!!deleteUser.email_confirmed_at} | criado: ${deleteUser.created_at}`);
        
        try {
          // Deletar usuário duplicado
          const { error } = await supabase.auth.admin.deleteUser(deleteUser.id);
          if (error) {
            console.log(`      ⚠️ Erro ao deletar: ${error.message}`);
          } else {
            console.log(`      ✅ Deletado com sucesso`);
          }
        } catch (error) {
          console.log(`      ❌ Exceção ao deletar: ${error.message}`);
        }
      }
      
      console.log(''); // Linha em branco entre emails
    }
    
    // 4. Verificar usuários órfãos (em auth mas não em public.users)
    console.log('\n🔍 VERIFICANDO USUÁRIOS ÓRFÃOS...');
    
    for (const user of allUsers.users) {
      if (!user.email_confirmed_at) {
        console.log(`⏭️ Pulando usuário não confirmado: ${user.id} (${user.email})`);
        continue;
      }
      
      // Verificar se existe em public.users
      const { data: publicUser, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code === 'PGRST116') {
        console.log(`🔧 Usuário órfão encontrado: ${user.id} (${user.email})`);
        console.log(`   Trigger handle_new_user não executou para este usuário`);
        
        // Criar entrada em public.users
        try {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || '',
              role: 'cliente',
              created_at: user.created_at,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.log(`   ❌ Erro ao criar entrada: ${insertError.message}`);
          } else {
            console.log(`   ✅ Entrada criada em public.users`);
          }
        } catch (e) {
          console.log(`   ❌ Exceção ao criar entrada: ${e.message}`);
        }
      }
    }
    
    console.log('\n🎉 Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
  }
}

// Executar limpeza
cleanupDuplicateUsers().catch(console.error);
