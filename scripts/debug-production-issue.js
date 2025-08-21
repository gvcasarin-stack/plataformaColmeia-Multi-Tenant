#!/usr/bin/env node

console.log('🔍 DEBUGGANDO PROBLEMA EM PRODUÇÃO (VERCEL)');
console.log('');

console.log('✅ CHAVE API CONFIGURADA NA VERCEL');
console.log('❌ ERRO: "Erro ao gerar número do projeto. Tente novamente."');
console.log('');

console.log('🎯 POSSÍVEIS CAUSAS EM PRODUÇÃO:');
console.log('');

console.log('1. 🛡️  POLÍTICAS RLS DO SUPABASE:');
console.log('   - RLS pode estar bloqueando queries em produção');
console.log('   - Service role pode não ter permissões corretas');
console.log('   - Políticas podem estar mais restritivas em produção');
console.log('');

console.log('2. 🗄️  ESTRUTURA DA TABELA PROJECTS:');
console.log('   - Campo "number" pode não existir');
console.log('   - Tabela pode não ter sido criada corretamente');
console.log('   - Índices podem estar faltando');
console.log('');

console.log('3. 🌐 TIMEOUT DE FUNÇÃO SERVERLESS:');
console.log('   - Vercel tem limite de 10s para funções');
console.log('   - Query pode estar demorando muito');
console.log('   - Cold start pode causar timeout');
console.log('');

console.log('4. 🔗 CONECTIVIDADE VERCEL ↔ SUPABASE:');
console.log('   - Problemas de rede entre Vercel e Supabase');
console.log('   - Latência alta causando timeouts');
console.log('   - Rate limiting do Supabase');
console.log('');

console.log('5. 📊 SERIALIZAÇÃO DE DADOS:');
console.log('   - Dados podem ter formato incompatível');
console.log('   - Campos JSONB podem ter problemas');
console.log('   - Encoding de caracteres especiais');
console.log('');

console.log('📋 SOLUÇÕES JÁ APLICADAS:');
console.log('');

console.log('✅ 1. RETRY MECHANISM (3 tentativas)');
console.log('✅ 2. FALLBACK ROBUSTO (timestamp)');
console.log('✅ 3. LOGS DETALHADOS');
console.log('✅ 4. TRATAMENTO DE ERROS MELHORADO');
console.log('');

console.log('🔍 COMO DEBUGGAR EM PRODUÇÃO:');
console.log('');

console.log('1. 📊 VERIFICAR LOGS DA VERCEL:');
console.log('   - Acesse: https://vercel.com/dashboard');
console.log('   - Vá para Functions > View Function Logs');
console.log('   - Procure por logs da createProjectClientAction');
console.log('   - Verifique se há erros específicos');
console.log('');

console.log('2. 📊 VERIFICAR LOGS DO SUPABASE:');
console.log('   - Acesse: https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
console.log('   - Vá para Logs > API Logs');
console.log('   - Procure por requests falhando');
console.log('   - Verifique se há erros de RLS');
console.log('');

console.log('3. 🛡️  VERIFICAR POLÍTICAS RLS:');
console.log('   - Vá para Authentication > Policies');
console.log('   - Verifique se existe política para SELECT na tabela projects');
console.log('   - Se não existir, criar política para service_role');
console.log('');

console.log('4. 🗄️  VERIFICAR ESTRUTURA DA TABELA:');
console.log('   - Vá para Table Editor > projects');
console.log('   - Verifique se o campo "number" existe');
console.log('   - Verifique se a tabela tem dados');
console.log('');

console.log('🚀 PRÓXIMOS PASSOS:');
console.log('');

console.log('1. 🔄 TESTE NOVAMENTE A CRIAÇÃO DE PROJETO');
console.log('2. 📊 VERIFIQUE OS LOGS NO CONSOLE DO NAVEGADOR');
console.log('3. 🔍 PROCURE POR MENSAGENS ESPECÍFICAS:');
console.log('   - "Iniciando geração de número do projeto..."');
console.log('   - "Tentativa X falhou:"');
console.log('   - "Usando número de fallback:"');
console.log('');

console.log('4. 📋 SE AINDA FALHAR:');
console.log('   - Verifique logs da Vercel');
console.log('   - Verifique logs do Supabase');
console.log('   - Verifique políticas RLS');
console.log('   - Verifique estrutura da tabela');
console.log('');

console.log('💡 DICA IMPORTANTE:');
console.log('   Com o fallback implementado, o sistema DEVE funcionar');
console.log('   mesmo se a query falhar. Se ainda está falhando,');
console.log('   pode ser um problema mais profundo na estrutura.');
console.log('');

console.log('🎯 TESTE AGORA E VERIFIQUE OS LOGS!');
