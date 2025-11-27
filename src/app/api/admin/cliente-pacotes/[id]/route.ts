import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PATCH: Renovar/alterar pacote
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const supabase = createSupabaseServiceRoleClient();
    const pacoteClienteId = params.id;
    const body = await request.json();
    const { status, novo_pacote_id } = body;

    // Buscar pacote atual
    const { data: pacoteAtual, error: fetchError } = await supabase
      .from('cliente_pacotes')
      .select('*')
      .eq('id', pacoteClienteId)
      .single();

    if (fetchError || !pacoteAtual) {
      return NextResponse.json(
        { success: false, error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    // Se for renovação (trocar por novo pacote)
    if (novo_pacote_id) {
      // Buscar novo pacote
      const { data: novoPacote, error: novoPacoteError } = await supabase
        .from('pacotes_definicoes')
        .select('*')
        .eq('id', novo_pacote_id)
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .single();

      if (novoPacoteError || !novoPacote) {
        return NextResponse.json(
          { success: false, error: 'Novo pacote não encontrado ou inativo' },
          { status: 404 }
        );
      }

      // Cancelar pacote atual
      await supabase
        .from('cliente_pacotes')
        .update({ status: 'expirado' })
        .eq('id', pacoteClienteId);

      // Criar novo pacote
      const dataAtivacao = new Date();
      const dataExpiracao = new Date(dataAtivacao);
      dataExpiracao.setDate(dataExpiracao.getDate() + novoPacote.validade_dias);

      const { data: novoPacoteCliente, error: createError } = await supabase
        .from('cliente_pacotes')
        .insert({
          user_id: pacoteAtual.user_id,
          pacote_id: novo_pacote_id,
          data_ativacao: dataAtivacao.toISOString(),
          data_expiracao: dataExpiracao.toISOString(),
          projetos_inclusos: novoPacote.quantidade_projetos,
          projetos_usados: 0,
          status: 'ativo',
        })
        .select()
        .single();

      if (createError) {
        devLog.error('[API /admin/cliente-pacotes/[id] PATCH] Erro ao renovar:', createError);
        throw createError;
      }

      devLog.log('[API /admin/cliente-pacotes/[id] PATCH] Pacote renovado:', novoPacoteCliente.id);

      return NextResponse.json({
        success: true,
        data: novoPacoteCliente,
      });
    }

    // Se for apenas atualização de status
    if (status) {
      const { data: pacoteAtualizado, error: updateError } = await supabase
        .from('cliente_pacotes')
        .update({ status })
        .eq('id', pacoteClienteId)
        .select()
        .single();

      if (updateError) {
        devLog.error('[API /admin/cliente-pacotes/[id] PATCH] Erro ao atualizar status:', updateError);
        throw updateError;
      }

      // Se cancelando, voltar usuário para avulso
      if (status === 'cancelado' || status === 'expirado') {
        await supabase
          .from('users')
          .update({ billing_mode: 'avulso' })
          .eq('id', pacoteAtual.user_id);
      }

      devLog.log('[API /admin/cliente-pacotes/[id] PATCH] Status atualizado:', status);

      return NextResponse.json({
        success: true,
        data: pacoteAtualizado,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Nenhuma ação especificada' },
      { status: 400 }
    );

  } catch (error: any) {
    devLog.error('[API /admin/cliente-pacotes/[id] PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar pacote' },
      { status: 500 }
    );
  }
}
