import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * API SUPER SIMPLES para testar se o problema é no middleware ou nas APIs
 * GET /api/debug/simple-health
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      hostname: headersList.get('host'),
      middleware: {
        'x-tenant-id': headersList.get('x-tenant-id'),
        'x-tenant-slug': headersList.get('x-tenant-slug'),
        'x-tenant-name': headersList.get('x-tenant-name'),
        'x-tenant-trial': headersList.get('x-tenant-trial'),
        'x-middleware-error': headersList.get('x-middleware-error')
      },
      message: 'API funcionando normalmente'
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}