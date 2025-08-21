const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);

// Padrões para encontrar respostas de API não padronizadas
const NON_STANDARD_PATTERNS = [
  'NextResponse.json\\(\\s*{\\s*error',
  'NextResponse.json\\(\\s*{\\s*success:\\s*false',
  'NextResponse.json\\([^,]+,\\s*{\\s*status:\\s*[45]',
  'return\\s+{\\s*error:',
  'res.status\\([45]\\d{2}\\).json',
];

// Caminho para as APIs
const API_DIR = path.join(__dirname, '../src/app/api');

// Verifica se um arquivo está usando o manipulador de erro padronizado
async function isUsingStandardErrorHandler(filePath) {
  const content = await readFileAsync(filePath, 'utf8');
  return content.includes('apiErrorHandler');
}

// Verifica se um arquivo contém padrões de resposta de erro não padronizados
async function hasNonStandardErrorPatterns(filePath) {
  const content = await readFileAsync(filePath, 'utf8');
  
  for (const pattern of NON_STANDARD_PATTERNS) {
    if (new RegExp(pattern).test(content)) {
      return true;
    }
  }
  
  return false;
}

// Encontra todos os arquivos route.ts recursivamente
async function findRouteFiles(dir) {
  const routeFiles = [];
  
  async function scanDir(currentDir) {
    const entries = await readdirAsync(currentDir);
    
    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry);
      const stats = await statAsync(entryPath);
      
      if (stats.isDirectory()) {
        await scanDir(entryPath);
      } else if (entry === 'route.ts' || entry === 'route.js') {
        routeFiles.push(entryPath);
      }
    }
  }
  
  await scanDir(dir);
  return routeFiles;
}

// Função principal
async function analyzeApiErrorHandling() {
  try {
    console.log('Analisando manipulação de erros em arquivos de API...\n');
    
    const routeFiles = await findRouteFiles(API_DIR);
    console.log(`Encontrados ${routeFiles.length} arquivos de rota para análise.\n`);
    
    const results = {
      usingStandard: [],
      notUsingStandard: [],
      needsAttention: []
    };
    
    for (const file of routeFiles) {
      const relativePath = path.relative(__dirname, file);
      const isUsingStandard = await isUsingStandardErrorHandler(file);
      const hasNonStandard = await hasNonStandardErrorPatterns(file);
      
      if (isUsingStandard && !hasNonStandard) {
        results.usingStandard.push(relativePath);
      } else if (!isUsingStandard && hasNonStandard) {
        results.notUsingStandard.push(relativePath);
      } else {
        // Casos mistos ou incertos
        results.needsAttention.push(relativePath);
      }
    }
    
    // Resultados
    console.log('RELATÓRIO DE ANÁLISE DE TRATAMENTO DE ERROS EM APIs\n');
    console.log('=====================================================\n');
    
    console.log(`Total de arquivos analisados: ${routeFiles.length}\n`);
    
    console.log('1. ARQUIVOS COM PADRÃO IMPLEMENTADO:');
    console.log(`Total: ${results.usingStandard.length}`);
    results.usingStandard.forEach(file => console.log(`  ✅ ${file}`));
    console.log('\n');
    
    console.log('2. ARQUIVOS QUE PRECISAM SER ATUALIZADOS:');
    console.log(`Total: ${results.notUsingStandard.length}`);
    results.notUsingStandard.forEach(file => console.log(`  ❌ ${file}`));
    console.log('\n');
    
    console.log('3. ARQUIVOS QUE PRECISAM DE VERIFICAÇÃO MANUAL:');
    console.log(`Total: ${results.needsAttention.length}`);
    results.needsAttention.forEach(file => console.log(`  ⚠️ ${file}`));
    
    // Salvar resultados em um arquivo
    const outputFile = path.join(__dirname, 'api-error-analysis-results.json');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\nResultados detalhados salvos em: ${outputFile}`);
    
    return results;
  } catch (error) {
    console.error('Erro ao analisar os arquivos:', error);
    return null;
  }
}

// Executar análise
analyzeApiErrorHandling();
