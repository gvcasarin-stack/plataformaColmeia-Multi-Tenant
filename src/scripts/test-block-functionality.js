import { devLog } from "@/lib/utils/productionLogger";

/**
 * Script para testar a funcionalidade completa de bloqueio/desbloqueio de usuários
 * 
 * Execute com: node src/scripts/test-block-functionality.js
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Cores para output no terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  devLog.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  devLog.log('\n' + '='.repeat(60));
  log(`📋 ${title}`, 'cyan');
  devLog.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Simulação de dados de teste
const testData = {
  adminUser: {
    email: 'admin@colmeiasolar.com',
    password: 'admin123'
  },
  clientUser: {
    email: 'cliente@exemplo.com',
    name: 'Cliente Teste',
    reason: 'Teste de funcionalidade de bloqueio'
  }
};

async function testBlockFunctionality() {
  logSection('TESTE DE FUNCIONALIDADE DE BLOQUEIO/DESBLOQUEIO');

  try {
    // 1. Verificar APIs disponíveis
    logSection('1. Verificação de APIs');
    await testApiAvailability();

    // 2. Testar página de usuário bloqueado
    logSection('2. Página de Usuário Bloqueado');
    await testBlockedUserPage();

    // 3. Testar middleware
    logSection('3. Middleware de Bloqueio');
    await testBlockMiddleware();

    // 4. Verificar componentes
    logSection('4. Componentes de UI');
    await testUIComponents();

    logSection('RESUMO DO TESTE');
    logSuccess('Todos os testes de funcionalidade foram concluídos!');
    logInfo('Verifique os logs acima para detalhes de cada teste.');

  } catch (error) {
    logError(`Erro durante os testes: ${error.message}`);
    process.exit(1);
  }
}

async function testApiAvailability() {
  const apis = [
    '/api/admin/block-user',
    '/api/admin/unblock-user',
    '/api/user/block-status',
    '/api/projects'
  ];

  for (const api of apis) {
    try {
      // Teste simples de disponibilidade (sem autenticação)
      const response = await fetch(`${API_BASE_URL}${api}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        logSuccess(`API ${api} - Disponível (requer autenticação)`);
      } else if (response.status === 404) {
        logError(`API ${api} - Não encontrada`);
      } else {
        logSuccess(`API ${api} - Disponível (status: ${response.status})`);
      }
    } catch (error) {
      logError(`API ${api} - Erro de conexão: ${error.message}`);
    }
  }
}

async function testBlockedUserPage() {
  logInfo('Verificando se a página de usuário bloqueado existe...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/cliente/bloqueado`);
    
    if (response.ok) {
      logSuccess('Página /cliente/bloqueado - Acessível');
      
      // Verificar se contém elementos essenciais
      const html = await response.text();
      
      const checks = [
        { text: 'Conta Bloqueada', found: html.includes('Conta Bloqueada') },
        { text: 'Contato do Suporte', found: html.includes('Contato do Suporte') },
        { text: 'suporte@colmeiasolar.com', found: html.includes('suporte@colmeiasolar.com') }
      ];
      
      checks.forEach(check => {
        if (check.found) {
          logSuccess(`  ✓ Contém: ${check.text}`);
        } else {
          logWarning(`  ✗ Não contém: ${check.text}`);
        }
      });
    } else {
      logError(`Página /cliente/bloqueado - Erro ${response.status}`);
    }
  } catch (error) {
    logError(`Erro ao testar página bloqueada: ${error.message}`);
  }
}

async function testBlockMiddleware() {
  logInfo('Testando middleware de bloqueio...');
  
  // Teste de rota protegida sem autenticação
  try {
    const response = await fetch(`${API_BASE_URL}/cliente/painel`);
    
    if (response.redirected || response.url.includes('/cliente/login')) {
      logSuccess('Middleware - Redirecionamento funcionando para usuários não autenticados');
    } else {
      logWarning('Middleware - Redirecionamento pode não estar funcionando corretamente');
    }
  } catch (error) {
    logInfo(`Middleware - Teste limitado devido a: ${error.message}`);
  }
}

async function testUIComponents() {
  logInfo('Verificando arquivos de componentes...');
  
  const components = [
    'src/components/ui/block-status-badge.tsx',
    'src/components/modals/BlockUserModal.tsx',
    'src/lib/services/userBlockService.ts'
  ];
  
  for (const component of components) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(path.join(process.cwd(), component))) {
        logSuccess(`Componente: ${component} - Existe`);
      } else {
        logError(`Componente: ${component} - Não encontrado`);
      }
    } catch (error) {
      logWarning(`Não foi possível verificar: ${component}`);
    }
  }
}

// Funções auxiliares para testes mais avançados (requerem configuração adicional)
function createAdvancedTests() {
  logSection('TESTES AVANÇADOS (OPCIONAL)');
  
  logInfo('Para testes completos com autenticação, execute:');
  logInfo('1. Faça login como administrador');
  logInfo('2. Vá para /admin/clientes');
  logInfo('3. Teste bloquear/desbloquear um usuário');
  logInfo('4. Faça login como o usuário bloqueado');
  logInfo('5. Verifique se é redirecionado para /cliente/bloqueado');
  
  logInfo('\nPara testar APIs com autenticação:');
  logInfo('1. Use um token de autenticação válido');
  logInfo('2. Teste POST /api/admin/block-user');
  logInfo('3. Teste POST /api/admin/unblock-user');
  logInfo('4. Teste GET /api/user/block-status');
}

function showImplementationSummary() {
  logSection('RESUMO DA IMPLEMENTAÇÃO');
  
  logSuccess('✅ Funcionalidades implementadas:');
  devLog.log('   • Serviço de bloqueio de usuários (userBlockService.ts)');
  devLog.log('   • APIs para bloquear/desbloquear usuários');
  devLog.log('   • API para verificar status de bloqueio');
  devLog.log('   • Página de usuário bloqueado (/cliente/bloqueado)');
  devLog.log('   • Middleware atualizado para verificar bloqueios');
  devLog.log('   • Interface administrativa com botões de ação');
  devLog.log('   • Componentes UI (badges, modais)');
  devLog.log('   • Proteção de APIs importantes');
  
  logInfo('\n📋 Campos adicionados no banco de dados:');
  devLog.log('   • is_blocked (BOOLEAN DEFAULT false)');
  devLog.log('   • blocked_reason (TEXT)');
  devLog.log('   • blocked_at (TIMESTAMPTZ)');
  devLog.log('   • blocked_by (UUID REFERENCES users(id))');
  
  logInfo('\n🔧 Configurações necessárias:');
  devLog.log('   • Execute o script SQL no Supabase');
  devLog.log('   • Configure informações de contato em /cliente/bloqueado');
  devLog.log('   • Teste em ambiente de desenvolvimento');
  devLog.log('   • Deploy para produção');
}

// Executar testes
if (require.main === module) {
  (async () => {
    await testBlockFunctionality();
    createAdvancedTests();
    showImplementationSummary();
  })();
}

module.exports = {
  testBlockFunctionality,
  testApiAvailability,
  testBlockedUserPage,
  testBlockMiddleware,
  testUIComponents
}; 