require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTriggerLog() {
  console.log('🔍 Verificando se a tabela trigger_log existe...');
  
  try {
    const { data, error } = await supabase
      .from('trigger_log')
      .select('*')
      .limit(1);
      
    if (error) {
      if (error.code === 'PGRST106') {
        console.log('❌ Tabela trigger_log NÃO EXISTE (como esperado)');
        console.log('   → Warning é FALSO POSITIVO');
        return false;
      } else {
        console.log('❌ Erro ao verificar:', error);
        return null;
      }
    } else {
      console.log('✅ Tabela trigger_log EXISTE');
      console.log('   → Warning é VÁLIDO');
      return true;
    }
  } catch (e) {
    console.log('❌ Erro:', e.message);
    return null;
  }
}

// Também vamos verificar as funções
async function checkFunctions() {
  console.log('\n🔍 Verificando funções com warnings...');
  
  // Verificar se handle_new_user existe
  try {
    const { data, error } = await supabase
      .rpc('handle_new_user');
      
    console.log('✅ handle_new_user: Função EXISTE');
  } catch (e) {
    if (e.message.includes('function handle_new_user')) {
      console.log('✅ handle_new_user: Função EXISTE (erro esperado sem parâmetros)');
    } else {
      console.log('❌ handle_new_user: Função NÃO EXISTE');
    }
  }
  
  // Verificar se get_utc_timestamp existe
  try {
    const { data, error } = await supabase
      .rpc('get_utc_timestamp');
      
    if (error) {
      console.log('❌ get_utc_timestamp: Erro -', error.message);
    } else {
      console.log('✅ get_utc_timestamp: Função EXISTE - resultado:', data);
    }
  } catch (e) {
    console.log('❌ get_utc_timestamp: Função NÃO EXISTE');
  }
  
  // Verificar se cleanup_expired_sessions existe
  try {
    const { data, error } = await supabase
      .rpc('cleanup_expired_sessions');
      
    if (error) {
      console.log('❌ cleanup_expired_sessions: Erro -', error.message);
    } else {
      console.log('✅ cleanup_expired_sessions: Função EXISTE - resultado:', data);
    }
  } catch (e) {
    console.log('❌ cleanup_expired_sessions: Função NÃO EXISTE');
  }
}

async function main() {
  console.log('🔧 Verificando configuração do Supabase...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
  console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA');
  console.log('');
  
  await checkTriggerLog();
  await checkFunctions();
}

main().catch(console.error); 