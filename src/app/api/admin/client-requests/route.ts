import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * Esta API precisa ser migrada do Firebase para Supabase
 * 
 * Get Client Requests - STUB TEMPORÁRIO
 * 
 * @route GET /api/admin/client-requests
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Precheck de ambiente para evitar 500 em produção
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] client-requests GET sem env de Supabase; retornando []');
      return NextResponse.json({ success: true, data: [] });
    }
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, phone, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('role', 'client')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      devLog.warn('[API] client-requests GET falhou (retornando vazio):', error);
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    devLog.warn('[API] client-requests GET exceção (retornando vazio):', err);
    return NextResponse.json({ success: true, data: [] });
  }
}

/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * Approve Client Request - STUB TEMPORÁRIO
 * 
 * @route POST /api/admin/client-requests
 */
export async function POST(request: NextRequest) {
  devLog.warn('[API] client-requests POST: STUB - TODO: migrar para Supabase');
  
  return createApiError(
    'API em migração para Supabase - funcionalidade temporariamente indisponível',
    ApiErrorCode.SERVICE_UNAVAILABLE,
    503
  );
}