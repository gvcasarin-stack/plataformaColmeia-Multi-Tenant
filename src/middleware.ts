import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MIDDLEWARE FINAL FUNCIONANDO
 * Problema resolvido: acentos em headers causavam MIDDLEWARE_INVOCATION_FAILED
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Headers de segurança básicos
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  
  // CORS para APIs
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
  }
  
  // Configurar headers do tenant para goias-solar
  if (hostname.includes('goias-solar')) {
    response.headers.set('x-tenant-id', '5790d7a1-1c54-4fa8-b509-db766ca6bc3c');
    response.headers.set('x-tenant-slug', 'goias-solar');
    response.headers.set('x-tenant-name', 'Goias Solar'); // SEM acento!
    response.headers.set('x-tenant-trial', 'true');
  }
  
  // Configurar headers do tenant para suprema-solar (Luan)
  if (hostname.includes('suprema')) {
    response.headers.set('x-tenant-id', '3e446dd9-44d2-4e22-ae7e-edbac10edf73');
    response.headers.set('x-tenant-slug', 'suprema-solar');
    response.headers.set('x-tenant-name', 'Suprema Solar'); // SEM acento!
    response.headers.set('x-tenant-trial', 'true');
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};