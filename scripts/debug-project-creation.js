#!/usr/bin/env node

console.log('🔍 DEBUGGANDO CRIAÇÃO DE PROJETO');
console.log('');

console.log('❌ ERRO ATUAL: "Erro ao gerar número do projeto. Tente novamente."');
console.log('');

console.log('🎯 POSSÍVEIS CAUSAS:');
console.log('');

console.log('1. 🛡️  POLÍTICAS RLS DO SUPABASE:');
console.log('   - As políticas podem estar bloqueando a consulta SELECT na tabela projects');
console.log('   - O usuário cliente pode não ter permissão para ler outros projetos');
console.log('   - Verificar se existe política para SELECT na tabela projects');
console.log('');

console.log('2. 🔑 CHAVE SERVICE_ROLE:');
console.log('   - SUPABASE_SERVICE_ROLE_KEY pode estar ausente ou inválida');
console.log('   - Service Role deveria bypassar RLS, mas pode não estar funcionando');
console.log('');

console.log('3. 🗄️  ESTRUTURA DA TABELA:');
console.log('   - Campo "number" pode não existir na tabela projects');
console.log('   - Índices podem estar faltando');
console.log('');

console.log('4. 🌐 TIMEOUT/REDE:');
console.log('   - Query pode estar demorando muito');
console.log('   - Problemas de conectividade com Supabase');
console.log('');

console.log('📋 SOLUÇÕES APLICADAS:');
console.log('');

console.log('✅ 1. RETRY MECHANISM:');
console.log('   - Adicionado retry com 3 tentativas');
console.log('   - Delay de 1s entre tentativas');
console.log('');

console.log('✅ 2. FALLBACK ROBUSTO:');
console.log('   - Se falhar, usa timestamp para gerar número único');
console.log('   - Formato: FV-2025-123456 (últimos 6 dígitos do timestamp)');
console.log('');

console.log('✅ 3. LOGS DETALHADOS:');
console.log('   - Logs específicos para cada tentativa');
console.log('   - Identificação da causa exata do erro');
console.log('');

console.log('🧪 PRÓXIMOS PASSOS PARA TESTAR:');
console.log('');

console.log('1. 🔄 TESTE A CRIAÇÃO DE PROJETO NOVAMENTE');
console.log('2. 📊 VERIFIQUE OS LOGS NO CONSOLE DO NAVEGADOR');
console.log('3. 🔍 PROCURE POR MENSAGENS ESPECÍFICAS:');
console.log('   - "Iniciando geração de número do projeto..."');
console.log('   - "Tentativa X falhou:"');
console.log('   - "Usando número de fallback:"');
console.log('');

console.log('📋 SE AINDA FALHAR, VERIFICAR:');
console.log('');

console.log('🛡️  RLS POLICIES NO SUPABASE:');
console.log('1. Acesse: https://supabase.com/dashboard/project/[PROJECT_ID]');
console.log('2. Vá para Authentication > Policies');
console.log('3. Verifique se existe política para SELECT na tabela projects');
console.log('4. Se não existir, criar política:');
console.log('   - Table: projects');
console.log('   - Policy name: "Allow service role to read projects"');
console.log('   - Operation: SELECT');
console.log('   - Target roles: service_role');
console.log('');

console.log('🔑 VERIFICAR SERVICE_ROLE_KEY:');
console.log('1. Vá para Settings > API');
console.log('2. Copie a service_role key (não a anon key)');
console.log('3. Verifique se está correta no .env.local');
console.log('');

console.log('🎉 COM AS CORREÇÕES APLICADAS:');
console.log('   ✅ Sistema deve funcionar mesmo se a query falhar');
console.log('   ✅ Número de projeto será gerado usando fallback');
console.log('   ✅ Criação de projeto deve ser bem-sucedida');
console.log('');

console.log('🚀 TESTE AGORA A CRIAÇÃO DE PROJETO!');
