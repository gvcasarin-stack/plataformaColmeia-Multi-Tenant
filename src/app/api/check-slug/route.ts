import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

// Slugs reservados que não podem ser usados
const RESERVED_SLUGS = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'app', 'dashboard',
  'panel', 'control', 'manage', 'system', 'root', 'test', 'dev', 'staging',
  'prod', 'production', 'beta', 'alpha', 'demo', 'support', 'help', 'docs',
  'blog', 'news', 'about', 'contact', 'legal', 'privacy', 'terms', 'login',
  'register', 'signup', 'signin', 'logout', 'auth', 'oauth', 'sso', 'saml',
  'ldap', 'ad', 'directory', 'user', 'users', 'profile', 'account', 'settings',
  'config', 'configuration', 'setup', 'install', 'update', 'upgrade', 'patch',
  'maintenance', 'status', 'health', 'ping', 'heartbeat', 'monitor', 'metrics',
  'analytics', 'stats', 'reports', 'logs', 'debug', 'trace', 'error', 'errors',
  'exception', 'exceptions', 'bug', 'bugs', 'issue', 'issues', 'ticket', 'tickets',
  'feedback', 'suggestion', 'suggestions', 'feature', 'features', 'request', 'requests',
  'download', 'downloads', 'upload', 'uploads', 'file', 'files', 'document', 'documents',
  'image', 'images', 'photo', 'photos', 'video', 'videos', 'audio', 'music', 'media',
  'asset', 'assets', 'resource', 'resources', 'public', 'private', 'shared', 'common',
  'lib', 'library', 'libraries', 'framework', 'frameworks', 'plugin', 'plugins',
  'extension', 'extensions', 'addon', 'addons', 'module', 'modules', 'component', 'components',
  'widget', 'widgets', 'tool', 'tools', 'utility', 'utilities', 'helper', 'helpers',
  'service', 'services', 'worker', 'workers', 'job', 'jobs', 'task', 'tasks',
  'queue', 'queues', 'schedule', 'schedules', 'cron', 'batch', 'bulk', 'import', 'export',
  'backup', 'backups', 'restore', 'migration', 'migrations', 'seed', 'seeds', 'fixture', 'fixtures',
  'data', 'database', 'db', 'sql', 'query', 'queries', 'table', 'tables', 'index', 'indexes',
  'cache', 'redis', 'memcache', 'session', 'sessions', 'cookie', 'cookies', 'token', 'tokens',
  'key', 'keys', 'secret', 'secrets', 'password', 'passwords', 'hash', 'hashes', 'salt', 'salts',
  'encrypt', 'decrypt', 'cipher', 'ciphers', 'crypto', 'cryptography', 'ssl', 'tls', 'https',
  'http', 'tcp', 'udp', 'ip', 'dns', 'domain', 'subdomain', 'host', 'hostname', 'server', 'servers',
  'client', 'clients', 'browser', 'browsers', 'mobile', 'desktop', 'tablet', 'phone', 'device', 'devices',
  'platform', 'platforms', 'os', 'operating-system', 'windows', 'linux', 'mac', 'macos', 'ios', 'android',
  'web', 'website', 'site', 'sites', 'page', 'pages', 'url', 'urls', 'link', 'links', 'redirect', 'redirects',
  'route', 'routes', 'path', 'paths', 'endpoint', 'endpoints', 'webhook', 'webhooks', 'callback', 'callbacks',
  'event', 'events', 'listener', 'listeners', 'handler', 'handlers', 'controller', 'controllers', 'model', 'models',
  'view', 'views', 'template', 'templates', 'layout', 'layouts', 'theme', 'themes', 'style', 'styles',
  'css', 'sass', 'scss', 'less', 'stylus', 'js', 'javascript', 'typescript', 'ts', 'jsx', 'tsx',
  'html', 'xml', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config', 'cfg', 'env', 'environment',
  'prod', 'production', 'dev', 'development', 'test', 'testing', 'stage', 'staging', 'preview', 'beta', 'alpha',
  'registro', 'register', 'cadastro', 'signup'
];

// Função para validar formato do slug
function isValidSlugFormat(slug: string): boolean {
  // Regex para validar formato: apenas letras, números e hífens, não pode começar/terminar com hífen
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 30;
}

// Função para gerar sugestões de slug
function generateSlugSuggestions(originalSlug: string): string[] {
  const suggestions: string[] = [];
  const baseSlug = originalSlug.replace(/-\d+$/, ''); // Remove números do final se houver
  
  // Adicionar números sequenciais
  for (let i = 1; i <= 5; i++) {
    suggestions.push(`${baseSlug}-${i}`);
  }
  
  // Adicionar variações com palavras comuns
  const suffixes = ['empresa', 'solar', 'energia', 'tech', 'solutions', 'group', 'corp'];
  for (const suffix of suffixes) {
    const suggestion = `${baseSlug}-${suffix}`;
    if (suggestion.length <= 30) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions.slice(0, 5); // Retornar no máximo 5 sugestões
}

// Rate limiting simples baseado em IP
const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 10; // Máximo 10 requests por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);
  
  if (!userLimit) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return true;
  }
  
  // Reset se passou da janela de tempo
  if (now - userLimit.lastRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return true;
  }
  
  // Incrementar contador
  userLimit.count++;
  userLimit.lastRequest = now;
  
  return userLimit.count <= RATE_LIMIT_MAX_REQUESTS;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          available: false, 
          message: 'Muitas tentativas. Tente novamente em alguns minutos.',
          error: 'RATE_LIMITED' 
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    // Criar cliente Supabase uma vez
    const supabase = createSupabaseServiceRoleClient();

    if (!slug) {
      return NextResponse.json(
        { 
          available: false, 
          message: 'Slug é obrigatório',
          error: 'MISSING_SLUG' 
        },
        { status: 400 }
      );
    }

    // Validar formato do slug
    if (!isValidSlugFormat(slug)) {
      return NextResponse.json({
        available: false,
        message: 'Formato inválido. Use apenas letras, números e hífens (3-30 caracteres)',
        suggestions: generateSlugSuggestions(slug),
        error: 'INVALID_FORMAT'
      });
    }

    // Verificar se é um slug reservado (usando tabela do banco)
    const { data: reservedSlug, error: reservedError } = await supabase
      .from('reserved_slugs')
      .select('slug, reason, category')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (reservedError && reservedError.code !== 'PGRST116') {
      devLog.error('[check-slug] Erro ao verificar slug reservado:', reservedError);
      // Continuar com verificação fallback usando array hardcoded
    }

    if (reservedSlug) {
      return NextResponse.json({
        available: false,
        message: `Este slug é reservado e não pode ser usado. ${reservedSlug.reason}`,
        suggestions: generateSlugSuggestions(slug),
        error: 'RESERVED_SLUG'
      });
    }

    // Fallback: Verificar array hardcoded se tabela não estiver disponível
    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({
        available: false,
        message: 'Este slug é reservado e não pode ser usado',
        suggestions: generateSlugSuggestions(slug),
        error: 'RESERVED_SLUG'
      });
    }
    
    const { data: existingOrg, error: dbError } = await supabase
      .from('organizations')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = no rows returned
      devLog.error('[check-slug] Erro ao consultar banco:', dbError);
      return NextResponse.json(
        { 
          available: false, 
          message: 'Erro interno. Tente novamente.',
          error: 'DATABASE_ERROR' 
        },
        { status: 500 }
      );
    }

    // Se encontrou uma organização com esse slug, não está disponível
    if (existingOrg) {
      return NextResponse.json({
        available: false,
        message: 'Este slug já está em uso',
        suggestions: generateSlugSuggestions(slug),
        error: 'SLUG_TAKEN'
      });
    }

    // Slug está disponível
    devLog.log(`[check-slug] Slug disponível: ${slug}`);
    return NextResponse.json({
      available: true,
      message: 'Slug disponível!',
      slug: slug
    });

  } catch (error) {
    devLog.error('[check-slug] Erro inesperado:', error);
    return NextResponse.json(
      { 
        available: false, 
        message: 'Erro inesperado. Tente novamente.',
        error: 'UNEXPECTED_ERROR' 
      },
      { status: 500 }
    );
  }
}
