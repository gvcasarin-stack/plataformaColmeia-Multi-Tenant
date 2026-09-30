import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

// Mapeia o nome da preferência (usado no front-end) para a chave dentro de
// settings.notifications — mesmas chaves que GET /api/user/profile já lê.
const NOTIFICATIONS_FIELD_MAP: Record<string, string> = {
  emailNotifications: 'email',
  whatsappNotifications: 'whatsapp',
  emailNotificacaoStatus: 'project_updates',
  emailNotificacaoDocumentos: 'document_updates',
  emailNotificacaoComentarios: 'comment_updates',
};

/**
 * API para atualizar uma preferência de notificação do usuário
 * POST /api/user/profile/notifications
 *
 * Usa o cliente Service Role (como GET /api/user/profile e POST
 * /api/user/profile/update) em vez do cliente do navegador — o acesso direto
 * à tabela `users` pelo cliente anônimo é bloqueado pelo RLS.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, preference, value } = await request.json();

    if (!userId || typeof preference !== 'string' || typeof value !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'userId, preference e value (boolean) são obrigatórios' },
        { status: 400 }
      );
    }

    const notificationsField = NOTIFICATIONS_FIELD_MAP[preference];
    if (!notificationsField) {
      return NextResponse.json(
        { success: false, error: `Preferência inválida: ${preference}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single();

    if (fetchError || !currentUser) {
      devLog.error('[API user/profile/notifications] Erro ao buscar usuário:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    let settings: Record<string, any> = {};
    try {
      if (currentUser.settings) {
        settings = typeof currentUser.settings === 'string' ? JSON.parse(currentUser.settings) : currentUser.settings;
      }
    } catch {
      settings = {};
    }

    const updatedSettings = {
      ...settings,
      notifications: {
        ...(settings.notifications || {}),
        [notificationsField]: value,
      },
    };

    const { error: updateError } = await supabase
      .from('users')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      devLog.error('[API user/profile/notifications] Erro ao atualizar preferência:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erro ao atualizar preferência' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    devLog.error('[API user/profile/notifications] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar preferência' },
      { status: 500 }
    );
  }
}
