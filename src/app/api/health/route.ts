// 🚀 API de Health Check - FASE 2
// Endpoint para verificar saúde do sistema

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * 🏥 Health Check Endpoint
 * 
 * GET /api/health - Verifica saúde básica do sistema
 * HEAD /api/health - Ping rápido para conectividade
 */

export async function GET(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    logger.debug('Health check API called', {}, 'HealthAPI');

    // Verificações básicas
    const checks = {
      api: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };

    // Teste básico de conectividade com Supabase (apenas se servidor)
    try {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.from('users').select('id').limit(1);
      checks.database = !error;
    } catch (dbError) {
      checks.database = false;
      logger.warn('Database health check failed', { error: dbError.message }, 'HealthAPI');
    }

    const responseTime = performance.now() - startTime;
    
    logger.api.response('/api/health', 200, responseTime, { 
      database: checks.database,
      checks: Object.keys(checks).length 
    });

    return NextResponse.json({
      status: 'healthy',
      ...checks,
      responseTime: Number(responseTime.toFixed(2))
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    const responseTime = performance.now() - startTime;
    
    logger.error('Health check API failed', { 
      error: error.message, 
      responseTime 
    }, 'HealthAPI');

    logger.api.response('/api/health', 500, responseTime, { 
      error: error.message 
    });

    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      responseTime: Number(responseTime.toFixed(2))
    }, { status: 500 });
  }
}

export async function HEAD(request: NextRequest) {
  // Ping rápido para verificar se a API está respondendo
  const startTime = performance.now();
  
  try {
    const responseTime = performance.now() - startTime;
    
    logger.debug('Health ping received', { responseTime }, 'HealthAPI');
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Response-Time': responseTime.toString()
      }
    });

  } catch (error) {
    logger.error('Health ping failed', { error: error.message }, 'HealthAPI');
    return new NextResponse(null, { status: 500 });
  }
} 