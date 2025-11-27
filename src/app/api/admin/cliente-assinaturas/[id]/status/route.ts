import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PATCH: Atualizar status da assinatura (pausar/cancelar)
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
    const assinaturaId = params.id;
    const body = await request.json();
    const { status } = body;

    // Validar status
    const statusValidos = ['ativa', 'pausada', 'cancelada', 'pendente_renovacao'];
    if (!status || !statusValidos.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status inválido. Use: ${statusValidos.join(', ')}` },
        { status: 400 }
      );
    }

    // Buscar assinatura atual
    const { data: assinaturaAtual, error: fetchError } = await supabase
      .from('cliente_assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .single();

    if (fetchError || !assinaturaAtual) {
      return NextResponse.json(
        { success: false, error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    // Atualizar status da assinatura
    const { data: assinaturaAtualizada, error: updateError } = await supabase
      .from('cliente_assinaturas')
      .update({ status })
      .eq('id', assinaturaId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[API /admin/cliente-assinaturas/[id]/status PATCH] Erro ao atualizar status:', updateError);
      throw updateError;
    }

    // Se cancelando ou pausando, voltar usuário para avulso
    if (status === 'cancelada' || status === 'pausada') {
      await supabase
        .from('users')
        .update({ billing_mode: 'avulso' })
        .eq('id', assinaturaAtual.user_id);
    }

    // Se reativando, garantir que usuário está com billing_mode = 'assinatura'
    if (status === 'ativa') {
      await supabase
        .from('users')
        .update({ billing_mode: 'assinatura' })
        .eq('id', assinaturaAtual.user_id);
    }

    devLog.log('[API /admin/cliente-assinaturas/[id]/status PATCH] Status atualizado:', status);

    return NextResponse.json({
      success: true,
      data: assinaturaAtualizada,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-assinaturas/[id]/status PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar status da assinatura' },
      { status: 500 }
    );
  }
}
