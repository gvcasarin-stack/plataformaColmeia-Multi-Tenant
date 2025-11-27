import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Buscar informações de billing do cliente (billing_mode + pacote/assinatura ativo)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    devLog.log('[API /admin/clients/[id]/billing GET] Buscando billing para cliente:', clientId);

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar informações do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('billing_mode')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single();

    if (userError) {
      devLog.error('[API /admin/clients/[id]/billing GET] Erro ao buscar user:', userError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const billingMode = user.billing_mode || 'avulso';
    let activeBilling = null;

    // Se for pacote, buscar pacote ativo
    if (billingMode === 'pacote') {
      const { data: clientePacote } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias)
        `)
        .eq('user_id', clientId)
        .eq('status', 'ativo')
        .single();

      if (clientePacote) {
        activeBilling = {
          type: 'pacote',
          nome: clientePacote.pacote?.nome || 'Pacote',
          projetos_inclusos: clientePacote.projetos_inclusos,
          projetos_usados: clientePacote.projetos_usados,
          projetos_restantes: clientePacote.projetos_inclusos - clientePacote.projetos_usados,
          data_ativacao: clientePacote.data_ativacao,
          data_expiracao: clientePacote.data_expiracao,
          status: clientePacote.status
        };
      }
    }

    // Se for assinatura, buscar assinatura ativa
    if (billingMode === 'assinatura') {
      const { data: clienteAssinatura } = await supabase
        .from('cliente_assinaturas')
        .select(`
          *,
          plano:planos_assinatura(nome, quantidade_mensal, dia_renovacao)
        `)
        .eq('user_id', clientId)
        .in('status', ['ativa', 'pendente_renovacao'])
        .single();

      if (clienteAssinatura) {
        activeBilling = {
          type: 'assinatura',
          nome: clienteAssinatura.plano?.nome || 'Plano',
          projetos_mensais: clienteAssinatura.projetos_mensais,
          projetos_usados_mes: clienteAssinatura.projetos_usados_mes_atual,
          projetos_restantes_mes: clienteAssinatura.projetos_mensais - clienteAssinatura.projetos_usados_mes_atual,
          data_inicio: clienteAssinatura.data_inicio,
          dia_renovacao: clienteAssinatura.dia_renovacao,
          ultimo_reset: clienteAssinatura.ultimo_reset,
          proximo_reset: clienteAssinatura.proximo_reset,
          status: clienteAssinatura.status
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        billing_mode: billingMode,
        active_billing: activeBilling
      }
    });

  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/billing GET] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar informações de billing' },
      { status: 500 }
    );
  }
}

// PATCH: Atualizar billing_mode do cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const body = await request.json();
    const { billing_mode } = body;

    devLog.log('[API /admin/clients/[id]/billing PATCH] Atualizando billing_mode:', { clientId, billing_mode });

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    // Validar billing_mode
    const validModes = ['avulso', 'pacote', 'assinatura'];
    if (!billing_mode || !validModes.includes(billing_mode)) {
      return NextResponse.json(
        { success: false, error: `billing_mode inválido. Use: ${validModes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar billing_mode
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ billing_mode })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[API /admin/clients/[id]/billing PATCH] Erro ao atualizar:', updateError);
      throw updateError;
    }

    devLog.log('[API /admin/clients/[id]/billing PATCH] billing_mode atualizado com sucesso');

    return NextResponse.json({
      success: true,
      data: {
        billing_mode: updatedUser.billing_mode
      }
    });

  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/billing PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar billing_mode' },
      { status: 500 }
    );
  }
}
