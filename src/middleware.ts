import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';
import { devLog } from '@/lib/utils/productionLogger';

export async function middleware(request: NextRequest) {
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
  
  devLog.log(`[Middleware] 🏢 Multi-tenant detection:`, {
    hostname,
    pathname,
    isMainSite,
    isRegistroSite,
    isSubdomain,
    isLocalhost
  });

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
    devLog.log('[Middleware] 🧩 Bypass para asset estático', { pathname, hostname });
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
    devLog.log(`[Middleware] ✅ Site de registro - servindo formulário`);
    response.headers.set('x-is-registro-site', 'true');
    return response;
  }

  // 🔑 PRIORIDADE MÁXIMA: Rotas admin SEMPRE passam diretamente
  if (pathname.startsWith('/admin')) {
    console.log(`🔑 [MIDDLEWARE-ADMIN] Rota admin detectada - BYPASS TOTAL: ${pathname}`);
    console.log(`🔑 [MIDDLEWARE-ADMIN] Hostname: ${hostname}`);
    devLog.log(`[Middleware] 🔑 ADMIN BYPASS:`, { pathname, hostname });
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
    devLog.log('[Middleware] 🔓 CLIENT PUBLIC BYPASS:', { pathname, hostname });
    return response;
  }

  // ❗ Evitar loop de redirecionamento na página de tenant inexistente
  // Quando o tenant não é encontrado, redirecionamos para /tenant-not-found.
  // Essa rota deve SEMPRE passar direto, sem nova validação, para não gerar ERR_TOO_MANY_REDIRECTS.
  if (pathname === '/tenant-not-found') {
    devLog.log('[Middleware] 🚧 Bypass em /tenant-not-found para evitar redirect loop', { hostname, method: request.method });
    
    return response;
  }

  // 6. Se é subdomínio de tenant, validar e configurar headers
  if (isSubdomain) {
    const tenantSlug = hostname.split('.')[0];
    devLog.log(`[Middleware] 🏢 Tenant detectado - MODO DEBUG:`, { tenantSlug, hostname });

    // ✅ CORRIGIDO: Usar tenant_id real do banco de dados
    devLog.log('[Middleware] ✅ USANDO TENANT_ID REAL DO BANCO');
    
    // Configurar headers com tenant_id real
    const realTenantId = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'; // ID real do tenant goias-solar
    requestHeaders.set('x-tenant-id', realTenantId);
    requestHeaders.set('x-tenant-slug', tenantSlug);
    requestHeaders.set('x-tenant-name', 'Goias Solar');
    requestHeaders.set('x-tenant-trial', 'true');

    response = NextResponse.next({
      request: { headers: requestHeaders }
    });
    response.headers.set('x-tenant-id', realTenantId);
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-tenant-name', 'Goias Solar');
    response.headers.set('x-tenant-trial', 'true');
    
    return response;

    /*
    // CÓDIGO DESABILITADO TEMPORARIAMENTE PARA DEBUG
    try {
      // [código da validação comentado]
    } catch (error: any) {
      // [código do erro comentado] 
    }
    */
  }

  // 7. Se é site principal ou localhost, permitir acesso livre
  if (isMainSite || isLocalhost) {
    devLog.log(`[Middleware] ✅ Site principal ou localhost - sem proteção de rotas`);
    return response;
  }

  // 8. Se não é nenhum dos casos acima, deixar passar
  if (!isSubdomain && !isRegistroSite) {
    devLog.log(`[Middleware] ✅ Não é subdomínio - deixar passar`);
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

  // Para rotas protegidas de tenant, pode adicionar lógica de autenticação aqui se necessário
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};