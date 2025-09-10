import { type NextRequest, NextResponse } from 'next/server';

/**
 * MIDDLEWARE SUPER MINIMALISTA - FOCO EM NUNCA FALHAR
 * Remove TODAS as dependências que podem causar problemas
 */
export async function middleware(request: NextRequest) {
  // ✅ TRIPLE SAFETY WRAPPER
  try {
    return await safeCore(request);
  } catch (error1: any) {
    console.error('[Middleware] ERRO NIVEL 1:', error1.message);
    try {
      return await emergencyCore(request);
    } catch (error2: any) {
      console.error('[Middleware] ERRO NIVEL 2:', error2.message);
      return createUltimateEmergencyResponse();
    }
  }
}

async function safeCore(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  console.log(`[Middleware] Processing: ${hostname}${pathname}`);
  
  // 1. Resposta básica
  let requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({
    request: { headers: requestHeaders }
  });

  // 2. Headers de segurança básicos
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');

  // 3. Assets estáticos
  if (pathname.includes('favicon') || pathname.includes('.ico') || pathname.includes('.png')) {
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

  // 5. ADMIN BYPASS
  if (pathname.startsWith('/admin')) {
    console.log(`[Middleware] Admin bypass: ${pathname}`);
    return response;
  }

  // 6. TENANT DETECTION - SUPER SIMPLES
  if (hostname.includes('goias-solar.gerenciamentofotovoltaico.com.br')) {
    console.log(`[Middleware] Goias Solar tenant detected`);
    
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

  return response;
}

async function emergencyCore(request: NextRequest) {
  console.log('[Middleware] EMERGENCY MODE ACTIVE');
  
  const response = NextResponse.next();
  response.headers.set('x-middleware-emergency', 'true');
  return response;
}

function createUltimateEmergencyResponse() {
  console.error('[Middleware] ULTIMATE EMERGENCY - LAST RESORT');
  
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