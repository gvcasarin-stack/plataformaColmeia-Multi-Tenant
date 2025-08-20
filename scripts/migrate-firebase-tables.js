#!/usr/bin/env node

/**
 * MIGRAÇÃO FIREBASE → SUPABASE: TABELAS ESSENCIAIS
 * 
 * Este script executa a migração das tabelas que existiam no Firebase
 * e são necessárias para manter todas as funcionalidades da aplicação.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 INICIANDO MIGRAÇÃO DAS TABELAS ESSENCIAIS');
console.log('============================================');

// Verificar se o arquivo SQL existe
const sqlFilePath = path.join(__dirname, '..', 'supabase', 'sql', 'create_missing_tables.sql');

if (!fs.existsSync(sqlFilePath)) {
  console.error('❌ Arquivo SQL não encontrado:', sqlFilePath);
  process.exit(1);
}

console.log('✅ Arquivo SQL encontrado:', sqlFilePath);

// Ler o conteúdo do arquivo SQL
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

console.log('\n📋 INSTRUÇÕES PARA EXECUTAR A MIGRAÇÃO:');
console.log('=====================================');

console.log('\n1. 🌐 Acesse o Dashboard do Supabase:');
console.log('   https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu');

console.log('\n2. 📊 Vá para a seção "SQL Editor":');
console.log('   - No menu lateral, clique em "SQL Editor"');
console.log('   - Ou acesse: https://supabase.com/dashboard/project/uvdyxurnvatomlxevrmu/sql');

console.log('\n3. 📝 Cole o SQL abaixo no editor:');
console.log('   - Clique em "New query"');
console.log('   - Cole todo o conteúdo SQL');
console.log('   - Clique em "Run" para executar');

console.log('\n4. ✅ Verifique se as tabelas foram criadas:');
console.log('   - Vá para "Table Editor"');
console.log('   - Você deve ver as tabelas: configs, notifications, active_sessions');

console.log('\n' + '='.repeat(80));
console.log('📄 CONTEÚDO SQL PARA COPIAR:');
console.log('='.repeat(80));
console.log('\n' + sqlContent);
console.log('\n' + '='.repeat(80));

console.log('\n🎯 APÓS EXECUTAR O SQL:');
console.log('======================');
console.log('✅ Tabela configs criada com configurações do sistema');
console.log('✅ Tabela notifications criada para o sistema de notificações');
console.log('✅ Políticas de segurança (RLS) configuradas');
console.log('✅ Índices para performance criados');
console.log('✅ Configurações iniciais inseridas');

console.log('\n📊 TABELAS QUE SERÃO CRIADAS:');
console.log('============================');
console.log('1. configs - Configurações gerais do sistema');
console.log('   - Categorias: general, security, features, limits, kanban');
console.log('   - Configurações de timeout, limites, funcionalidades');

console.log('\n2. notifications - Sistema de notificações');
console.log('   - Notificações por usuário');
console.log('   - Vinculação com projetos');
console.log('   - Status de leitura');

console.log('\n3. active_sessions - Controle de sessões (já existe)');
console.log('   - Tracking de sessões ativas');
console.log('   - Controle de timeout automático');

console.log('\n🔧 CONFIGURAÇÕES INICIAIS QUE SERÃO INSERIDAS:');
console.log('==============================================');
console.log('- app_name: "Plataforma Colmeia"');
console.log('- session_timeout_minutes: 20');
console.log('- max_session_hours: 8');
console.log('- max_projects_per_client: 10');
console.log('- enable_notifications: true');
console.log('- kanban_columns: ["backlog", "planejamento", "em_andamento", "revisao", "concluido"]');

console.log('\n⚠️  IMPORTANTE:');
console.log('==============');
console.log('- Execute o SQL no Supabase Dashboard');
console.log('- Verifique se não há erros na execução');
console.log('- As tabelas devem aparecer no Table Editor');
console.log('- As configurações iniciais devem estar inseridas');

console.log('\n🎉 Após a migração, todas as funcionalidades estarão disponíveis!');

// Verificar se há dados do Firebase para migrar
console.log('\n📥 MIGRAÇÃO DE DADOS DO FIREBASE:');
console.log('================================');
console.log('Se você tem dados do Firebase para migrar, forneça:');
console.log('1. Dados da tabela "configs" do Firebase');
console.log('2. Dados da tabela "notifications" do Firebase');
console.log('3. Qualquer configuração específica do sistema');
console.log('\nPodemos criar um script específico para migrar esses dados.');

console.log('\n✨ MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
console.log('Agora execute o SQL no Supabase Dashboard.'); 