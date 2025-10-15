/**
 * API para operações individuais de membros da equipe
 * GET /api/admin/team-members/[id] - Obter contagem de projetos do membro
 * PUT /api/admin/team-members/[id] - Atualizar membro específico
 * DELETE /api/admin/team-members/[id] - Remover membro específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    devLog.log('[API Team Members GET] Verificando projetos do membro:', params.id);

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Contar projetos onde o membro é responsável
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('admin_responsible_id', params.id)
      .eq('tenant_id', tenantId);

    if (error) {
      devLog.error('[API Team Members GET] Erro ao contar projetos:', error);
      return NextResponse.json(
        { error: 'Erro ao verificar projetos' },
        { status: 500 }
      );
    }

    devLog.log('[API Team Members GET] Contagem de projetos:', count || 0);

    return NextResponse.json({
      success: true,
      projectCount: count || 0
    });

  } catch (error: any) {
    devLog.error('[API Team Members GET] Erro ao verificar projetos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    devLog.log('[API Team Members PUT] Atualizando membro:', params.id);

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, phone, department, role, permissions } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Preparar dados de atualização
    const updateData: any = {
      name,
      phone: phone || null,
      department: department || null,
      updated_at: new Date().toISOString()
    };

    // Se role ou permissions foram fornecidos, incluir na atualização
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;

    // Atualizar usuário
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API Team Members PUT] Erro ao atualizar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar membro da equipe' },
        { status: 500 }
      );
    }

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Membro não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API Team Members PUT] Usuário atualizado:', updatedUser.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        permissions: updatedUser.permissions, // ✅ Retornar permissions atualizadas
        phone: updatedUser.phone || '',
        department: updatedUser.department || '',
        status: updatedUser.status
      },
      message: 'Membro da equipe atualizado com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API Team Members PUT] Erro ao atualizar membro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    devLog.log('[API Team Members DELETE] Removendo membro:', params.id);

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se o usuário existe e pertence ao tenant
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (checkError || !existingUser) {
      devLog.error('[API Team Members DELETE] Usuário não encontrado:', checkError);
      return NextResponse.json(
        { error: 'Membro não encontrado' },
        { status: 404 }
      );
    }

    // ✅ NOVO: Limpar responsável dos projetos antes de excluir
    devLog.log('[API Team Members DELETE] Verificando projetos do membro...');

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('admin_responsible_id', params.id)
      .eq('tenant_id', tenantId);

    if (projectCount && projectCount > 0) {
      devLog.log(`[API Team Members DELETE] Limpando responsável de ${projectCount} projeto(s)...`);

      const { error: updateError } = await supabase
        .from('projects')
        .update({
          admin_responsible_id: null,
          admin_responsible_name: null,
          admin_responsible_email: null,
          admin_responsible_phone: null,
          updated_at: new Date().toISOString()
        })
        .eq('admin_responsible_id', params.id)
        .eq('tenant_id', tenantId);

      if (updateError) {
        devLog.error('[API Team Members DELETE] Erro ao limpar responsável dos projetos:', updateError);
        return NextResponse.json(
          { error: 'Erro ao limpar responsável dos projetos' },
          { status: 500 }
        );
      }

      devLog.log('[API Team Members DELETE] Responsável limpo dos projetos com sucesso');
    }

    // ✅ CORREÇÃO: Excluir permanentemente do banco de dados
    devLog.log('[API Team Members DELETE] Excluindo usuário do banco de dados...');

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      devLog.error('[API Team Members DELETE] Erro ao excluir usuário do DB:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao remover membro da equipe do banco de dados' },
        { status: 500 }
      );
    }

    // ✅ CORREÇÃO: Excluir também do Supabase Auth
    devLog.log('[API Team Members DELETE] Excluindo usuário do Auth...');

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(params.id);

    if (authDeleteError) {
      devLog.error('[API Team Members DELETE] Erro ao excluir usuário do Auth:', authDeleteError);
      // Não falhar a operação se já removeu do DB
      devLog.warn('[API Team Members DELETE] Usuário removido do DB mas falhou ao remover do Auth');
    } else {
      devLog.log('[API Team Members DELETE] Usuário excluído do Auth com sucesso');
    }

    devLog.log('[API Team Members DELETE] Usuário excluído permanentemente:', params.id);

    return NextResponse.json({
      success: true,
      message: 'Membro da equipe removido com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API Team Members DELETE] Erro ao remover membro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
