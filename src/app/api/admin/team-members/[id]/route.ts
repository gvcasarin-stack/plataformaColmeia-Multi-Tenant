/**
 * API para operações individuais de membros da equipe
 * PUT /api/admin/team-members/[id] - Atualizar membro específico
 * DELETE /api/admin/team-members/[id] - Remover membro específico
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

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
    const { name, phone, department, role } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar usuário
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        phone: phone || null,
        department: department || null,
        role: role || 'cliente',
        updated_at: new Date().toISOString()
      })
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

    // Marcar usuário como inativo ao invés de deletar
    const { error } = await supabase
      .from('users')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('tenant_id', tenantId);

    if (error) {
      devLog.error('[API Team Members DELETE] Erro ao remover usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao remover membro da equipe' },
        { status: 500 }
      );
    }

    devLog.log('[API Team Members DELETE] Usuário removido:', params.id);

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
