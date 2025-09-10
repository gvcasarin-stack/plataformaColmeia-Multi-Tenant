/**
 * API para gerenciar membros da equipe
 * GET - Listar membros da equipe do tenant
 * POST - Criar novo membro da equipe
 * PUT - Atualizar membro existente
 * DELETE - Remover membro da equipe
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Team Members] Buscando membros da equipe...');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar membros da equipe (usuários admin do tenant)
    devLog.log('[API Team Members] Executando query para tenant:', tenantId);
    
    const { data: members, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        phone,
        department,
        role,
        tenant_id,
        status,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    devLog.log('[API Team Members] Resultado da query:', {
      membersCount: members?.length || 0,
      error: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details
    });

    if (error) {
      devLog.error('[API Team Members] Erro ao buscar membros:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        tenantId
      });
      
      // Retornar array vazio em caso de erro para não quebrar a interface
      return NextResponse.json({
        success: true,
        data: [],
        warning: `Erro na consulta: ${error.message}`,
        debug: {
          tenantId,
          errorCode: error.code,
          errorMessage: error.message
        }
      });
    }

    // Formatar dados para o frontend (usando campos diretos)
    const formattedMembers = (members || []).map(member => ({
      id: member.id,
      name: member.name || member.email.split('@')[0], // Usar nome real ou parte do email
      email: member.email,
      role: member.role,
      phone: member.phone || '',
      department: member.department || 'Engenharia',
      createdAt: member.created_at,
      status: member.status
    }));

    devLog.log('[API Team Members] Membros encontrados:', formattedMembers.length);

    return NextResponse.json({
      success: true,
      data: formattedMembers
    });

  } catch (error: any) {
    devLog.error('[API Team Members] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API Team Members] Criando novo membro...');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    devLog.log('[API Team Members] Headers recebidos:', {
      tenantId,
      allHeaders: Object.fromEntries(headersList.entries())
    });

    if (!tenantId) {
      devLog.error('[API Team Members] Tenant ID ausente');
      return NextResponse.json(
        { error: 'Tenant ID não encontrado nos headers' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, email, role, phone, department } = body;
    
    devLog.log('[API Team Members] Dados recebidos:', {
      name, email, role, phone, department
    });

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, email e função são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se email já existe no tenant
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso nesta organização' },
        { status: 409 }
      );
    }

    // Passo 1: Criar usuário no Supabase Auth primeiro
    devLog.log('[API Team Members] Criando usuário no Auth...');
    
    const tempPassword = `Temp${Date.now()}!`; // Senha temporária
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });
    
    if (authError) {
      devLog.error('[API Team Members] Erro ao criar no Auth:', authError);
      return NextResponse.json(
        { error: `Erro de autenticação: ${authError.message}` },
        { status: 500 }
      );
    }
    
    devLog.log('[API Team Members] Usuário criado no Auth:', authUser.user?.id);
    
    // Passo 2: Criar registro na tabela users usando ID do Auth
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: authUser.user!.id,
        email,
        name,
        phone: phone || null,
        department: department || 'Engenharia',
        role,
        tenant_id: tenantId,
        status: 'active',
        auth_provider: 'supabase',
        permissions: {
          can_export_data: false,
          can_manage_users: false,
          can_edit_projects: false,
          can_create_projects: true,
          can_delete_projects: false,
          can_view_financials: false
        },
        settings: {
          preferences: {
            theme: 'light',
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo'
          },
          notifications: {
            push: true,
            email: true,
            system_alerts: true,
            project_updates: true
          }
        },
        is_blocked: false,
        login_count: 0
      })
      .select()
      .single();

    if (error) {
      devLog.error('[API Team Members] Erro ao criar usuário no DB:', error);
      
      // Se deu erro no DB, deletar do Auth para não deixar inconsistente
      try {
        await supabase.auth.admin.deleteUser(authUser.user!.id);
        devLog.log('[API Team Members] Usuário removido do Auth devido ao erro no DB');
      } catch (cleanupError) {
        devLog.error('[API Team Members] Erro ao limpar Auth:', cleanupError);
      }
      
      return NextResponse.json(
        { 
          error: `Erro ao criar membro da equipe: ${error.message}`,
          details: error.details,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    devLog.log('[API Team Members] Usuário criado:', newUser.id);

    // TODO: Enviar email de boas-vindas com link para definir senha
    // await sendWelcomeEmail(email, name, tenantSlug);

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone || '',
        department: newUser.department || 'Engenharia',
        createdAt: newUser.created_at,
        status: newUser.status
      },
      message: 'Membro da equipe criado com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API Team Members] Erro ao criar membro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    devLog.log('[API Team Members] Atualizando membro...');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, name, phone, department } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar usuário (usando campos diretos)
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        phone: phone || null,
        department: department || 'Engenharia',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API Team Members] Erro ao atualizar usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar membro da equipe' },
        { status: 500 }
      );
    }

    devLog.log('[API Team Members] Usuário atualizado:', updatedUser.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name || name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone || '',
        department: updatedUser.department || 'Engenharia',
        createdAt: updatedUser.created_at,
        status: updatedUser.status
      },
      message: 'Membro da equipe atualizado com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API Team Members] Erro ao atualizar membro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    devLog.log('[API Team Members] Removendo membro...');

    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const url = new URL(request.url);
    const userId = url.searchParams.get('id');

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'Tenant ID e User ID são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Marcar usuário como inativo ao invés de deletar
    const { error } = await supabase
      .from('users')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      devLog.error('[API Team Members] Erro ao remover usuário:', error);
      return NextResponse.json(
        { error: 'Erro ao remover membro da equipe' },
        { status: 500 }
      );
    }

    devLog.log('[API Team Members] Usuário removido:', userId);

    return NextResponse.json({
      success: true,
      message: 'Membro da equipe removido com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API Team Members] Erro ao remover membro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
