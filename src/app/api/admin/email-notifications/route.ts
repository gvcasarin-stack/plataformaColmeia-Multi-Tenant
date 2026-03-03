import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

/**
 * API DE PREFERÊNCIAS DE NOTIFICAÇÕES POR E-MAIL
 * Gerencia as preferências de notificações de email do administrador
 */

/**
 * GET - Buscar preferências de notificação do usuário
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Email Notifications] Buscando preferências de notificação');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Email Notifications] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar preferências de notificação do usuário
    const { data, error } = await supabase
      .from('user_preferences')
      .select('notify_project_created, notify_status_change, notify_document_added, notify_comment_added')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      devLog.error('[API Email Notifications] Erro ao buscar preferências:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar preferências', details: error.message },
        { status: 500 }
      );
    }

    // Se não existir registro, retornar valores padrão (todos true)
    const preferences = data || {
      notify_project_created: true,
      notify_status_change: true,
      notify_document_added: true,
      notify_comment_added: true
    };

    return NextResponse.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    devLog.error('[API Email Notifications] Exceção ao buscar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Atualizar preferências de notificação do usuário
 */
export async function PATCH(request: NextRequest) {
  try {
    devLog.log('[API Email Notifications] Atualizando preferências de notificação');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Email Notifications] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, notify_project_created, notify_status_change, notify_document_added, notify_comment_added } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }

    // Validar que pelo menos uma preferência foi fornecida
    if (
      notify_project_created === undefined &&
      notify_status_change === undefined &&
      notify_document_added === undefined &&
      notify_comment_added === undefined
    ) {
      return NextResponse.json(
        { error: 'Pelo menos uma preferência deve ser fornecida' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se já existe um registro para este usuário
    const { data: existingRecord } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user_id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    let result;

    if (existingRecord) {
      // Atualizar registro existente
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (notify_project_created !== undefined) updateData.notify_project_created = notify_project_created;
      if (notify_status_change !== undefined) updateData.notify_status_change = notify_status_change;
      if (notify_document_added !== undefined) updateData.notify_document_added = notify_document_added;
      if (notify_comment_added !== undefined) updateData.notify_comment_added = notify_comment_added;

      const { data, error } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user_id)
        .eq('tenant_id', tenantId)
        .select('notify_project_created, notify_status_change, notify_document_added, notify_comment_added')
        .single();

      if (error) {
        devLog.error('[API Email Notifications] Erro ao atualizar preferências:', error);
        return NextResponse.json(
          { error: 'Erro ao atualizar preferências', details: error.message },
          { status: 500 }
        );
      }

      result = data;
    } else {
      // Criar novo registro
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id,
          tenant_id: tenantId,
          notify_project_created: notify_project_created ?? true,
          notify_status_change: notify_status_change ?? true,
          notify_document_added: notify_document_added ?? true,
          notify_comment_added: notify_comment_added ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('notify_project_created, notify_status_change, notify_document_added, notify_comment_added')
        .single();

      if (error) {
        devLog.error('[API Email Notifications] Erro ao criar preferências:', error);
        return NextResponse.json(
          { error: 'Erro ao criar preferências', details: error.message },
          { status: 500 }
        );
      }

      result = data;
    }

    devLog.log('[API Email Notifications] Preferências atualizadas:', {
      user_id,
      tenant_id: tenantId
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Preferências atualizadas com sucesso'
    });

  } catch (error) {
    devLog.error('[API Email Notifications] Exceção ao atualizar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
