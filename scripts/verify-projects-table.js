#!/usr/bin/env node

console.log('🔍 VERIFICAÇÃO: Estrutura da Tabela Projects');
console.log('');

console.log('📋 CAMPOS OBRIGATÓRIOS PARA CRIAÇÃO DE PROJETOS:');
console.log('');

const requiredFields = [
  // Campos principais
  { name: 'id', type: 'uuid', critical: true, description: 'Primary key único' },
  { name: 'name', type: 'text', critical: true, description: 'Nome do projeto' },
  { name: 'number', type: 'text', critical: true, description: '🔥 CRÍTICO: Número único (FV-2025-001)' },
  { name: 'created_by', type: 'uuid', critical: true, description: 'Referência ao usuário' },
  { name: 'created_at', type: 'timestamp', critical: true, description: 'Data de criação' },
  { name: 'updated_at', type: 'timestamp', critical: true, description: 'Data de atualização' },
  
  // Dados do projeto
  { name: 'empresa_integradora', type: 'text', critical: false, description: 'Empresa responsável' },
  { name: 'nome_cliente_final', type: 'text', critical: false, description: 'Nome do cliente final' },
  { name: 'distribuidora', type: 'text', critical: false, description: 'Distribuidora de energia' },
  { name: 'potencia', type: 'numeric', critical: false, description: 'Potência do projeto' },
  { name: 'data_entrega', type: 'date', critical: false, description: 'Data prevista de entrega' },
  { name: 'status', type: 'text', critical: false, description: 'Status atual do projeto' },
  { name: 'prioridade', type: 'text', critical: false, description: 'Prioridade do projeto' },
  { name: 'valor_projeto', type: 'numeric', critical: false, description: 'Valor total do projeto' },
  { name: 'pagamento', type: 'text', critical: false, description: 'Forma de pagamento' },
  { name: 'price', type: 'numeric', critical: false, description: 'Preço adicional' },
  
  // Responsável admin
  { name: 'admin_responsible_id', type: 'uuid', critical: false, description: 'ID do admin responsável' },
  { name: 'admin_responsible_name', type: 'text', critical: false, description: 'Nome do admin responsável' },
  { name: 'admin_responsible_email', type: 'text', critical: false, description: 'Email do admin responsável' },
  { name: 'admin_responsible_phone', type: 'text', critical: false, description: 'Telefone do admin responsável' },
  
  // Dados complexos (JSONB)
  { name: 'timeline_events', type: 'jsonb', critical: false, description: 'Eventos da timeline' },
  { name: 'documents', type: 'jsonb', critical: false, description: 'Documentos do projeto' },
  { name: 'files', type: 'jsonb', critical: false, description: 'Arquivos do projeto' },
  { name: 'comments', type: 'jsonb', critical: false, description: 'Comentários do projeto' },
  { name: 'history', type: 'jsonb', critical: false, description: 'Histórico de alterações' },
  { name: 'last_update_by', type: 'jsonb', critical: false, description: 'Último usuário que atualizou' }
];

console.log('🔥 CAMPOS CRÍTICOS (obrigatórios):');
requiredFields.filter(field => field.critical).forEach((field, index) => {
  console.log(`   ${index + 1}. ${field.name} (${field.type}) - ${field.description}`);
});

console.log('');
console.log('📝 CAMPOS OPCIONAIS (mas necessários):');
requiredFields.filter(field => !field.critical).forEach((field, index) => {
  console.log(`   ${index + 1}. ${field.name} (${field.type}) - ${field.description}`);
});

console.log('');
console.log('📊 ESTATÍSTICAS:');
console.log(`   • Total de campos: ${requiredFields.length}`);
console.log(`   • Campos críticos: ${requiredFields.filter(f => f.critical).length}`);
console.log(`   • Campos opcionais: ${requiredFields.filter(f => !f.critical).length}`);

console.log('');
console.log('🎯 VERIFICAÇÃO NO SUPABASE:');
console.log('');
console.log('Execute esta query no SQL Editor do Supabase:');
console.log('');
console.log('```sql');
console.log('-- Verificar se todos os campos existem');
console.log('SELECT column_name, data_type, is_nullable, column_default');
console.log('FROM information_schema.columns');
console.log('WHERE table_schema = \'public\' AND table_name = \'projects\'');
console.log('ORDER BY column_name;');
console.log('');
console.log('-- Contar total de colunas');
console.log('SELECT COUNT(*) as total_columns');
console.log('FROM information_schema.columns');
console.log('WHERE table_schema = \'public\' AND table_name = \'projects\';');
console.log('```');

console.log('');
console.log('✅ RESULTADO ESPERADO:');
console.log(`   • Deve mostrar ${requiredFields.length} colunas`);
console.log('   • Campo "number" deve estar presente');
console.log('   • Todos os campos críticos devem existir');

console.log('');
console.log('🚨 SE ALGUM CAMPO ESTIVER FALTANDO:');
console.log('   1. Execute o script: scripts/create-complete-projects-table.sql');
console.log('   2. Verifique novamente com a query acima');
console.log('   3. Teste a criação de projeto na aplicação');

console.log('');
console.log('🎉 APÓS CORREÇÃO:');
console.log('   ✅ Criação de projetos deve funcionar');
console.log('   ✅ Numeração sequencial deve funcionar');
console.log('   ✅ Todos os dados devem ser salvos corretamente');

console.log('');
console.log('💡 DICA: O campo "number" é o mais crítico!');
console.log('   Se ele estiver faltando, você verá o erro:');
console.log('   "Could not find the \'number\' column of \'projects\' in the schema cache"');
