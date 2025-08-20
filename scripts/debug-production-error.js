#!/usr/bin/env node

console.log('🔍 DEBUGGANDO ERRO 500 EM PRODUÇÃO NA VERCEL');
console.log('');
console.log('📋 POSSÍVEIS CAUSAS DO ERRO:');
console.log('');

console.log('🎯 CAUSA 1: Políticas RLS do Supabase');
console.log('- As políticas podem estar bloqueando a inserção');
console.log('- Verificar se o usuário tem permissão para criar projetos');
console.log('');

console.log('🎯 CAUSA 2: Estrutura da Tabela Projects');
console.log('- Campos obrigatórios podem estar faltando');
console.log('- Constraints podem estar falhando');
console.log('');

console.log('🎯 CAUSA 3: Timeout de Função Serverless');
console.log('- Vercel tem limite de 10s para funções');
console.log('- Operação pode estar demorando muito');
console.log('');

console.log('🎯 CAUSA 4: Erro de Serialização');
console.log('- Dados podem ter formato incompatível');
console.log('- Campos JSONB podem ter problemas');
console.log('');

console.log('📋 COMO DEBUGGAR:');
console.log('');

console.log('1. VERIFICAR LOGS DA VERCEL:');
console.log('   - Acesse: https://vercel.com/dashboard');
console.log('   - Vá para Functions > View Function Logs');
console.log('   - Procure por erros detalhados');
console.log('');

console.log('2. VERIFICAR LOGS DO SUPABASE:');
console.log('   - Acesse: https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
console.log('   - Vá para Logs > API Logs');
console.log('   - Procure por requests falhando');
console.log('');

console.log('3. TESTAR RLS MANUALMENTE:');
console.log('   - Vá para SQL Editor no Supabase');
console.log('   - Execute: SELECT auth.uid();');
console.log('   - Teste inserção manual na tabela projects');
console.log('');

console.log('4. VERIFICAR ESTRUTURA DA TABELA:');
console.log('   - SQL Editor > SELECT * FROM projects LIMIT 1;');
console.log('   - Verificar se todos os campos existem');
console.log('');

console.log('🚨 SOLUÇÃO RÁPIDA - TESTE:');
console.log('1. Desabilitar RLS temporariamente:');
console.log('   ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;');
console.log('2. Testar criação de projeto');
console.log('3. Se funcionar, o problema é RLS');
console.log('4. Reabilitar: ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;');
console.log('');

console.log('🔧 PRÓXIMOS PASSOS:');
console.log('1. Verificar logs da Vercel');
console.log('2. Verificar logs do Supabase');
console.log('3. Testar RLS');
console.log('4. Reportar erro específico encontrado');
console.log('');

console.log('💡 DICA: O erro "Server Components render" indica problema no servidor, não no cliente!'); 