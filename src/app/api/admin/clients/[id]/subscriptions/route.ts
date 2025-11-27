import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * GET /api/admin/clients/[id]/subscriptions
 * Busca todas as assinaturas (ativas, canceladas, expiradas) de um cliente específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    devLog.log('[API /admin/clients/[id]/subscriptions] GET - Cliente:', clientId);

    const supabase = createSupabaseServerClient();

    // 1. Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      devLog.error('[API /admin/clients/[id]/subscriptions] Erro de autenticação:', authError);
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // 2. Buscar perfil do usuário autenticado
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      devLog.error('[API /admin/clients/[id]/subscriptions] Erro ao buscar perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      );
    }

    // 3. Verificar permissão (admin ou superadmin)
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      devLog.warn('[API /admin/clients/[id]/subscriptions] Acesso negado - Role:', profile.role);
      return NextResponse.json(
        { success: false, error: 'Permissão negada' },
        { status: 403 }
      );
    }

    // 4. Verificar se o cliente pertence ao mesmo tenant
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, tenant_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      devLog.error('[API /admin/clients/[id]/subscriptions] Cliente não encontrado:', clientError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (clientData.tenant_id !== profile.tenant_id) {
      devLog.warn('[API /admin/clients/[id]/subscriptions] Tenant mismatch');
      return NextResponse.json(
        { success: false, error: 'Acesso negado ao cliente de outro tenant' },
        { status: 403 }
      );
    }

    // 5. Buscar todas as assinaturas do cliente
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        plano_id,
        user_id,
        projetos_mensais,
        projetos_usados_mes,
        data_inicio,
        data_fim,
        proximo_reset,
        status,
        created_at,
        updated_at,
        plano:planos_assinatura (
          nome,
          quantidade_mensal,
          valor_mensal,
          dia_renovacao
        )
      `)
      .eq('user_id', clientId)
      .order('created_at', { ascending: false });

    if (subscriptionsError) {
      devLog.error('[API /admin/clients/[id]/subscriptions] Erro ao buscar assinaturas:', subscriptionsError);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar assinaturas' },
        { status: 500 }
      );
    }

    // 6. Calcular projetos restantes para cada assinatura
    const subscriptionsWithCalculations = (subscriptions || []).map((sub) => ({
      ...sub,
      projetos_restantes_mes: sub.projetos_mensais - sub.projetos_usados_mes,
    }));

    devLog.log('[API /admin/clients/[id]/subscriptions] Assinaturas encontradas:', subscriptionsWithCalculations.length);

    return NextResponse.json({
      success: true,
      data: subscriptionsWithCalculations,
    });
  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/subscriptions] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
