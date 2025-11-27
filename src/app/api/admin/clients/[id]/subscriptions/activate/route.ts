import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from '@/lib/utils/productionLogger';
import { setDate, addMonths } from 'date-fns';

/**
 * POST /api/admin/clients/[id]/subscriptions/activate
 * Ativa uma assinatura mensal para um cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const { plano_id } = await request.json();

    devLog.log('[API /admin/clients/[id]/subscriptions/activate] POST - Cliente:', clientId, 'Plano:', plano_id);

    if (!plano_id) {
      return NextResponse.json(
        { success: false, error: 'ID do plano não fornecido' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // 1. Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Erro de autenticação:', authError);
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
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Erro ao buscar perfil:', profileError);
      return NextResponse.json(
        { success: false, error: 'Perfil não encontrado' },
        { status: 404 }
      );
    }

    // 3. Verificar permissão (admin ou superadmin)
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      devLog.warn('[API /admin/clients/[id]/subscriptions/activate] Acesso negado - Role:', profile.role);
      return NextResponse.json(
        { success: false, error: 'Permissão negada' },
        { status: 403 }
      );
    }

    // 4. Verificar se o cliente pertence ao mesmo tenant
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, tenant_id, name, billing_mode')
      .eq('id', clientId)
      .single();

    if (clientError || !clientData) {
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Cliente não encontrado:', clientError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    if (clientData.tenant_id !== profile.tenant_id) {
      devLog.warn('[API /admin/clients/[id]/subscriptions/activate] Tenant mismatch');
      return NextResponse.json(
        { success: false, error: 'Acesso negado ao cliente de outro tenant' },
        { status: 403 }
      );
    }

    // 5. Verificar se o cliente está na modalidade 'assinatura'
    if (clientData.billing_mode !== 'assinatura') {
      return NextResponse.json(
        {
          success: false,
          error: `Cliente está na modalidade "${clientData.billing_mode}". Altere para "assinatura" antes de ativar uma assinatura.`,
        },
        { status: 400 }
      );
    }

    // 6. Buscar informações do plano
    const { data: planDef, error: planError } = await supabase
      .from('planos_assinatura')
      .select('id, nome, quantidade_mensal, valor_mensal, dia_renovacao, ativo')
      .eq('id', plano_id)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (planError || !planDef) {
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Plano não encontrado:', planError);
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    if (!planDef.ativo) {
      return NextResponse.json(
        { success: false, error: 'Este plano está inativo e não pode ser ativado' },
        { status: 400 }
      );
    }

    // 7. Verificar se já existe uma assinatura ativa para este cliente
    const { data: existingSubscription, error: existingError } = await supabase
      .from('cliente_assinaturas')
      .select('id, status')
      .eq('user_id', clientId)
      .in('status', ['ativa', 'pendente_renovacao'])
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Erro ao verificar assinatura existente:', existingError);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar assinaturas existentes' },
        { status: 500 }
      );
    }

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          error: 'O cliente já possui uma assinatura ativa. Cancele a assinatura atual antes de ativar uma nova.',
        },
        { status: 400 }
      );
    }

    // 8. Calcular próxima data de renovação
    const dataInicio = new Date();
    let proximoReset = setDate(dataInicio, planDef.dia_renovacao);

    // Se o dia de renovação já passou neste mês, calcular para o próximo mês
    if (proximoReset <= dataInicio) {
      proximoReset = addMonths(proximoReset, 1);
    }

    // 9. Criar registro de assinatura ativa
    const { data: newSubscription, error: insertError } = await supabase
      .from('cliente_assinaturas')
      .insert({
        user_id: clientId,
        plano_id: planDef.id,
        projetos_mensais: planDef.quantidade_mensal,
        projetos_usados_mes: 0,
        data_inicio: dataInicio.toISOString(),
        data_fim: null,
        proximo_reset: proximoReset.toISOString(),
        status: 'ativa',
      })
      .select()
      .single();

    if (insertError) {
      devLog.error('[API /admin/clients/[id]/subscriptions/activate] Erro ao criar assinatura:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao ativar assinatura' },
        { status: 500 }
      );
    }

    devLog.log('[API /admin/clients/[id]/subscriptions/activate] Assinatura ativada com sucesso:', newSubscription.id);

    return NextResponse.json({
      success: true,
      data: {
        ...newSubscription,
        plano: planDef,
        projetos_restantes_mes: planDef.quantidade_mensal,
      },
      message: `Assinatura "${planDef.nome}" ativada com sucesso para ${clientData.name}`,
    });
  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/subscriptions/activate] Erro geral:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
