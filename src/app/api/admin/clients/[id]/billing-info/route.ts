import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Buscar informações de faturamento do cliente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    devLog.log('[API /admin/clients/[id]/billing-info] Buscando billing info para cliente:', clientId);

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
      devLog.error('[API /admin/clients/[id]/billing-info] Erro ao buscar user:', userError);
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }

    const billingMode = user.billing_mode || 'avulso';
    let packageInfo = null;
    let subscriptionInfo = null;

    // Se for pacote, buscar informações do pacote ativo
    if (billingMode === 'pacote') {
      const { data: clientePacote, error: pacoteError } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, preco)
        `)
        .eq('user_id', clientId)
        .eq('status', 'ativo')
        .single();

      // 🔍 DEBUG: Log para entender se o pacote está sendo encontrado
      devLog.log('[API billing-info] Resultado busca pacote:', {
        clientId,
        billingMode,
        foundPackage: !!clientePacote,
        error: pacoteError?.message || null,
        packageData: clientePacote
      });

      if (!pacoteError && clientePacote) {
        packageInfo = {
          id: clientePacote.id,
          pacote_id: clientePacote.pacote_id,
          nome_pacote: clientePacote.pacote?.nome || 'Pacote',
          projetos_inclusos: clientePacote.projetos_inclusos,
          projetos_usados: clientePacote.projetos_usados,
          data_ativacao: clientePacote.data_ativacao,
          data_expiracao: clientePacote.data_expiracao,
          status: clientePacote.status,
          preco: clientePacote.pacote?.preco || null
        };
      } else if (pacoteError) {
        devLog.warn('[API billing-info] Cliente tem billing_mode=pacote mas não tem pacote ativo!', {
          clientId,
          error: pacoteError
        });
      }
    }

    // Se for assinatura, buscar informações da assinatura ativa
    if (billingMode === 'assinatura') {
      const { data: clienteAssinatura, error: assinaturaError } = await supabase
        .from('cliente_assinaturas')
        .select(`
          *,
          plano:planos_assinatura(nome, quantidade_mensal, dia_renovacao, valor_mensal)
        `)
        .eq('user_id', clientId)
        .in('status', ['ativa', 'pendente_renovacao'])
        .single();

      if (!assinaturaError && clienteAssinatura) {
        subscriptionInfo = {
          id: clienteAssinatura.id,
          plano_id: clienteAssinatura.plano_id,
          nome_plano: clienteAssinatura.plano?.nome || 'Plano',
          projetos_mensais: clienteAssinatura.projetos_mensais,
          projetos_usados_mes_atual: clienteAssinatura.projetos_usados_mes_atual,
          data_inicio: clienteAssinatura.data_inicio,
          dia_renovacao: clienteAssinatura.dia_renovacao,
          ultimo_reset: clienteAssinatura.ultimo_reset,
          proximo_reset: clienteAssinatura.proximo_reset,
          status: clienteAssinatura.status,
          valor_mensal: clienteAssinatura.plano?.valor_mensal || null
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        billing_mode: billingMode,
        package: packageInfo,
        subscription: subscriptionInfo
      }
    });

  } catch (error: any) {
    devLog.error('[API /admin/clients/[id]/billing-info] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar informações de faturamento' },
      { status: 500 }
    );
  }
}
