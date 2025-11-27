import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar usuário e seu billing_mode
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, billing_mode, tenant_id')
      .eq('id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (userError || !user) {
      devLog.error('[API billing-status] Usuário não encontrado:', userError);
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const billingMode = user.billing_mode || 'avulso';
    const response: any = {
      success: true,
      billing_mode: billingMode,
      can_create: true, // Sempre permite criar (não bloqueia)
      warnings: [],
    };

    // Se for AVULSO, retornar direto (sem info adicional)
    if (billingMode === 'avulso') {
      return NextResponse.json(response);
    }

    // Se for PACOTE
    if (billingMode === 'pacote') {
      const { data: clientePacote, error: pacoteError } = await supabase
        .from('cliente_pacotes')
        .select(`
          id,
          user_id,
          pacote_id,
          data_ativacao,
          data_expiracao,
          projetos_inclusos,
          projetos_usados,
          status,
          payment_status,
          pacotes_definicoes:pacote_id (
            nome,
            quantidade_projetos,
            valor,
            validade_dias,
            potencia_maxima_kwp
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .eq('status', 'ativo')
        .single();

      if (pacoteError || !clientePacote) {
        devLog.warn('[API billing-status] Nenhum pacote ativo encontrado');
        // Cliente tem billing_mode = pacote mas sem pacote ativo
        response.warnings.push({
          type: 'no_active_package',
          message: 'Nenhum pacote ativo encontrado. Projetos serão cobrados como avulsos.',
        });
        return NextResponse.json(response);
      }

      const pacoteDef: any = clientePacote.pacotes_definicoes;
      const dataExpiracao = new Date(clientePacote.data_expiracao);
      const hoje = new Date();
      const diasRestantes = Math.ceil((dataExpiracao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      const expirado = diasRestantes <= 0;
      const esgotado = clientePacote.projetos_usados >= clientePacote.projetos_inclusos;

      response.pacote = {
        id: clientePacote.id,
        nome: pacoteDef?.nome || 'Pacote',
        projetos_usados: clientePacote.projetos_usados,
        projetos_inclusos: clientePacote.projetos_inclusos,
        potencia_maxima_kwp: pacoteDef?.potencia_maxima_kwp || null,
        data_expiracao: clientePacote.data_expiracao,
        dias_restantes: diasRestantes,
        status: clientePacote.status,
        payment_status: clientePacote.payment_status || 'pendente',
      };

      // Gerar warnings
      if (esgotado) {
        response.warnings.push({
          type: 'package_exhausted',
          severity: 'high',
          message: `Pacote esgotado (${clientePacote.projetos_usados} de ${clientePacote.projetos_inclusos} projetos utilizados). Novos projetos serão cobrados como avulsos.`,
        });
      }

      if (expirado) {
        response.warnings.push({
          type: 'package_expired',
          severity: 'high',
          message: `Pacote expirado em ${dataExpiracao.toLocaleDateString('pt-BR')}. Novos projetos serão cobrados como avulsos.`,
        });
      }

      if (clientePacote.payment_status !== 'pago') {
        response.warnings.push({
          type: 'payment_pending',
          severity: 'medium',
          message: `Pagamento do pacote pendente. Status: ${clientePacote.payment_status === 'parcela1' ? '1ª parcela paga' : 'Pendente'}.`,
        });
      }
    }

    // Se for ASSINATURA
    if (billingMode === 'assinatura') {
      const { data: clienteAssinatura, error: assinaturaError } = await supabase
        .from('cliente_assinaturas')
        .select(`
          id,
          user_id,
          plano_id,
          data_inicio,
          projetos_mensais,
          projetos_usados_mes_atual,
          ultimo_reset,
          proximo_reset,
          status,
          payment_status,
          planos_assinatura:plano_id (
            nome,
            quantidade_mensal,
            valor_mensal,
            potencia_maxima_kwp
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .in('status', ['ativa', 'pendente_renovacao'])
        .single();

      if (assinaturaError || !clienteAssinatura) {
        devLog.warn('[API billing-status] Nenhuma assinatura ativa encontrada');
        response.warnings.push({
          type: 'no_active_subscription',
          message: 'Nenhuma assinatura ativa encontrada. Projetos serão cobrados como avulsos.',
        });
        return NextResponse.json(response);
      }

      const planoDef: any = clienteAssinatura.planos_assinatura;
      const proximoReset = clienteAssinatura.proximo_reset ? new Date(clienteAssinatura.proximo_reset) : null;
      const hoje = new Date();
      const diasParaRenovacao = proximoReset ? Math.ceil((proximoReset.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const esgotado = clienteAssinatura.projetos_usados_mes_atual >= clienteAssinatura.projetos_mensais;

      response.assinatura = {
        id: clienteAssinatura.id,
        nome: planoDef?.nome || 'Assinatura',
        projetos_usados_mes: clienteAssinatura.projetos_usados_mes_atual,
        projetos_mensais: clienteAssinatura.projetos_mensais,
        potencia_maxima_kwp: planoDef?.potencia_maxima_kwp || null,
        proximo_reset: clienteAssinatura.proximo_reset,
        dias_para_renovacao: diasParaRenovacao,
        status: clienteAssinatura.status,
        payment_status: clienteAssinatura.payment_status || 'pendente',
      };

      // Gerar warnings
      if (esgotado) {
        response.warnings.push({
          type: 'subscription_exhausted',
          severity: 'high',
          message: `Cota mensal esgotada (${clienteAssinatura.projetos_usados_mes_atual} de ${clienteAssinatura.projetos_mensais} projetos). ${proximoReset ? `Renova em ${diasParaRenovacao} ${diasParaRenovacao === 1 ? 'dia' : 'dias'}.` : ''}`,
        });
      }

      if (clienteAssinatura.status === 'pendente_renovacao') {
        response.warnings.push({
          type: 'subscription_pending_renewal',
          severity: 'high',
          message: `Assinatura pendente de renovação. ${proximoReset ? `Vence em ${diasParaRenovacao} ${diasParaRenovacao === 1 ? 'dia' : 'dias'}.` : 'Efetue o pagamento para continuar.'}`,
        });
      }

      if (clienteAssinatura.status === 'suspensa') {
        response.warnings.push({
          type: 'subscription_suspended',
          severity: 'high',
          message: 'Assinatura suspensa. Entre em contato com o administrador.',
        });
      }

      if (clienteAssinatura.payment_status !== 'pago') {
        response.warnings.push({
          type: 'payment_pending',
          severity: 'medium',
          message: 'Pagamento da assinatura pendente.',
        });
      }
    }

    return NextResponse.json(response);

  } catch (error: any) {
    devLog.error('[API billing-status] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar status de billing' },
      { status: 500 }
    );
  }
}
