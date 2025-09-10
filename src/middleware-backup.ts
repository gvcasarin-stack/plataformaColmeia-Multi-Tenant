// BACKUP DO MIDDLEWARE ATUAL ANTES DA CORREÇÃO
// Este arquivo serve como backup caso precise reverter
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
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