#!/usr/bin/env node

console.log('🗄️  VERIFICANDO ESTRUTURA DA TABELA PROJECTS NO SUPABASE');
console.log('');

console.log('📋 CAMPOS ESPERADOS NA TABELA PROJECTS:');
console.log('');

console.log('🔑 CAMPOS OBRIGATÓRIOS:');
console.log('   ✓ id (uuid, primary key)');
console.log('   ✓ number (text) - CAMPO CRÍTICO PARA GERAÇÃO DE NÚMEROS');
console.log('   ✓ name (text)');
console.log('   ✓ created_by (uuid, foreign key para auth.users)');
console.log('   ✓ created_at (timestamp)');
console.log('   ✓ updated_at (timestamp)');
console.log('');

console.log('📊 CAMPOS DE DADOS:');
console.log('   ✓ empresa_integradora (text)');
console.log('   ✓ nome_cliente_final (text)');
console.log('   ✓ distribuidora (text)');
console.log('   ✓ potencia (numeric)');
console.log('   ✓ data_entrega (date)');
console.log('   ✓ status (text)');
console.log('   ✓ prioridade (text)');
console.log('   ✓ valor_projeto (numeric)');
console.log('   ✓ pagamento (text)');
console.log('   ✓ price (numeric)');
console.log('');

console.log('👤 CAMPOS DE RESPONSÁVEL ADMIN:');
console.log('   ✓ admin_responsible_id (uuid)');
console.log('   ✓ admin_responsible_name (text)');
console.log('   ✓ admin_responsible_email (text)');
console.log('   ✓ admin_responsible_phone (text)');
console.log('');

console.log('📋 CAMPOS JSONB:');
console.log('   ✓ timeline_events (jsonb)');
console.log('   ✓ documents (jsonb)');
console.log('   ✓ files (jsonb)');
console.log('   ✓ comments (jsonb)');
console.log('   ✓ history (jsonb)');
console.log('   ✓ last_update_by (jsonb)');
console.log('');

console.log('🔍 COMO VERIFICAR NO SUPABASE:');
console.log('');

console.log('1. 🌐 Acesse o Dashboard:');
console.log('   https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');
console.log('');

console.log('2. 🗄️  Vá para Table Editor:');
console.log('   - Clique em "Table Editor" no menu lateral');
console.log('   - Procure pela tabela "projects"');
console.log('');

console.log('3. 🔍 Verifique se a tabela existe:');
console.log('   - Se NÃO existir: ESTE É O PROBLEMA!');
console.log('   - Se existir: continue para o próximo passo');
console.log('');

console.log('4. 📊 Verifique os campos:');
console.log('   - Clique na tabela "projects"');
console.log('   - Verifique se TODOS os campos listados acima existem');
console.log('   - ESPECIALMENTE o campo "number" (text)');
console.log('');

console.log('5. 🛡️  Verifique RLS (Row Level Security):');
console.log('   - Vá para Authentication > Policies');
console.log('   - Procure por políticas da tabela "projects"');
console.log('   - Deve haver política para service_role fazer SELECT');
console.log('');

console.log('🚨 SE A TABELA NÃO EXISTIR:');
console.log('');

console.log('📋 CRIAR TABELA PROJECTS:');
console.log('```sql');
console.log('CREATE TABLE projects (');
console.log('  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,');
console.log('  number text UNIQUE NOT NULL,');
console.log('  name text NOT NULL,');
console.log('  created_by uuid REFERENCES auth.users(id),');
console.log('  empresa_integradora text,');
console.log('  nome_cliente_final text,');
console.log('  distribuidora text,');
console.log('  potencia numeric DEFAULT 0,');
console.log('  data_entrega date,');
console.log('  status text DEFAULT \'Não Iniciado\',');
console.log('  prioridade text DEFAULT \'Baixa\',');
console.log('  valor_projeto numeric DEFAULT 0,');
console.log('  pagamento text,');
console.log('  price numeric,');
console.log('  admin_responsible_id uuid,');
console.log('  admin_responsible_name text,');
console.log('  admin_responsible_email text,');
console.log('  admin_responsible_phone text,');
console.log('  timeline_events jsonb DEFAULT \'[]\',');
console.log('  documents jsonb DEFAULT \'[]\',');
console.log('  files jsonb DEFAULT \'[]\',');
console.log('  comments jsonb DEFAULT \'[]\',');
console.log('  history jsonb DEFAULT \'[]\',');
console.log('  last_update_by jsonb,');
console.log('  created_at timestamp with time zone DEFAULT now(),');
console.log('  updated_at timestamp with time zone DEFAULT now()');
console.log(');');
console.log('```');
console.log('');

console.log('🛡️  CRIAR POLÍTICAS RLS:');
console.log('```sql');
console.log('-- Habilitar RLS');
console.log('ALTER TABLE projects ENABLE ROW LEVEL SECURITY;');
console.log('');
console.log('-- Política para service_role (bypass RLS)');
console.log('CREATE POLICY "Service role can do everything" ON projects');
console.log('  FOR ALL USING (auth.role() = \'service_role\');');
console.log('');
console.log('-- Política para usuários autenticados verem seus projetos');
console.log('CREATE POLICY "Users can view own projects" ON projects');
console.log('  FOR SELECT USING (auth.uid() = created_by);');
console.log('```');
console.log('');

console.log('🎯 APÓS VERIFICAR/CRIAR A TABELA:');
console.log('   ✅ Teste novamente a criação de projeto');
console.log('   ✅ O sistema deve funcionar corretamente');
console.log('   ✅ Números de projeto serão gerados sequencialmente');
console.log('');

console.log('🚀 VERIFIQUE AGORA NO SUPABASE!');
