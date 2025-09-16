import { NextRequest, NextResponse } from 'next/server';

/**
 * API ULTRA SIMPLES PARA TESTAR MIDDLEWARE
 * SEM NENHUMA DEPENDÊNCIA EXTERNA
 * GET /api/debug/middleware-test
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      message: 'API funcionando - middleware não crashou',
      headers: {
        'x-tenant-id': request.headers.get('x-tenant-id'),
        'x-tenant-slug': request.headers.get('x-tenant-slug'), 
        'x-tenant-name': request.headers.get('x-tenant-name'),
        'x-tenant-trial': request.headers.get('x-tenant-trial'),
        'x-middleware-emergency': request.headers.get('x-middleware-emergency'),
        'x-middleware-ultimate-emergency': request.headers.get('x-middleware-ultimate-emergency'),
        'host': request.headers.get('host')
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}