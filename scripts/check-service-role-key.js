#!/usr/bin/env node

console.log('🔑 VERIFICANDO SUPABASE_SERVICE_ROLE_KEY');
console.log('');

// Verificar se a variável existe
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.log('❌ SUPABASE_SERVICE_ROLE_KEY NÃO ENCONTRADA!');
  console.log('');
  console.log('🚨 ESTE É O PROBLEMA DA CRIAÇÃO DE PROJETO!');
  console.log('');
  console.log('📋 PARA RESOLVER:');
  console.log('');
  console.log('1. Acesse o Dashboard do Supabase:');
  console.log('   https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
  console.log('');
  console.log('2. Vá para Settings > API');
  console.log('');
  console.log('3. Copie a "service_role" key (não a "anon" key)');
  console.log('   - Ela começa com "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."');
  console.log('   - É diferente da anon key que você já tem');
  console.log('');
  console.log('4. Edite o arquivo .env.local e substitua:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  console.log('   ↓');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.log('');
  console.log('5. Reinicie o servidor de desenvolvimento:');
  console.log('   pnpm dev');
  console.log('');
  console.log('🎯 APÓS CONFIGURAR A CHAVE:');
  console.log('   ✅ Criação de projetos funcionará');
  console.log('   ✅ Todas as server actions funcionarão');
  console.log('   ✅ Sistema 100% operacional');
  
} else if (serviceRoleKey === 'sua_chave_aqui') {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY ENCONTRADA MAS É PLACEHOLDER!');
  console.log('');
  console.log('🔍 Valor atual: "sua_chave_aqui"');
  console.log('');
  console.log('🚨 VOCÊ PRECISA SUBSTITUIR PELO VALOR REAL!');
  console.log('');
  console.log('📋 PARA RESOLVER:');
  console.log('');
  console.log('1. Acesse: https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
  console.log('2. Settings > API');
  console.log('3. Copie a "service_role" key');
  console.log('4. Substitua "sua_chave_aqui" no .env.local');
  console.log('5. Reinicie: pnpm dev');
  
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY ENCONTRADA!');
  console.log('');
  console.log('🔍 Primeiros caracteres:', serviceRoleKey.substring(0, 50) + '...');
  console.log('🔍 Comprimento:', serviceRoleKey.length, 'caracteres');
  console.log('');
  
  // Verificar se parece com um JWT válido
  if (serviceRoleKey.startsWith('eyJ')) {
    console.log('✅ Formato JWT válido (começa com "eyJ")');
    
    // Verificar se tem 3 partes separadas por pontos
    const parts = serviceRoleKey.split('.');
    if (parts.length === 3) {
      console.log('✅ Estrutura JWT válida (3 partes)');
      console.log('');
      console.log('🎯 A CHAVE PARECE ESTAR CORRETA!');
      console.log('');
      console.log('📋 SE AINDA HOUVER ERRO NA CRIAÇÃO DE PROJETO:');
      console.log('');
      console.log('1. 🔄 Teste novamente a criação de projeto');
      console.log('2. 📊 Verifique os logs no console do navegador');
      console.log('3. 🛡️  Verifique as políticas RLS no Supabase');
      console.log('4. 🗄️  Verifique se a tabela projects existe');
      
    } else {
      console.log('❌ Estrutura JWT inválida (deveria ter 3 partes)');
      console.log('🔍 Partes encontradas:', parts.length);
      console.log('');
      console.log('⚠️  A CHAVE PODE ESTAR CORROMPIDA!');
      console.log('📋 Copie novamente do Dashboard do Supabase');
    }
  } else {
    console.log('❌ Formato inválido (deveria começar com "eyJ")');
    console.log('');
    console.log('⚠️  ESTA NÃO É UMA CHAVE JWT VÁLIDA!');
    console.log('📋 Verifique se copiou a chave correta do Supabase');
  }
}

console.log('');
console.log('🚀 APÓS CONFIGURAR CORRETAMENTE: Teste a criação de projeto!');
