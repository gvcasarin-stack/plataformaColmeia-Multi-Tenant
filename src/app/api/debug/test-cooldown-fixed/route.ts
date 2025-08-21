import { NextRequest, NextResponse } from 'next/server';

// TEMPORARIAMENTE DESABILITADO - Função verify_email_cooldown_status não existe no banco multi-tenant
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'API temporariamente desabilitada - função verify_email_cooldown_status não existe no banco multi-tenant',
    status: 'disabled',
    note: 'Esta função será reimplementada quando necessário no contexto multi-tenant'
  });
}