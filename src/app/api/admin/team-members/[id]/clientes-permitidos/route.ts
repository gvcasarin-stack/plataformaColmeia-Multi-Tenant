import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * GET /api/admin/team-members/[id]/clientes-permitidos
 * Busca os clientes permitidos para um colaborador específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const colaboradorId = params.id;
    devLog.log('[API /admin/team-members/[id]/clientes-permitidos GET] Buscando clientes permitidos para:', colaboradorId);

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ Buscar colaborador e seus clientes permitidos (campo JSON)
    const { data: colaborador, error: colaboradorError } = await supabase
      .from('users')
      .select('id, tenant_id, role, clientes_permitidos, tem_restricao_clientes')
      .eq('id', colaboradorId)
      .eq('tenant_id', tenantId)
      .single();

    if (colaboradorError || !colaborador) {
      devLog.error('[API /admin/team-members/[id]/clientes-permitidos GET] Colaborador não encontrado:', colaboradorError);
      return NextResponse.json(
        { success: false, error: 'Colaborador não encontrado' },
        { status: 404 }
      );
    }

    // ✅ Retornar array de IDs e flag de restrição
    const clienteIds = colaborador.clientes_permitidos || [];
    const temRestricao = colaborador.tem_restricao_clientes || false;

    devLog.log('[API /admin/team-members/[id]/clientes-permitidos GET] Clientes permitidos:', {
      quantidade: clienteIds.length,
      temRestricao
    });

    return NextResponse.json({
      success: true,
      cliente_ids: clienteIds,
      tem_restricao: temRestricao,
    });

  } catch (error: any) {
    devLog.error('[API /admin/team-members/[id]/clientes-permitidos GET] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/team-members/[id]/clientes-permitidos
 * Atualiza os clientes permitidos para um colaborador específico
 * Body: { cliente_ids: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const colaboradorId = params.id;
    const body = await request.json();
    const { cliente_ids } = body;

    devLog.log('[API /admin/team-members/[id]/clientes-permitidos PUT] Atualizando clientes permitidos:', {
      colaboradorId,
      quantidade: cliente_ids?.length || 0
    });

    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    if (!Array.isArray(cliente_ids)) {
      return NextResponse.json(
        { success: false, error: 'cliente_ids deve ser um array' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ Verificar se o colaborador pertence ao tenant
    const { data: colaborador, error: colaboradorError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', colaboradorId)
      .eq('tenant_id', tenantId)
      .single();

    if (colaboradorError || !colaborador) {
      devLog.error('[API /admin/team-members/[id]/clientes-permitidos PUT] Colaborador não encontrado:', colaboradorError);
      return NextResponse.json(
        { success: false, error: 'Colaborador não encontrado' },
        { status: 404 }
      );
    }

    // ✅ Validar se todos os cliente_ids pertencem ao tenant (se lista não vazia)
    let idsValidos = cliente_ids;
    
    if (cliente_ids.length > 0) {
      const { data: clientesValidos, error: validacaoError } = await supabase
        .from('users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('role', 'client')
        .in('id', cliente_ids);

      if (validacaoError) {
        devLog.error('[API /admin/team-members/[id]/clientes-permitidos PUT] Erro ao validar clientes:', validacaoError);
        return NextResponse.json(
          { success: false, error: 'Erro ao validar clientes' },
          { status: 500 }
        );
      }

      idsValidos = (clientesValidos || []).map(c => c.id);
    }

    // ✅ Buscar TODOS os clientes do tenant para comparação
    const { data: todosClientes, error: todosError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role', 'client');

    if (todosError) {
      devLog.error('[API /admin/team-members/[id]/clientes-permitidos PUT] Erro ao buscar todos clientes:', todosError);
      return NextResponse.json(
        { success: false, error: 'Erro ao validar clientes' },
        { status: 500 }
      );
    }

    const todosClientesIds = (todosClientes || []).map(c => c.id);
    const temTodosOsClientes = todosClientesIds.length > 0 && 
                               idsValidos.length === todosClientesIds.length &&
                               todosClientesIds.every(id => idsValidos.includes(id));

    // ✅ Atualizar campos: clientes_permitidos + tem_restricao_clientes
    // LÓGICA:
    // - Se tem TODOS os clientes → sem restrição (tem_restricao = false, array pode ficar vazio para economizar espaço)
    // - Se tem ALGUNS clientes → com restrição (tem_restricao = true, array com IDs)
    // - Se tem ZERO clientes → com restrição e sem acesso (tem_restricao = true, array vazio)
    
    const temRestricao = !temTodosOsClientes;
    const arrayParaSalvar = temTodosOsClientes ? [] : idsValidos;

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        clientes_permitidos: arrayParaSalvar,
        tem_restricao_clientes: temRestricao
      })
      .eq('id', colaboradorId)
      .eq('tenant_id', tenantId);

    if (updateError) {
      devLog.error('[API /admin/team-members/[id]/clientes-permitidos PUT] Erro ao atualizar:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar permissões' },
        { status: 500 }
      );
    }

    devLog.log('[API /admin/team-members/[id]/clientes-permitidos PUT] Clientes permitidos atualizados:', {
      idsRecebidos: cliente_ids.length,
      idsValidos: idsValidos.length,
      temRestricao,
      arrayParaSalvar: arrayParaSalvar.length
    });

    return NextResponse.json({
      success: true,
      message: 'Clientes permitidos atualizados com sucesso',
      cliente_ids_salvos: idsValidos.length,
      tem_restricao: temRestricao,
    });

  } catch (error: any) {
    devLog.error('[API /admin/team-members/[id]/clientes-permitidos PUT] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno' },
      { status: 500 }
    );
  }
}

