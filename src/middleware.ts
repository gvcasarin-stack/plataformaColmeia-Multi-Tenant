import { type NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * MIDDLEWARE SUPER MINIMALISTA - FOCO EM NUNCA FALHAR
 * Remove TODAS as dependências que podem causar problemas
 */

/**
 * Sanitiza strings para uso em headers HTTP (remove caracteres não-ASCII)
 */
function sanitizeHeaderValue(value: string): string {
  if (!value || typeof value !== 'string') {
    return 'Unknown';
  }

  return value
    // Primeiro normalizar acentos comuns
    .replace(/[áàâãäå]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôõö]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ç]/gi, 'c')
    .replace(/[ñ]/gi, 'n')
    .replace(/[ý]/gi, 'y')
    // Depois remover qualquer caractere não-ASCII restante
    .replace(/[^\x00-\x7F]/g, '')
    // Limpar espaços extras
    .trim()
    // Garantir que não está vazio
    || 'Unknown';
}
export async function middleware(request: NextRequest) {
  // ✅ TRIPLE SAFETY WRAPPER
  try {
    return await safeCore(request);
  } catch (error1: any) {
    devLog.error('[Middleware] ERRO NIVEL 1:', error1.message);
    try {
      return await emergencyCore(request);
    } catch (error2: any) {
      devLog.error('[Middleware] ERRO NIVEL 2:', error2.message);
      return createUltimateEmergencyResponse();
    }
  }
}

async function safeCore(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  devLog.log(`[Middleware] Processing: ${hostname}${pathname}`);
  
  // 1. Resposta básica
  let requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  // 2. Headers de segurança básicos
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  // 3. Assets estáticos e rotas de autenticação do Supabase
  if (pathname.includes('favicon') || pathname.includes('.ico') || pathname.includes('.png')) {
    return response;
  }

  // ✅ CORREÇÃO: Permitir rotas de autenticação do Supabase (reset password, etc)
  if (pathname.startsWith('/auth/') || pathname.startsWith('/api/auth/')) {
    devLog.log(`[Middleware] Rota de autenticação bypass: ${pathname}`);
    return response;
  }

  // 4. CORS básico
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }

  // 5. PÁGINAS DE ERRO - BYPASS (evitar loop de redirecionamento)
  if (pathname.startsWith('/account-canceled') ||
      pathname.startsWith('/account-suspended') ||
      pathname.startsWith('/tenant-not-found') ||
      pathname.startsWith('/wrong-domain') ||
      pathname.startsWith('/admin/bloqueio') ||
      pathname.startsWith('/api/billing/reactivate-checkout')) {
    devLog.log(`[Middleware] Página de erro bypass: ${pathname}`);
    return response;
  }

  // 6. DOMÍNIO PRINCIPAL - SITE MARKETING (sem subdomínio)
  if (hostname === 'gerenciamentofotovoltaico.com.br' ||
      hostname === 'www.gerenciamentofotovoltaico.com.br') {
    devLog.log(`[Middleware] Domínio principal detectado: ${hostname}`);

    // ✅ EXCEÇÃO: Permitir rotas de senha (nova senha, recuperação, etc)
    const isPasswordRoute = pathname.includes('/nova-senha') ||
                           pathname.includes('/recuperar-senha') ||
                           pathname.includes('/reset-password') ||
                           pathname.includes('/redefinir-senha');

    if (isPasswordRoute) {
      devLog.log(`[Middleware] Rota de senha permitida no domínio principal: ${pathname}`);
      return response;
    }

    // ✅ SEGURANÇA: Bloquear acesso APENAS às rotas de LOGIN no domínio principal
    // Rotas de login requerem subdomínio tenant específico
    if (pathname === '/admin/login' || pathname === '/cliente/login' ||
        pathname.startsWith('/admin/') || pathname.startsWith('/cliente/')) {
      devLog.log(`[Middleware] Tentativa de acesso a área restrita no domínio www - BLOQUEADO: ${pathname}`);
      return NextResponse.redirect(new URL('/wrong-domain', request.url));
    }

    return response;
  }

  // 7. DOMÍNIO API DEDICADO - WEBHOOKS E INTEGRAÇÕES (antes de tenant detection!)
  if (hostname === 'api.gerenciamentofotovoltaico.com.br') {
    devLog.log(`[Middleware] Domínio API detectado: ${hostname}${pathname}`);

    // Domínio API dedicado - não tem tenant
    // Usado para webhooks (Stripe, etc) e integrações externas
    // APIs resolvem contexto através de metadata nos payloads
    return response;
  }

  // 8. REGISTRO SITE - IDENTIFICAR SITE DE REGISTRO
  if (hostname.includes('registro.gerenciamentofotovoltaico.com.br')) {
    devLog.log(`[Middleware] Site de registro detectado: ${hostname}`);

    // Definir header para identificar como site de registro
    requestHeaders.set('x-is-registro-site', 'true');

    response = NextResponse.next({
      request: { headers: requestHeaders }
    });

    response.headers.set('x-is-registro-site', 'true');
    return response;
  }

  // 9. DOMÍNIO CUSTOMIZADO - Colmeia Solar (app.colmeiasolar.com)
  if (hostname === 'app.colmeiasolar.com') {
    const tenantId = '061ff77b-8b3a-4732-9158-a574c1f1690a';
    const tenantSlug = 'solar-tech';
    const tenantName = 'Colmeia Solar';

    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-slug', tenantSlug);
    requestHeaders.set('x-tenant-name', tenantName);
    requestHeaders.set('x-tenant-trial', 'false');

    response = NextResponse.next({ request: { headers: requestHeaders } });

    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-tenant-name', tenantName);
    response.headers.set('x-tenant-trial', 'false');
  }

  // 10. TENANT DETECTION - SUPORTE A TODOS OS NOVOS TENANTS
  else if (hostname.includes('goias-solar.gerenciamentofotovoltaico.com.br')) {
    devLog.log(`[Middleware] Goias Solar tenant detected`);

    // Headers fixos para goias-solar
    const tenantId = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c';
    const tenantSlug = 'goias-solar';
    const tenantName = 'Goiás Solar';

    requestHeaders.set('x-tenant-id', tenantId);
    requestHeaders.set('x-tenant-slug', tenantSlug);
    requestHeaders.set('x-tenant-name', tenantName);
    requestHeaders.set('x-tenant-trial', 'true');

    response = NextResponse.next({
      request: { headers: requestHeaders }
    });

    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-tenant-slug', tenantSlug);
    response.headers.set('x-tenant-name', tenantName);
    response.headers.set('x-tenant-trial', 'true');
  }
  // 10. NOVOS TENANTS - Verificar se existe no banco antes de assumir como temporário
  else if (hostname.includes('.gerenciamentofotovoltaico.com.br') &&
           !hostname.includes('registro.gerenciamentofotovoltaico.com.br') &&
           hostname !== 'gerenciamentofotovoltaico.com.br') {

    // Extrair slug do hostname (ex: "bns" de "bns.gerenciamentofotovoltaico.com.br")
    const parts = hostname.split('.');
    const slug = parts[0];

    devLog.log(`[Middleware] Verificando tenant: ${slug}`);

    try {
      // Verificar se tenant existe no banco
      const { checkTenantExists } = await import('@/lib/utils/tenant-client');
      const tenantCheck = await checkTenantExists(slug);

      if (tenantCheck.exists) {
        devLog.log(`[Middleware] Tenant existente encontrado: ${slug} (ID: ${tenantCheck.tenantId}, Status: ${tenantCheck.status})`);

        // Verificar status da tenant antes de permitir acesso
        const tenantStatus = tenantCheck.status;

        // Tenant cancelada (campo status) - redirecionar para página de conta encerrada
        if (tenantStatus === 'canceled') {
          devLog.log(`[Middleware] Tenant cancelada: ${slug} - redirecionando para /account-canceled`);
          return NextResponse.redirect(new URL('/account-canceled', request.url));
        }

        // Assinatura cancelada via Stripe (subscription_status) - mesmo redirecionamento
        if (tenantCheck.subscriptionStatus === 'canceled') {
          devLog.log(`[Middleware] Assinatura cancelada: ${slug} - redirecionando para /account-canceled`);
          return NextResponse.redirect(new URL('/account-canceled', request.url));
        }

        // Tenant suspensa por billing - redirecionar para página de bloqueio de cobrança
        if (tenantCheck.subscriptionStatus === 'suspended') {
          devLog.log(`[Middleware] Tenant suspensa por billing: ${slug} - redirecionando para /admin/bloqueio`);
          return NextResponse.redirect(new URL('/admin/bloqueio', request.url));
        }

        // Tenant suspensa administrativamente - redirecionar para página de conta suspensa
        if (tenantStatus === 'suspended') {
          devLog.log(`[Middleware] Tenant suspensa: ${slug} - redirecionando para /account-suspended`);
          return NextResponse.redirect(new URL('/account-suspended', request.url));
        }

        // Tenant pendente - permitir acesso (ainda está configurando)
        // Tenant ativa - permitir acesso normal

        // REDIRECIONAMENTO INTELIGENTE: Raiz da tenant → Login apropriado
        if (pathname === '/') {
          devLog.log(`[Middleware] Raiz da tenant acessada, redirecionando para /cliente/login`);
          return NextResponse.redirect(new URL('/cliente/login', request.url));
        }

        // Se acessar /admin sem /login, redirecionar para /admin/login
        if (pathname === '/admin') {
          devLog.log(`[Middleware] /admin acessado, redirecionando para /admin/login`);
          return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // Se acessar /cliente sem /login, redirecionar para /cliente/login
        if (pathname === '/cliente') {
          devLog.log(`[Middleware] /cliente acessado, redirecionando para /cliente/login`);
          return NextResponse.redirect(new URL('/cliente/login', request.url));
        }

        // Usar dados reais do banco (sanitizar nome para headers)
        const originalName = tenantCheck.tenantName!;
        const sanitizedTenantName = sanitizeHeaderValue(originalName);
        devLog.log(`[Middleware] Sanitizing tenant name: "${originalName}" -> "${sanitizedTenantName}"`);

        requestHeaders.set('x-tenant-id', tenantCheck.tenantId!);
        requestHeaders.set('x-tenant-slug', slug);
        requestHeaders.set('x-tenant-name', sanitizedTenantName);
        requestHeaders.set('x-tenant-trial', 'true');

        response = NextResponse.next({
          request: { headers: requestHeaders }
        });

        response.headers.set('x-tenant-id', tenantCheck.tenantId!);
        response.headers.set('x-tenant-slug', slug);
        response.headers.set('x-tenant-name', sanitizedTenantName);
        response.headers.set('x-tenant-trial', 'true');
      } else {
        // Tenant não existe no banco - redirecionar para página não encontrada
        devLog.log(`[Middleware] Tenant não encontrado: ${slug} - redirecionando para /tenant-not-found`);
        return NextResponse.redirect(new URL('/tenant-not-found', request.url));
      }
    } catch (error: any) {
      devLog.error(`[Middleware] Erro ao verificar tenant ${slug}:`, error.message);
      devLog.error(`[Middleware] Stack trace:`, error.stack);

      // Se houve erro na verificação, redirecionar para página de erro
      // (não criar tenant temporário que pode mascarar problemas)
      return NextResponse.redirect(new URL('/tenant-not-found', request.url));
    }
  }

  return response;
}

async function emergencyCore(request: NextRequest) {
  devLog.log('[Middleware] EMERGENCY MODE ACTIVE');
  
  const response = NextResponse.next();
  response.headers.set('x-middleware-emergency', 'true');
  return response;
}

function createUltimateEmergencyResponse() {
  devLog.error('[Middleware] ULTIMATE EMERGENCY - LAST RESORT');
  
  return new NextResponse(null, {
    status: 200,
    headers: {
      'x-middleware-ultimate-emergency': 'true'
    }
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};