import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Listar assinaturas de clientes com projetos vinculados
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API /admin/cliente-assinaturas GET] Iniciando requisição');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/cliente-assinaturas GET] Sem tenant-id no header');
      return NextResponse.json({ success: true, data: [] });
    }

    devLog.log('[API /admin/cliente-assinaturas GET] Criando cliente Supabase...');
    const supabase = createSupabaseServiceRoleClient();
    devLog.log('[API /admin/cliente-assinaturas GET] Cliente criado com sucesso');

    // Buscar assinaturas ativas do tenant com dados de usuário e plano
    devLog.log('[API /admin/cliente-assinaturas GET] Buscando assinaturas para tenant:', tenantId);
    const { data: clienteAssinaturas, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email,
          company_name,
          tenant_id
        ),
        planos_assinatura:plano_id (
          id,
          nome,
          quantidade_mensal,
          valor_mensal,
          dia_renovacao,
          potencia_maxima_kwp
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa');

    if (assinaturasError) {
      devLog.error('[API /admin/cliente-assinaturas GET] Erro ao buscar assinaturas:', assinaturasError);
      return NextResponse.json({ success: true, data: [] });
    }

    devLog.log('[API /admin/cliente-assinaturas GET] Assinaturas encontradas:', clienteAssinaturas?.length || 0);

    // Para cada assinatura, buscar os projetos vinculados (do mês corrente e histórico)
    const assinaturasComProjetos = await Promise.all(
      (clienteAssinaturas || []).map(async (assinatura) => {
        // Buscar TODOS os projetos da assinatura
        devLog.log(`[API /admin/cliente-assinaturas GET] Buscando projetos para assinatura ${assinatura.id}`);
        const { data: todosProjetos, error: projetosError } = await supabase
          .from('projects')
          .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, pagamento, created_at')
          .eq('cliente_assinatura_id', assinatura.id)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (projetosError) {
          devLog.error(`[API /admin/cliente-assinaturas GET] Erro ao buscar projetos da assinatura ${assinatura.id}:`, projetosError);
        } else {
          devLog.log(`[API /admin/cliente-assinaturas GET] Projetos encontrados para assinatura ${assinatura.id}:`, todosProjetos?.length || 0);
        }

        // ✅ CORREÇÃO FINAL: Para assinaturas, TODOS os projetos vinculados são do "mês atual"
        // O contador projetos_usados_mes_atual já é controlado corretamente pelo banco
        // Não filtrar por data de criação, pois projetos podem ter sido criados antes da assinatura
        const projetosDoMesAtual = todosProjetos || [];

        return {
          ...assinatura,
          projetos: todosProjetos || [],
          projetosDoMesAtual,
        };
      })
    );

    devLog.log('[API /admin/cliente-assinaturas GET] Assinaturas encontradas:', assinaturasComProjetos.length);

    return NextResponse.json({
      success: true,
      data: assinaturasComProjetos,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-assinaturas GET] Erro:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST: Ativar assinatura para cliente
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    const { user_id, plano_id, data_inicio } = body;

    // Validações
    if (!user_id || !plano_id) {
      return NextResponse.json(
        { success: false, error: 'user_id e plano_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se usuário pertence ao tenant
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id')
      .eq('id', user_id)
      .eq('tenant_id', tenantId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar definição do plano
    const { data: plano, error: planoError } = await supabase
      .from('planos_assinatura')
      .select('*')
      .eq('id', plano_id)
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .single();

    if (planoError || !plano) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se já existe assinatura ativa para este usuário
    const { data: existingSubscription } = await supabase
      .from('cliente_assinaturas')
      .select('id')
      .eq('user_id', user_id)
      .eq('tenant_id', tenantId)
      .in('status', ['ativa', 'pendente_renovacao'])
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { success: false, error: 'Cliente já possui uma assinatura ativa. Cancele a assinatura atual antes de ativar uma nova.' },
        { status: 400 }
      );
    }

    // Calcular datas
    const dataInicio = data_inicio ? new Date(data_inicio) : new Date();
    const ultimoReset = dataInicio;

    // Calcular próximo reset baseado no dia de renovação
    const proximoReset = new Date(dataInicio);
    proximoReset.setMonth(proximoReset.getMonth() + 1);
    proximoReset.setDate(plano.dia_renovacao);

    // Se a data de renovação já passou neste mês, usar próximo mês
    if (proximoReset <= dataInicio) {
      proximoReset.setMonth(proximoReset.getMonth() + 1);
    }

    // Criar registro de assinatura ativa
    const { data: clienteAssinatura, error: createError } = await supabase
      .from('cliente_assinaturas')
      .insert({
        user_id,
        plano_id,
        tenant_id: tenantId,
        data_inicio: dataInicio.toISOString(),
        dia_renovacao: plano.dia_renovacao,
        projetos_mensais: plano.quantidade_mensal,
        projetos_usados_mes_atual: 0,
        ultimo_reset: ultimoReset.toISOString(),
        proximo_reset: proximoReset.toISOString(),
        status: 'ativa',
      })
      .select()
      .single();

    if (createError) {
      devLog.error('[API /admin/cliente-assinaturas POST] Erro ao criar assinatura:', createError);
      throw createError;
    }

    // Atualizar billing_mode do usuário para 'assinatura'
    await supabase
      .from('users')
      .update({ billing_mode: 'assinatura' })
      .eq('id', user_id)
      .eq('tenant_id', tenantId);

    devLog.log('[API /admin/cliente-assinaturas POST] Assinatura ativada:', clienteAssinatura.id);

    return NextResponse.json({
      success: true,
      data: clienteAssinatura,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-assinaturas POST] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao ativar assinatura' },
      { status: 500 }
    );
  }
}
