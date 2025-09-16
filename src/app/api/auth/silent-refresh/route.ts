/**
 * API para Silent Refresh - Renovar tokens sem interromper UX
 * Padrão usado por SaaS comerciais como GitHub, Vercel, AWS
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    devLog.log('[Silent Refresh] Iniciando renovação de sessão');

    // Tentar obter sessão atual do Supabase
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    // Extrair token do header
    const token = authHeader.replace('Bearer ', '');

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se token ainda é válido (ou próximo de expirar)
    try {
      // Tentar renovar sessão com token atual
      const { data: session, error } = await supabase.auth.getUser(token);

      if (error || !session.user) {
        devLog.warn('[Silent Refresh] Token inválido ou expirado');
        return NextResponse.json(
          { error: 'Sessão expirada', requiresReauth: true },
          { status: 401 }
        );
      }

      // Token ainda válido - retornar novo token com validade estendida
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: token
      });

      if (refreshError || !refreshedSession.session) {
        devLog.error('[Silent Refresh] Erro ao renovar sessão:', refreshError);
        return NextResponse.json(
          { error: 'Falha na renovação', requiresReauth: true },
          { status: 401 }
        );
      }

      devLog.log('[Silent Refresh] Sessão renovada com sucesso');

      return NextResponse.json({
        success: true,
        access_token: refreshedSession.session.access_token,
        refresh_token: refreshedSession.session.refresh_token,
        expires_at: refreshedSession.session.expires_at,
        user: refreshedSession.session.user
      });

    } catch (tokenError) {
      devLog.error('[Silent Refresh] Erro ao processar token:', tokenError);
      return NextResponse.json(
        { error: 'Token malformado', requiresReauth: true },
        { status: 401 }
      );
    }

  } catch (error: any) {
    devLog.error('[Silent Refresh] Erro interno:', error);
    return NextResponse.json(
      {
        error: 'Erro interno do servidor',
        details: error.message,
        requiresReauth: true
      },
      { status: 500 }
    );
  }
}