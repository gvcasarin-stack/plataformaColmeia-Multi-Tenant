/**
 * API Status Report
 * 
 * Este script analisa o status da migração da API para o novo padrão de tratamento de erros,
 * gerando um relatório detalhado sobre quais endpoints já foram migrados e quais ainda precisam ser migrados.
 * 
 * Uso: node scripts/api-status-report.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const API_PATH = path.join(__dirname, '..', 'src', 'app', 'api');
const ERROR_HANDLER_IMPORT = 'apiErrorHandler';
const OUTPUT_FILE = path.join(__dirname, '..', 'docs', 'api-migration-status.md');

// Categorias de endpoints
const CATEGORIES = {
  'auth': 'Autenticação',
  'projects': 'Projetos',
  'notifications': 'Notificações',
  'emails': 'Emails',
  'test': 'Testes',
  'test-': 'Testes',
  'storage': 'Armazenamento',
  'admin': 'Administração',
  'debug': 'Debug',
  'health': 'Saúde',
  'openai': 'OpenAI',
  'verify': 'Verificação',
  'update': 'Atualização',
  'set-custom': 'Configuração',
  'setup': 'Configuração',
};

/**
 * Verifica se o arquivo já implementa o padrão de tratamento de erros
 * @param {string} filePath Caminho para o arquivo
 * @returns {boolean} Verdadeiro se o arquivo usa apiErrorHandler
 */
function usesErrorHandler(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes(ERROR_HANDLER_IMPORT);
  } catch (error) {
    console.error(`Erro ao analisar o arquivo ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Retorna a categoria de um endpoint com base em seu caminho
 * @param {string} endpointPath Caminho do endpoint
 * @returns {string} Categoria do endpoint
 */
function getCategory(endpointPath) {
  const relativePath = endpointPath.replace(API_PATH, '').split(path.sep)[1];
  
  for (const [prefix, category] of Object.entries(CATEGORIES)) {
    if (relativePath.startsWith(prefix)) {
      return category;
    }
  }
  
  return 'Outros';
}

/**
 * Obtém todos os arquivos de rota na pasta de API
 * @returns {Array<{path: string, category: string, migrated: boolean}>} Lista de endpoints
 */
function getAllEndpoints() {
  const endpoints = [];
  
  function scanDir(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        const relativePath = fullPath.replace(path.join(__dirname, '..'), '');
        const apiPath = relativePath
          .replace(/src[\/\\]app[\/\\]api/, '/api')
          .replace(/[\/\\]route\.(ts|js)$/, '')
          .replace(/\\/g, '/');
          
        const category = getCategory(fullPath);
        const migrated = usesErrorHandler(fullPath);
        
        endpoints.push({
          path: apiPath,
          fullPath: fullPath,
          category,
          migrated
        });
      }
    }
  }
  
  scanDir(API_PATH);
  return endpoints;
}

/**
 * Gera o relatório em formato Markdown
 * @param {Array<{path: string, category: string, migrated: boolean}>} endpoints Lista de endpoints
 * @returns {string} Conteúdo do relatório em Markdown
 */
function generateReport(endpoints) {
  const categories = {};
  const totals = { migrated: 0, total: 0 };
  
  // Agrupar por categoria
  for (const endpoint of endpoints) {
    if (!categories[endpoint.category]) {
      categories[endpoint.category] = {
        endpoints: [],
        migrated: 0,
        total: 0
      };
    }
    
    categories[endpoint.category].endpoints.push(endpoint);
    categories[endpoint.category].total++;
    totals.total++;
    
    if (endpoint.migrated) {
      categories[endpoint.category].migrated++;
      totals.migrated++;
    }
  }
  
  // Ordenar categorias por nome
  const sortedCategories = Object.entries(categories)
    .sort(([catA], [catB]) => catA.localeCompare(catB));
  
  // Gerar markdown
  let markdown = `# Relatório de Status da Migração da API\n\n`;
  markdown += `*Gerado em: ${new Date().toLocaleString()}*\n\n`;
  
  markdown += `## Resumo\n\n`;
  markdown += `| Categoria | Endpoints Migrados | Total de Endpoints | Progresso |\n`;
  markdown += `|-----------|-------------------|-------------------|----------|\n`;
  
  for (const [category, data] of sortedCategories) {
    const percentage = (data.migrated / data.total * 100).toFixed(1);
    markdown += `| ${category} | ${data.migrated} | ${data.total} | ${percentage}% |\n`;
  }
  
  const totalPercentage = (totals.migrated / totals.total * 100).toFixed(1);
  markdown += `| **Total** | **${totals.migrated}** | **${totals.total}** | **${totalPercentage}%** |\n\n`;
  
  // Detalhes por categoria
  markdown += `## Detalhes por Categoria\n\n`;
  
  for (const [category, data] of sortedCategories) {
    markdown += `### ${category}\n\n`;
    markdown += `| Endpoint | Status |\n`;
    markdown += `|----------|--------|\n`;
    
    // Ordenar endpoints: primeiro os migrados, depois os não migrados
    const sortedEndpoints = [...data.endpoints]
      .sort((a, b) => {
        if (a.migrated !== b.migrated) {
          return a.migrated ? -1 : 1;
        }
        return a.path.localeCompare(b.path);
      });
    
    for (const endpoint of sortedEndpoints) {
      const status = endpoint.migrated ? '✅ Migrado' : '❌ Pendente';
      markdown += `| \`${endpoint.path}\` | ${status} |\n`;
    }
    
    markdown += `\n`;
  }
  
  // Próximos passos
  markdown += `## Próximos Passos Recomendados\n\n`;
  
  // Encontrar endpoints de alta prioridade que ainda não foram migrados
  const highPriorityCategories = ['Autenticação', 'Projetos', 'Notificações'];
  const highPriorityEndpoints = endpoints
    .filter(e => highPriorityCategories.includes(e.category) && !e.migrated)
    .sort((a, b) => a.category.localeCompare(b.category));
  
  if (highPriorityEndpoints.length > 0) {
    markdown += `### Endpoints de Alta Prioridade\n\n`;
    markdown += `Os seguintes endpoints de alta prioridade ainda precisam ser migrados:\n\n`;
    
    for (const endpoint of highPriorityEndpoints) {
      markdown += `- \`${endpoint.path}\` (${endpoint.category})\n`;
    }
    
    markdown += `\n`;
  }
  
  // Adicionar endpoints com prefixo "test-" que precisam ser renomeados
  const testEndpoints = endpoints
    .filter(e => e.path.includes('/test-') || e.path.includes('/test/'))
    .sort((a, b) => a.path.localeCompare(b.path));
  
  if (testEndpoints.length > 0) {
    markdown += `### Endpoints com Nomenclatura de Teste\n\n`;
    markdown += `Os seguintes endpoints ainda usam nomenclatura de teste e devem ser renomeados:\n\n`;
    
    for (const endpoint of testEndpoints) {
      const suggestion = endpoint.path
        .replace('/test-', '/')
        .replace('/test/', '/');
        
      markdown += `- \`${endpoint.path}\` → Sugestão: \`${suggestion}\`\n`;
    }
    
    markdown += `\n`;
  }
  
  return markdown;
}

// Executar o script
try {
  console.log('🔍 Analisando endpoints de API...');
  const endpoints = getAllEndpoints();
  console.log(`📊 Encontrados ${endpoints.length} endpoints no total.`);
  
  const migrated = endpoints.filter(e => e.migrated).length;
  console.log(`✅ ${migrated} endpoints já estão usando o novo padrão (${(migrated/endpoints.length*100).toFixed(1)}%).`);
  
  const report = generateReport(endpoints);
  fs.writeFileSync(OUTPUT_FILE, report);
  
  console.log(`📝 Relatório gerado com sucesso em: ${OUTPUT_FILE}`);
} catch (error) {
  console.error('❌ Erro ao gerar relatório:', error);
  process.exit(1);
} 