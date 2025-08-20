import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';
import { devLog } from '@/lib/utils/productionLogger';

export async function middleware(request: NextRequest) {
  // ✅ CORRIGIDO: Evitar problemas durante build
  if (isBuildTime() && request.nextUrl.pathname.startsWith('/api/')) {
    return createBuildTimeResponse(request.nextUrl.pathname);
  }

  // 1. Inicializa a resposta, copiando os headers da requisição original
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  });

  // 2. Adicionar cabeçalhos de segurança a TODAS as respostas
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const { pathname } = request.nextUrl;

  // 3. Configurar CORS para requisições da API
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      const preflightResponse = new NextResponse(null, { status: 204 });
      response.headers.forEach((value, key) => {
        preflightResponse.headers.set(key, value);
      });
      return preflightResponse;
    }
  }

  // 4. Criar cliente Supabase para o contexto do middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete({ name, ...options });
        },
      },
    }
  );

  // 5. Tenta obter a sessão do usuário
  await supabase.auth.getSession();

  // 6. Obter dados do usuário para lógica de proteção de rotas
  const { data: { user } } = await supabase.auth.getUser();
  
  // ✅ PRODUÇÃO - Buscar role e status de bloqueio do usuário da tabela users se ele estiver autenticado
  let userRole = null;
  let isBlocked = false;
  if (user) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('role, is_blocked')
        .eq('id', user.id)
        .single();
      
      userRole = userData?.role;
      isBlocked = userData?.is_blocked || false;
    } catch (error) {
      devLog.error(`[Middleware] Erro ao buscar dados do usuário:`, error);
    }
  }

  // Debug logs para nova-senha routes
  if (pathname.includes('nova-senha')) {
    devLog.log(`[Middleware] 🔍 DEBUG nova-senha route:`, {
      pathname,
      hasUser: !!user,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
  }

  // 7. Lógica de Proteção de Rotas
  const adminLoginPath = '/admin/login';
  const adminRegisterPath = '';
  const adminDashboardPath = '/admin/painel';

  const clientLoginPath = '/cliente/login';
  const clientRegisterPath = '/cliente/cadastro';
  const clientRecuperarSenhaPath = '/cliente/recuperar-senha';
  const clientNovaSenhaPath = '/cliente/nova-senha';
  const clientNovaSenhaDebugPath = '/cliente/nova-senha-debug';
  const clientDashboardPath = '/cliente/painel';
  const clientBloqueadoPath = '/cliente/bloqueado';

  // ✅ VERIFICAÇÃO ESPECIAL: Permitir acesso à página de login com parâmetros de recuperação
  if (pathname === clientLoginPath && !user) {
    const url = new URL(request.url);
    const tokenHash = url.searchParams.get('token_hash');
    const type = url.searchParams.get('type');
    
    if (tokenHash && type === 'recovery') {
      devLog.log(`[Middleware] ✅ Allowing password reset flow: ${pathname} with token_hash`);
      return response; // Permitir acesso direto sem redirecionamentos
    }
  }

  // Rotas de autenticação que usuários logados não deveriam acessar
  const adminAuthRoutes = [adminLoginPath, adminRegisterPath].filter(Boolean).map(p => p.toString());
  const clientAuthRoutes = [clientLoginPath, clientRegisterPath, clientRecuperarSenhaPath, clientNovaSenhaPath, clientNovaSenhaDebugPath].filter(Boolean).map(p => p.toString());

  // Debug logs para nova-senha routes - verificação de arrays
  if (pathname.includes('nova-senha')) {
    devLog.log(`[Middleware] 🔍 DEBUG clientAuthRoutes:`, {
      clientAuthRoutes,
      isIncluded: clientAuthRoutes.includes(pathname),
      pathname
    });
  }

  if (user) {
    // ✅ PRODUÇÃO - Verificar se usuário está bloqueado (exceto admins)
    if (isBlocked && userRole !== 'admin' && userRole !== 'superadmin') {
      // Permitir acesso apenas à página de bloqueio, logout e rotas de autenticação
      const allowedBlockedRoutes = [clientBloqueadoPath, clientLoginPath, '/api/auth/signout', '/api/user/block-status'];
      const isAllowedRoute = allowedBlockedRoutes.some(route => pathname.startsWith(route));
      
      if (!isAllowedRoute) {
        devLog.log(`[Middleware] ↩️ Redirecting blocked user to blocked page: ${pathname} -> ${clientBloqueadoPath}`);
        return NextResponse.redirect(new URL(clientBloqueadoPath, request.url));
      }
    }

    // ✅ PRODUÇÃO - Verificar se é admin tentando acessar área administrativa
    if (pathname === adminLoginPath || (adminRegisterPath && pathname === adminRegisterPath)) {
      if (userRole === 'admin' || userRole === 'superadmin') {
        devLog.log(`[Middleware] ↩️ Redirecting authenticated admin from auth page: ${pathname} -> ${adminDashboardPath}`);
        return NextResponse.redirect(new URL(adminDashboardPath, request.url));
      } else {
        // Se não é admin mas está bloqueado, redirecionar para página de bloqueio
        if (isBlocked) {
          devLog.log(`[Middleware] ↩️ Redirecting blocked user to blocked page: ${pathname} -> ${clientBloqueadoPath}`);
          return NextResponse.redirect(new URL(clientBloqueadoPath, request.url));
        }
        devLog.log(`[Middleware] ↩️ Non-admin user trying to access admin area, redirecting to client area: ${pathname} -> ${clientDashboardPath}`);
        return NextResponse.redirect(new URL(clientDashboardPath, request.url));
      }
    }
    
    // ✅ PRODUÇÃO - Verificar se usuário não-admin está tentando acessar área administrativa
    if (pathname.startsWith('/admin/') && !adminAuthRoutes.includes(pathname)) {
      if (userRole !== 'admin' && userRole !== 'superadmin') {
        devLog.log(`[Middleware] ↩️ Non-admin user trying to access admin route: ${pathname} -> ${clientDashboardPath}`);
        return NextResponse.redirect(new URL(clientDashboardPath, request.url));
      }
    }
    
    if (pathname === clientLoginPath || pathname === clientRegisterPath || pathname === clientRecuperarSenhaPath) {
      // Se usuário está bloqueado, redirecionar para página de bloqueio
      if (isBlocked && userRole !== 'admin' && userRole !== 'superadmin') {
        devLog.log(`[Middleware] ↩️ Redirecting blocked user from auth page to blocked page: ${pathname} -> ${clientBloqueadoPath}`);
        return NextResponse.redirect(new URL(clientBloqueadoPath, request.url));
      }
      devLog.log(`[Middleware] ↩️ Redirecting authenticated user from client auth page: ${pathname} -> ${clientDashboardPath}`);
      return NextResponse.redirect(new URL(clientDashboardPath, request.url));
    }
  } else {
    // Usuário não logado
    if (pathname.startsWith('/admin/') && !adminAuthRoutes.includes(pathname)) {
      devLog.log(`[Middleware] ↩️ Redirecting unauthenticated user from admin route: ${pathname} -> ${adminLoginPath}`);
      return NextResponse.redirect(new URL(adminLoginPath, request.url));
    }
    if (pathname.startsWith('/cliente/') && !clientAuthRoutes.includes(pathname)) {
      devLog.log(`[Middleware] ↩️ Redirecting unauthenticated user from client route: ${pathname} -> ${clientLoginPath}`);
      devLog.log(`[Middleware] 🔍 Debug redirect decision:`, {
        pathname,
        startsWithCliente: pathname.startsWith('/cliente/'),
        clientAuthRoutes,
        isIncluded: clientAuthRoutes.includes(pathname),
        willRedirect: !clientAuthRoutes.includes(pathname)
      });
      return NextResponse.redirect(new URL(clientLoginPath, request.url));
    }
  }

  // Debug log quando não há redirecionamento
  if (pathname.includes('nova-senha')) {
    devLog.log(`[Middleware] ✅ No redirect for nova-senha route: ${pathname}`);
  }

  // 8. Retornar a resposta
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};