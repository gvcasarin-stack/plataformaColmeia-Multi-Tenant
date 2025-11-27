/**
 * API para buscar o slug do tenant do usuário
 * GET /api/user/tenant-slug
 *
 * Usado após definição de senha para redirecionar ao domínio correto
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Tenant Slug] Iniciando busca de slug do tenant');

    // Obter token de autorização do header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      devLog.error('[API Tenant Slug] Token de autorização não fornecido');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Usar Service Role para validar token e buscar dados
    const supabaseAdmin = createSupabaseServiceRoleClient();

    // Validar token e obter usuário
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      devLog.error('[API Tenant Slug] Token inválido:', authError);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    devLog.log('[API Tenant Slug] Usuário autenticado:', user.id);

    // Buscar tenant_id do usuário
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.tenant_id) {
      devLog.error('[API Tenant Slug] Erro ao buscar tenant_id:', userError);
      return NextResponse.json(
        { error: 'Tenant não encontrado para o usuário' },
        { status: 404 }
      );
    }

    devLog.log('[API Tenant Slug] Tenant ID encontrado:', userData.tenant_id);

    // Buscar slug da organização
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('slug')
      .eq('id', userData.tenant_id)
      .single();

    if (orgError || !orgData?.slug) {
      devLog.error('[API Tenant Slug] Erro ao buscar slug:', orgError);
      return NextResponse.json(
        { error: 'Slug não encontrado para a organização' },
        { status: 404 }
      );
    }

    devLog.log('[API Tenant Slug] Slug encontrado:', orgData.slug);

    return NextResponse.json({
      success: true,
      slug: orgData.slug
    });

  } catch (error: any) {
    devLog.error('[API Tenant Slug] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
