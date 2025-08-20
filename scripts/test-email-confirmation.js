// Script de teste para confirmação de email
// Este script simula as chamadas que seriam feitas em produção

const BASE_URL = 'http://localhost:3000';

async function testHealthCheck() {
  try {
    console.log('🏥 Testando health check...');
    
    const response = await fetch(`${BASE_URL}/api/confirm-email`, {
      method: 'GET'
    });
    
    const result = await response.json();
    console.log('✅ Health check resultado:', JSON.stringify(result, null, 2));
    
    return result.configured;
  } catch (error) {
    console.error('❌ Erro no health check:', error.message);
    return false;
  }
}

async function testEmailConfirmation(token_hash, code) {
  try {
    console.log('📧 Testando confirmação de email...');
    
    const response = await fetch(`${BASE_URL}/api/confirm-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token_hash,
        code,
        type: 'email'
      })
    });
    
    const result = await response.json();
    console.log('✅ Confirmação resultado:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Erro na confirmação:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes do sistema de confirmação de email\n');
  
  // Teste 1: Health Check
  const isConfigured = await testHealthCheck();
  console.log('\n' + '='.repeat(50) + '\n');
  
  if (!isConfigured) {
    console.log('⚠️  Supabase não configurado. Verifique as variáveis de ambiente.');
    console.log('   Para configurar, crie um arquivo .env.local com:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui');
    return;
  }
  
  // Teste 2: Confirmação sem token (deve falhar)
  console.log('🧪 Teste 2: Confirmação sem token...');
  await testEmailConfirmation();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Teste 3: Confirmação com token inválido (deve falhar)
  console.log('🧪 Teste 3: Confirmação com token inválido...');
  await testEmailConfirmation('token_invalido_teste');
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('✅ Testes básicos concluídos!');
  console.log('💡 Para testar com tokens reais, use os links de confirmação do Supabase.');
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testHealthCheck, testEmailConfirmation }; 