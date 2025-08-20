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
 * Upload File - STUB TEMPORÁRIO
 * 
 * @route POST /api/projects/upload-file
 */
export async function POST(request: NextRequest) {
  devLog.warn('[API] projects/upload-file: STUB - TODO: migrar para Supabase');
  
      return createApiError(
    'API em migração para Supabase - funcionalidade temporariamente indisponível',
    ApiErrorCode.SERVICE_UNAVAILABLE,
    503
  );
} 