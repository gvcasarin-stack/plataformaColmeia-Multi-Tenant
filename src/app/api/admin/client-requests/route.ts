import { NextRequest } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import {
  createApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";

/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * Esta API precisa ser migrada do Firebase para Supabase
 * 
 * Get Client Requests - STUB TEMPORÁRIO
 * 
 * @route GET /api/admin/client-requests
 */
export async function GET(request: NextRequest) {
  devLog.warn('[API] client-requests: STUB - TODO: migrar para Supabase');
  
  return createApiError(
    'API em migração para Supabase - funcionalidade temporariamente indisponível',
    ApiErrorCode.SERVICE_UNAVAILABLE,
    503
  );
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