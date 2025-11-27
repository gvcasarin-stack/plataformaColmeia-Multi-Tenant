import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

/**
 * API DE PREFERÊNCIAS DO USUÁRIO - MULTI-TENANT SEGURA
 * Gerencia preferências personalizadas de cada usuário por tenant
 */

/**
 * GET - Buscar preferência do usuário (SEGURO)
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Preferences] Buscando preferência do usuário');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Preferences] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const preferenceKey = searchParams.get('preference_key');

    if (!userId || !preferenceKey) {
      return NextResponse.json(
        { error: 'user_id e preference_key são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar apenas preferências do usuário no tenant atual
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('preference_key', preferenceKey)
      .maybeSingle();

    if (error) {
      devLog.error('[API Preferences] Erro ao buscar preferência:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar preferência', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || null
    });

  } catch (error) {
    devLog.error('[API Preferences] Exceção ao buscar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * POST - Salvar/Atualizar preferência do usuário (UPSERT)
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API Preferences] Salvando preferência do usuário');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Preferences] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { user_id, preference_key, preference_value } = body;

    if (!user_id || !preference_key || preference_value === undefined) {
      return NextResponse.json(
        { error: 'user_id, preference_key e preference_value são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ UPSERT: Inserir ou atualizar se já existir
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id,
          tenant_id: tenantId,
          preference_key,
          preference_value,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,tenant_id,preference_key',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      devLog.error('[API Preferences] Erro ao salvar preferência:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar preferência', details: error.message },
        { status: 500 }
      );
    }

    devLog.log('[API Preferences] Preferência salva:', {
      user_id,
      tenant_id: tenantId,
      preference_key
    });

    return NextResponse.json({
      success: true,
      data,
      message: 'Preferência salva com sucesso'
    });

  } catch (error) {
    devLog.error('[API Preferences] Exceção ao salvar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Deletar preferência do usuário (SEGURO)
 */
export async function DELETE(request: NextRequest) {
  try {
    devLog.log('[API Preferences] Deletando preferência do usuário');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Preferences] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const preferenceKey = searchParams.get('preference_key');

    if (!userId || !preferenceKey) {
      return NextResponse.json(
        { error: 'user_id e preference_key são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Deletar apenas preferências do usuário no tenant atual
    const { error } = await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('preference_key', preferenceKey);

    if (error) {
      devLog.error('[API Preferences] Erro ao deletar preferência:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar preferência', details: error.message },
        { status: 500 }
      );
    }

    devLog.log('[API Preferences] Preferência deletada:', {
      user_id: userId,
      tenant_id: tenantId,
      preference_key: preferenceKey
    });

    return NextResponse.json({
      success: true,
      message: 'Preferência deletada com sucesso'
    });

  } catch (error) {
    devLog.error('[API Preferences] Exceção ao deletar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
