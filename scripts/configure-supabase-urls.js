const { createClient } = require('@supabase/supabase-js');

// Configurações
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = 'https://app.colmeiasolar.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('⚠️  Variáveis de ambiente não encontradas, mas continuando com instruções...');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
}

// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function configureSupabaseUrls() {
  console.log('🔧 Configurando URLs do Supabase...');
  
  try {
    // Configurar URLs de autenticação
    const authConfig = {
      SITE_URL: SITE_URL,
      URI_ALLOW_LIST: [
        `${SITE_URL}/confirmar-email`,
        `${SITE_URL}/cliente/nova-senha`,
        `${SITE_URL}/cliente/login`,
        SITE_URL
      ].join(','),
      // Templates de email
      MAILER_TEMPLATES_CONFIRM: JSON.stringify({
        subject: 'Confirme seu email - Colmeia Solar',
        content_path: `${SITE_URL}/confirmar-email`,
        content: `
          <h2>Confirme seu email</h2>
          <p>Clique no link abaixo para confirmar seu email:</p>
          <a href="{{ .ConfirmationURL }}">Confirmar Email</a>
        `
      }),
      MAILER_TEMPLATES_RECOVERY: JSON.stringify({
        subject: 'Redefinir senha - Colmeia Solar',
        content_path: `${SITE_URL}/cliente/nova-senha`,
        content: `
          <h2>Redefinir senha</h2>
          <p>Clique no link abaixo para redefinir sua senha:</p>
          <a href="{{ .ConfirmationURL }}">Redefinir Senha</a>
        `
      })
    };

    console.log('📧 Configurações que serão aplicadas:');
    console.log(`- Site URL: ${authConfig.SITE_URL}`);
    console.log(`- URLs permitidas: ${authConfig.URI_ALLOW_LIST}`);
    
    // Nota: A configuração via API pode não estar disponível para todos os projetos
    // Este script serve principalmente para documentar as configurações necessárias
    
    console.log('\n🚨 PROBLEMA IDENTIFICADO: Links de confirmação estão expirando!');
    console.log('\n📋 CONFIGURAÇÃO OBRIGATÓRIA NO DASHBOARD DO SUPABASE:');
    console.log('\n1. Acesse o Dashboard do Supabase:');
    if (SUPABASE_URL) {
      console.log(`   https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}`);
    } else {
      console.log('   https://supabase.com/dashboard/project/[SEU_PROJECT_ID]');
    }
    
    console.log('\n2. Vá para Authentication > URL Configuration');
    
    console.log('\n3. ⚠️  CRÍTICO - Configure estas URLs EXATAMENTE:');
    console.log(`   Site URL: ${SITE_URL}`);
    console.log('   Redirect URLs (adicione ambas):');
    console.log(`   ✅ ${SITE_URL}/confirmar-email`);
    console.log(`   ✅ ${SITE_URL}/cliente/nova-senha`);
    
    console.log('\n4. Vá para Authentication > Email Templates');
    
    console.log('\n5. ⚠️  CRÍTICO - Edite os templates:');
    console.log('   📧 Confirm signup:');
    console.log('      Redirect URL: {{ .SiteURL }}/confirmar-email');
    console.log('   📧 Reset password:');
    console.log('      Redirect URL: {{ .SiteURL }}/cliente/nova-senha');
    
    console.log('\n6. 💾 SALVE todas as configurações');
    console.log('\n7. 🧪 Teste novamente o cadastro de usuário');
    
    console.log('\n❌ SEM ESSA CONFIGURAÇÃO:');
    console.log('   - Links redirecionam para "/" em vez de "/confirmar-email"');
    console.log('   - Códigos expiram antes de chegar na página correta');
    console.log('   - Erro: "Email link is invalid or has expired"');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao configurar URLs:', error);
    return false;
  }
}

// Executar configuração
configureSupabaseUrls()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Script executado com sucesso!');
      console.log('⚠️  Lembre-se de configurar manualmente no Dashboard do Supabase');
    } else {
      console.log('\n❌ Falha na execução do script');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  });
