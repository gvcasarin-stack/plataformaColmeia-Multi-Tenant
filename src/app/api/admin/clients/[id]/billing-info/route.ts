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

    // Se for pacote, buscar informações do pacote
    if (billingMode === 'pacote') {
      // Primeiro, tentar buscar pacote ATIVO
      const { data: pacoteAtivo, error: erroAtivo } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, preco)
        `)
        .eq('user_id', clientId)
        .eq('status', 'ativo')
        .single();

      devLog.log('[API billing-info] Busca pacote ATIVO:', {
        clientId,
        found: !!pacoteAtivo,
        error: erroAtivo?.message || null
      });

      if (pacoteAtivo) {
        packageInfo = {
          id: pacoteAtivo.id,
          pacote_id: pacoteAtivo.pacote_id,
          nome_pacote: pacoteAtivo.pacote?.nome || 'Pacote',
          projetos_inclusos: pacoteAtivo.projetos_inclusos,
          projetos_usados: pacoteAtivo.projetos_usados,
          data_ativacao: pacoteAtivo.data_ativacao,
          data_expiracao: pacoteAtivo.data_expiracao,
          status: pacoteAtivo.status,
          preco: pacoteAtivo.pacote?.preco || null
        };
      } else {
        // Se não encontrou ativo, buscar QUALQUER pacote (para debug)
        const { data: todosPacotes, error: erroTodos } = await supabase
          .from('cliente_pacotes')
          .select(`
            *,
            pacote:pacotes_definicoes(nome, quantidade_projetos, validade_dias, preco)
          `)
          .eq('user_id', clientId)
          .order('created_at', { ascending: false });

        devLog.warn('[API billing-info] Cliente tem billing_mode=pacote mas sem pacote ativo!', {
          clientId,
          totalPacotes: todosPacotes?.length || 0,
          pacotes: todosPacotes?.map(p => ({
            id: p.id,
            status: p.status,
            data_ativacao: p.data_ativacao,
            data_expiracao: p.data_expiracao,
            projetos_usados: p.projetos_usados,
            projetos_inclusos: p.projetos_inclusos
          })) || []
        });

        // Se encontrou algum pacote (mesmo que não ativo), usar o mais recente
        if (todosPacotes && todosPacotes.length > 0) {
          const ultimoPacote = todosPacotes[0];
          packageInfo = {
            id: ultimoPacote.id,
            pacote_id: ultimoPacote.pacote_id,
            nome_pacote: ultimoPacote.pacote?.nome || 'Pacote',
            projetos_inclusos: ultimoPacote.projetos_inclusos,
            projetos_usados: ultimoPacote.projetos_usados,
            data_ativacao: ultimoPacote.data_ativacao,
            data_expiracao: ultimoPacote.data_expiracao,
            status: ultimoPacote.status,
            preco: ultimoPacote.pacote?.preco || null
          };
        }
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
