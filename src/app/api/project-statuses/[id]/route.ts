import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de Gerenciamento de Status Específico
 * PUT /api/project-statuses/[id] - Editar status
 * DELETE /api/project-statuses/[id] - Excluir status
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusId = params.id;
    devLog.log('[project-statuses] PUT - Editando status:', statusId);

    // Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado'
      }, { status: 400 });
    }

    // Parse do body
    const body = await request.json();
    const { name, color, icon, sla_days, sla_exclude_weekends, is_conclusion } = body;

    // Validações
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Nome do status é obrigatório'
        }, { status: 400 });
      }

      if (name.trim().length > 100) {
        return NextResponse.json({
          success: false,
          error: 'Nome do status deve ter no máximo 100 caracteres'
        }, { status: 400 });
      }
    }

    // Validar sla_days se fornecido
    if (sla_days !== undefined && sla_days !== null) {
      if (typeof sla_days !== 'number' || sla_days < 0) {
        return NextResponse.json({
          success: false,
          error: 'O prazo SLA deve ser um número positivo em dias'
        }, { status: 400 });
      }
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se status existe e pertence ao tenant
    const { data: existingStatus, error: checkError } = await supabase
      .from('project_statuses')
      .select('*')
      .eq('id', statusId)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingStatus) {
      return NextResponse.json({
        success: false,
        error: 'Status não encontrado'
      }, { status: 404 });
    }

    // Atualizar apenas os campos permitidos (não slug para manter referências)
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon || null;
    if (sla_days !== undefined) updateData.sla_days = sla_days;
    if (sla_exclude_weekends !== undefined) updateData.sla_exclude_weekends = sla_exclude_weekends;
    if (is_conclusion !== undefined) updateData.is_conclusion = Boolean(is_conclusion);

    const { data: updatedStatus, error: updateError } = await supabase
      .from('project_statuses')
      .update(updateData)
      .eq('id', statusId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[project-statuses] Erro ao atualizar status:', updateError);

      // Erro de duplicação de nome
      if (updateError.code === '23505' && updateError.message.includes('name')) {
        return NextResponse.json({
          success: false,
          error: 'Já existe um status com esse nome'
        }, { status: 409 });
      }

      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar status'
      }, { status: 500 });
    }

    devLog.log('[project-statuses] Status atualizado com sucesso:', {
      statusId,
      name: updatedStatus.name
    });

    return NextResponse.json({
      success: true,
      data: updatedStatus,
      message: 'Status atualizado com sucesso'
    });

  } catch (error) {
    devLog.error('[project-statuses] Erro inesperado no PUT:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusId = params.id;
    devLog.log('[project-statuses] DELETE - Excluindo status:', statusId);

    // Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se pode excluir usando a função SQL
    const { data: canDelete, error: checkError } = await supabase.rpc('can_delete_project_status', {
      p_status_id: statusId,
      p_tenant_id: tenantId
    });

    if (checkError) {
      devLog.error('[project-statuses] Erro ao verificar se pode excluir:', checkError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar status'
      }, { status: 500 });
    }

    if (!canDelete) {
      // Obter detalhes do problema
      const { data: statusInfo } = await supabase
        .from('project_statuses')
        .select(`
          name,
          is_default,
          project_count:projects!inner(count)
        `)
        .eq('id', statusId)
        .eq('tenant_id', tenantId)
        .single();

      if (statusInfo?.is_default) {
        return NextResponse.json({
          success: false,
          error: 'Não é possível excluir status padrão do sistema'
        }, { status: 400 });
      }

      // Contar projetos manualmente para dar feedback preciso
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', (await supabase
          .from('project_statuses')
          .select('slug')
          .eq('id', statusId)
          .single()
        ).data?.slug || '');

      return NextResponse.json({
        success: false,
        error: `Não é possível excluir. Existem ${projectCount} projeto(s) usando este status.`
      }, { status: 400 });
    }

    // Excluir o status
    const { error: deleteError } = await supabase
      .from('project_statuses')
      .delete()
      .eq('id', statusId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      devLog.error('[project-statuses] Erro ao excluir status:', deleteError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao excluir status'
      }, { status: 500 });
    }

    devLog.log('[project-statuses] Status excluído com sucesso:', statusId);

    return NextResponse.json({
      success: true,
      message: 'Status excluído com sucesso'
    });

  } catch (error) {
    devLog.error('[project-statuses] Erro inesperado no DELETE:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}