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
 * Get Upload Token - STUB TEMPORÁRIO
 * 
 * @route GET /api/storage/get-upload-token
 */
export async function GET(request: NextRequest) {
  devLog.warn('[API] storage/get-upload-token: STUB - TODO: migrar para Supabase');
  
  return createApiError(
    'API em migração para Supabase - funcionalidade temporariamente indisponível',
    ApiErrorCode.SERVICE_UNAVAILABLE,
    503
  );
}