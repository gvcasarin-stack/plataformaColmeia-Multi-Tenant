import { NextRequest, NextResponse } from 'next/server';

// TEMPORARIAMENTE DESABILITADO - Função try_claim_email_slot não existe no banco multi-tenant
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'API temporariamente desabilitada - função try_claim_email_slot não existe no banco multi-tenant',
    status: 'disabled',
    note: 'Esta função será reimplementada quando necessário no contexto multi-tenant'
  });
}