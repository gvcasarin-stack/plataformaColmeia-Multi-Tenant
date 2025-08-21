#!/usr/bin/env node

console.log('🔧 OBTENDO VARIÁVEIS DE AMBIENTE DA VERCEL');
console.log('');
console.log('📋 OPÇÕES PARA OBTER A SUPABASE_SERVICE_ROLE_KEY:');
console.log('');

console.log('🎯 OPÇÃO 1: Via Dashboard da Vercel');
console.log('1. Acesse: https://vercel.com/dashboard');
console.log('2. Vá para seu projeto (plataformaColmeia)');
console.log('3. Settings > Environment Variables');
console.log('4. Procure por SUPABASE_SERVICE_ROLE_KEY');
console.log('5. Copie o valor');
console.log('');

console.log('🎯 OPÇÃO 2: Via CLI da Vercel');
console.log('1. Instale a CLI: npm i -g vercel');
console.log('2. Faça login: vercel login');
console.log('3. Baixe as env vars: vercel env pull .env.local');
console.log('');

console.log('🎯 OPÇÃO 3: Via Dashboard do Supabase');
console.log('1. Acesse: https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
console.log('2. Settings > API');
console.log('3. Copie a "service_role" key');
console.log('4. Adicione ao .env.local');
console.log('');

console.log('📝 DEPOIS DE OBTER A CHAVE:');
console.log('1. Substitua "sua_chave_aqui" no .env.local');
console.log('2. Reinicie o servidor: pnpm dev');
console.log('3. Teste a criação de projeto');
console.log('');

console.log('⚠️  LEMBRE-SE:');
console.log('- A service_role key é SECRETA');
console.log('- Não commite ela no Git');
console.log('- Use apenas para desenvolvimento local');
console.log('');

console.log('🚀 APÓS CONFIGURAR: Criação de projetos funcionará!');
