import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// GET: Listar pacotes de clientes com projetos vinculados
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API /admin/cliente-pacotes GET] Iniciando requisição');

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.warn('[API /admin/cliente-pacotes GET] Sem tenant-id no header');
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar todos os pacotes de clientes do tenant (ativos e histórico)
    const { data: clientePacotes, error } = await supabase
      .from('cliente_pacotes')
      .select(`
        id,
        user_id,
        pacote_id,
        tenant_id,
        data_ativacao,
        data_expiracao,
        projetos_inclusos,
        projetos_usados,
        status,
        payment_status,
        data_pagamento_parcela1,
        data_pagamento_integral,
        created_at,
        users:user_id (
          id,
          name,
          email,
          company_name,
          tenant_id
        ),
        pacotes_definicoes:pacote_id (
          id,
          nome,
          quantidade_projetos,
          valor,
          validade_dias,
          potencia_maxima_kwp
        )
      `)
      .eq('tenant_id', tenantId)
      .order('data_ativacao', { ascending: false });

    if (error) {
      devLog.error('[API /admin/cliente-pacotes GET] Erro ao buscar pacotes:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    // Para cada pacote, buscar os projetos vinculados
    const pacotesComProjetos = await Promise.all(
      (clientePacotes || []).map(async (pacote) => {
        const { data: projetos, error: projetosError } = await supabase
          .from('projects')
          .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, payment_status, created_at')
          .eq('cliente_pacote_id', pacote.id)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        if (projetosError) {
          devLog.error(`[API /admin/cliente-pacotes GET] ERRO ao buscar projetos do pacote ${pacote.id}:`, projetosError);
        }

        devLog.log(`[API /admin/cliente-pacotes GET] Pacote ${pacote.id}: ${projetos?.length || 0} projetos encontrados`, {
          pacoteId: pacote.id,
          tenantId,
          error: projetosError || null,
          projetosIds: projetos?.map(p => p.id) || []
        });

        return {
          ...pacote,
          projetos: projetos || [],
        };
      })
    );

    devLog.log('[API /admin/cliente-pacotes GET] Pacotes encontrados:', pacotesComProjetos.length);

    return NextResponse.json({
      success: true,
      data: pacotesComProjetos,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-pacotes GET] Erro:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

// POST: Ativar pacote para cliente
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
    const { user_id, pacote_id, data_ativacao } = body;

    // Validações
    if (!user_id || !pacote_id) {
      return NextResponse.json(
        { success: false, error: 'user_id e pacote_id são obrigatórios' },
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

    // Buscar definição do pacote
    const { data: pacote, error: pacoteError } = await supabase
      .from('pacotes_definicoes')
      .select('*')
      .eq('id', pacote_id)
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .single();

    if (pacoteError || !pacote) {
      return NextResponse.json(
        { success: false, error: 'Pacote não encontrado ou inativo' },
        { status: 404 }
      );
    }

    // Verificar se já existe pacote ativo para este usuário
    const { data: existingPackage } = await supabase
      .from('cliente_pacotes')
      .select('id')
      .eq('user_id', user_id)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativo')
      .single();

    if (existingPackage) {
      return NextResponse.json(
        { success: false, error: 'Cliente já possui um pacote ativo. Cancele o pacote atual antes de ativar um novo.' },
        { status: 400 }
      );
    }

    // Calcular data de expiração
    const dataAtivacao = data_ativacao ? new Date(data_ativacao) : new Date();
    const dataExpiracao = new Date(dataAtivacao);
    dataExpiracao.setDate(dataExpiracao.getDate() + pacote.validade_dias);

    // Criar registro de pacote ativo
    const { data: clientePacote, error: createError } = await supabase
      .from('cliente_pacotes')
      .insert({
        user_id,
        pacote_id,
        tenant_id: tenantId,
        data_ativacao: dataAtivacao.toISOString(),
        data_expiracao: dataExpiracao.toISOString(),
        projetos_inclusos: pacote.quantidade_projetos,
        projetos_usados: 0,
        status: 'ativo',
      })
      .select()
      .single();

    if (createError) {
      devLog.error('[API /admin/cliente-pacotes POST] Erro ao criar pacote:', createError);
      throw createError;
    }

    // Atualizar billing_mode do usuário para 'pacote'
    await supabase
      .from('users')
      .update({ billing_mode: 'pacote' })
      .eq('id', user_id)
      .eq('tenant_id', tenantId);

    devLog.log('[API /admin/cliente-pacotes POST] Pacote ativado:', clientePacote.id);

    return NextResponse.json({
      success: true,
      data: clientePacote,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-pacotes POST] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao ativar pacote' },
      { status: 500 }
    );
  }
}
