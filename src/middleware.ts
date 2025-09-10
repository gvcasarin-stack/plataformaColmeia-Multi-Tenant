import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';

export async function middleware(request: NextRequest) {
  // ✅ WRAPPER DE SEGURANÇA: Nunca deixar o middleware crashar completamente
  try {
    return await middlewareCore(request);
  } catch (criticalError: any) {
    console.error('[Middleware] ERRO CRÍTICO CAPTURADO:', criticalError);
    
    // Em caso de erro crítico, sempre permitir que a requisição continue
    const { pathname } = request.nextUrl;
    let response = NextResponse.next();
    
    // Adicionar header indicando erro crítico
    response.headers.set('x-middleware-critical-error', 'true');
    response.headers.set('x-middleware-error', criticalError.message.substring(0, 100));
    
    return response;
  }
}

async function middlewareCore(request: NextRequest) {
  // ✅ CORRIGIDO: Evitar problemas durante build - v2.1
  if (isBuildTime() && request.nextUrl.pathname.startsWith('/api/')) {
    return createBuildTimeResponse(request.nextUrl.pathname);
  }

  // 🏢 MULTI-TENANT: Detecção de subdomínio ANTES de tudo
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;
  
  // Detectar tipo de site baseado no hostname
  const isMainSite = hostname === 'gerenciamentofotovoltaico.com.br' || hostname === 'www.gerenciamentofotovoltaico.com.br';
  const isRegistroSite = hostname === 'registro.gerenciamentofotovoltaico.com.br';
  const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && !isMainSite && !isRegistroSite;
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  
  console.log(`[Middleware] Multi-tenant detection: ${hostname}${pathname}`);

  // 1. Inicializa a resposta e headers de requisição editáveis
  let requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 2. Adicionar cabeçalhos de segurança a TODAS as respostas
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 3. Bypass para assets estáticos comuns (evita 500 em manifest/ico)
  const staticPublicPaths = ['/manifest.json', '/site.webmanifest', '/robots.txt', '/sitemap.xml', '/favicon.ico'];
  if (staticPublicPaths.includes(pathname)) {
    console.log(`[Middleware] Bypass para asset estático: ${pathname}`);
    return response;
  }

  // 4. Configurar CORS para requisições da API
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    // Responder a requisições OPTIONS (preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }

  // 5. Se é site de registro, servir formulário na página raiz
  if (isRegistroSite) {
    console.log(`[Middleware] Site de registro - servindo formulário`);
    response.headers.set('x-is-registro-site', 'true');
    return response;
  }

  // 🔑 PRIORIDADE MÁXIMA: Rotas admin SEMPRE passam diretamente
  if (pathname.startsWith('/admin')) {
    console.log(`[MIDDLEWARE-ADMIN] Rota admin detectada - BYPASS TOTAL: ${pathname}`);
    return response;
  }

  // 🔓 ROTAS PÚBLICAS DO CLIENTE: não exigir validação de tenant/autenticação prévia
  // Libera especificamente telas públicas de acesso inicial
  const clientPublicPaths = [
    '/cliente/login',
    '/cliente/register',
    '/cliente/cadastro',
    '/cliente/recuperar-senha',
    '/cliente/nova-senha',
    '/confirmar-email',
    '/cadastro/aguardando-confirmacao'
  ];
  if (clientPublicPaths.includes(pathname)) {
    console.log(`[Middleware] CLIENT PUBLIC BYPASS: ${pathname}`);
    return response;
  }

  // ❗ Evitar loop de redirecionamento na página de tenant inexistente
  if (pathname === '/tenant-not-found') {
    console.log(`[Middleware] Bypass em /tenant-not-found para evitar redirect loop`);
    return response;
  }

  // 6. Se é subdomínio de tenant, validar e configurar headers
  if (isSubdomain) {
    const tenantSlug = hostname.split('.')[0];
    console.log(`[Middleware] Tenant detectado: ${tenantSlug}`);

    // ✅ CONFIGURAÇÃO SIMPLES: Usar UUID correto para goias-solar, fallback para outros
    try {
      let tenantId: string;
      let tenantName: string;
      
      // Mapear tenants conhecidos para seus UUIDs reais
      if (tenantSlug === 'goias-solar') {
        tenantId = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'; // UUID real do banco
        tenantName = 'Goiás Solar';
      } else {
        tenantId = `tenant_${tenantSlug}`; // Fallback para outros tenants
        tenantName = tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1);
      }
      
      const isTrialActive = true; // Assumir trial ativo por padrão

      console.log(`[Middleware] Configurando headers do tenant: ${tenantSlug} -> ${tenantId}`);

      // Configurar headers
      requestHeaders.set('x-tenant-id', tenantId);
      requestHeaders.set('x-tenant-slug', tenantSlug);
      requestHeaders.set('x-tenant-name', tenantName);
      requestHeaders.set('x-tenant-trial', isTrialActive.toString());

      response = NextResponse.next({
        request: { headers: requestHeaders }
      });
      response.headers.set('x-tenant-id', tenantId);
      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('x-tenant-name', tenantName);
      response.headers.set('x-tenant-trial', isTrialActive.toString());

    } catch (headerError: any) {
      console.error(`[Middleware] ERRO ao configurar headers do tenant: ${headerError.message}`);
      
      // Fallback: configurar headers mínimos
      requestHeaders.set('x-tenant-slug', tenantSlug);
      requestHeaders.set('x-middleware-error', 'header-config-failed');
      
      response = NextResponse.next({
        request: { headers: requestHeaders }
      });
      
      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('x-middleware-error', 'header-config-failed');
      
      return response;
    }
  }

  // 7. Se é site principal ou localhost, permitir acesso livre
  if (isMainSite || isLocalhost) {
    console.log(`[Middleware] Site principal ou localhost - sem proteção de rotas`);
    return response;
  }

  // 8. Se não é nenhum dos casos acima, deixar passar
  if (!isSubdomain && !isRegistroSite) {
    console.log(`[Middleware] Não é subdomínio - deixar passar`);
    return response;
  }

  // 9. Lógica de Proteção de Rotas para Tenants (se necessário)
  const adminLoginPath = '/admin/login';
  const clientLoginPath = '/cliente/login';
  const publicPaths = ['/api/', '/_next/', '/favicon.ico', '/logo.svg', '/lightning-icon.svg'];

  // Verificar se é uma rota pública
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isLoginPath = pathname === adminLoginPath || pathname === clientLoginPath;

  if (isPublicPath || isLoginPath) {
    return response;
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};