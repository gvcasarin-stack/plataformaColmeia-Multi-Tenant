import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';
import { devLog } from '@/lib/utils/productionLogger';

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

    // ✅ CORREÇÃO: Para APIs de debug, fazer lookup mas não falhar se der erro
    const isDebugApi = pathname.startsWith('/api/debug/');
    if (isDebugApi) {
      devLog.log('[Middleware] API de debug detectada - lookup com fallback:', pathname);
    }

    // ✅ MIGRAÇÃO SUPABASE: Lookup dinâmico do tenant no banco com fallback seguro
    devLog.log('[Middleware] ✅ FAZENDO LOOKUP DINÂMICO DO TENANT:', tenantSlug);
    
    try {
      // Timeout de 3 segundos para o lookup
      const lookupPromise = (async () => {
        const supabase = createSupabaseServiceRoleClient();
        
        devLog.log('[Middleware] Iniciando lookup do tenant no banco:', { tenantSlug });
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, trial_end_date, is_trial, status')
          .eq('slug', tenantSlug)
          .eq('status', 'active')
          .single();
        
        return { orgData, orgError };
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout do lookup de tenant')), 3000);
      });

      const { orgData, orgError } = await Promise.race([lookupPromise, timeoutPromise]) as any;
      
      devLog.log('[Middleware] Resultado do lookup:', { 
        tenantSlug, 
        found: !!orgData, 
        error: orgError?.message,
        errorCode: orgError?.code 
      });

      if (orgError || !orgData) {
        devLog.error('[Middleware] Tenant não encontrado ou inativo:', { tenantSlug, orgError });
        
        // ✅ CORREÇÃO: Para APIs de debug, permitir continuação com headers mínimos
        if (isDebugApi) {
          devLog.warn('[Middleware] API de debug - tenant não encontrado mas permitindo continuação');
          requestHeaders.set('x-tenant-slug', tenantSlug);
          requestHeaders.set('x-middleware-error', 'tenant-not-found');
          response = NextResponse.next({
            request: { headers: requestHeaders }
          });
          return response;
        }
        
        // 🚨 SEGURANÇA: Para outras chamadas de API, retornar erro 404
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Tenant not found', tenant: tenantSlug },
            { status: 404 }
          );
        }
        
        devLog.warn('[Middleware] Redirecionando página para tenant-not-found');
        return NextResponse.redirect(new URL('/tenant-not-found', request.url));
      }

      // ✅ CORREÇÃO: Verificar se trial ainda está ativo com tratamento de erro
      const now = new Date();
      let trialEndsAt = null;
      let isTrialActive = false;
      
      try {
        trialEndsAt = orgData.trial_end_date ? new Date(orgData.trial_end_date) : null;
        isTrialActive = trialEndsAt ? now <= trialEndsAt : false;
        devLog.log('[Middleware] Trial status calculado:', { 
          trial_end_date: orgData.trial_end_date,
          trialEndsAt: trialEndsAt?.toISOString(),
          isTrialActive,
          now: now.toISOString()
        });
      } catch (dateError: any) {
        devLog.error('[Middleware] Erro ao processar data do trial:', dateError);
        isTrialActive = true; // Default para trial ativo em caso de erro
      }

      devLog.log('[Middleware] Tenant encontrado:', {
        tenantId: orgData.id,
        tenantName: orgData.name,
        isTrialActive,
        trialEndsAt: orgData.trial_ends_at
      });

      // Configurar headers com dados dinâmicos do tenant
      requestHeaders.set('x-tenant-id', orgData.id);
      requestHeaders.set('x-tenant-slug', tenantSlug);
      requestHeaders.set('x-tenant-name', orgData.name);
      requestHeaders.set('x-tenant-trial', isTrialActive.toString());

      response = NextResponse.next({
        request: { headers: requestHeaders }
      });
      response.headers.set('x-tenant-id', orgData.id);
      response.headers.set('x-tenant-slug', tenantSlug);
      response.headers.set('x-tenant-name', orgData.name);
      response.headers.set('x-tenant-trial', isTrialActive.toString());

    } catch (lookupError: any) {
      devLog.error('[Middleware] ERRO CRÍTICO no lookup do tenant:', {
        tenantSlug,
        error: lookupError.message,
        stack: lookupError.stack,
        pathname
      });
      
      // ✅ CORREÇÃO CRÍTICA: NUNCA falhar completamente o middleware
      // Sempre permitir que a requisição continue, mesmo com erro
      
      if (pathname.startsWith('/api/')) {
        // Para APIs, configurar headers mínimos e deixar a API lidar com o erro
        devLog.warn('[Middleware] Erro no lookup - configurando headers mínimos para API:', pathname);
        
        requestHeaders.set('x-tenant-slug', tenantSlug);
        requestHeaders.set('x-middleware-error', 'tenant-lookup-failed');
        requestHeaders.set('x-middleware-error-details', lookupError.message.substring(0, 100));
        
        response = NextResponse.next({
          request: { headers: requestHeaders }
        });
        
        // Adicionar headers de resposta também
        response.headers.set('x-tenant-slug', tenantSlug);
        response.headers.set('x-middleware-error', 'tenant-lookup-failed');
        
        return response;
      }
      
      // Para páginas, redirecionar para página de erro
      devLog.warn('[Middleware] Erro de BD - redirecionando para tenant-not-found');
      try {
        return NextResponse.redirect(new URL('/tenant-not-found', request.url));
      } catch (redirectError) {
        // Se nem o redirect funcionar, deixar passar
        devLog.error('[Middleware] Erro no redirect - permitindo passagem:', redirectError);
        return response;
      }
    }

    
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