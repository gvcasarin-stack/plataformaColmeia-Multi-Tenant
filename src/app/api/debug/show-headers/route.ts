import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

/**
 * API simples para mostrar todos os headers recebidos
 * GET /api/debug/show-headers
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    
    // Converter todos os headers para um objeto
    const allHeaders: { [key: string]: string | null } = {};
    
    // Headers específicos que nos interessam
    const importantHeaders = [
      'host',
      'x-tenant-id',
      'x-tenant-slug', 
      'x-tenant-name',
      'x-tenant-trial',
      'x-middleware-error',
      'x-middleware-critical-error',
      'user-agent',
      'accept'
    ];
    
    importantHeaders.forEach(header => {
      allHeaders[header] = headersList.get(header);
    });
    
    // Tentar extrair slug do hostname
    const hostname = headersList.get('host') || '';
    const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && 
                       !hostname.includes('www.') && 
                       !hostname.includes('registro.');
    const extractedSlug = isSubdomain ? hostname.split('.')[0] : null;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      hostname,
      isSubdomain,
      extractedSlug,
      headers: allHeaders,
      analysis: {
        middlewareExecuted: !!allHeaders['x-tenant-slug'] || !!allHeaders['x-middleware-error'],
        tenantResolved: !!allHeaders['x-tenant-id'],
        hasError: !!allHeaders['x-middleware-error']
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Erro no show-headers',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}