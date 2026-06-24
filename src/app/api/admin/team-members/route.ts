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
import { COLABORADOR_PERMISSIONS } from '@/types/user';

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
        permissions,
        tenant_id,
        status,
        created_at,
        updated_at
      `)
      .eq('tenant_id', tenantId)
      .in('role', ['superadmin', 'owner', 'admin', 'colaborador'])
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

    // Formatar dados para o frontend
    const formattedMembers = (members || []).map(member => ({
      id: member.id,
      name: member.name || member.email.split('@')[0],
      email: member.email,
      role: member.role, // ✅ Retornar role real (admin ou colaborador)
      permissions: member.permissions, // ✅ Incluir permissions
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
    const { name, email, role, phone, department, permissions } = body;

    devLog.log('[API Team Members] Dados recebidos:', {
      name, email, role, phone, department, permissions
    });

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, email e função são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ VERIFICAÇÃO GLOBAL: Verificar se email já existe em QUALQUER tenant
    const { data: globalEmailCheck } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (globalEmailCheck) {
      devLog.warn('[API Team Members] Email já cadastrado no sistema', {
        email,
        existingUserId: globalEmailCheck.id,
        existingTenantId: globalEmailCheck.tenant_id
      });
      return NextResponse.json({
        error: 'Este email já possui cadastro no sistema. Se você já tem conta, faça login. Se esqueceu a senha, use "Recuperar Senha".'
      }, { status: 409 });
    }

    // Passo 1: Criar usuário no Supabase Auth sem senha (será definida pelo link)
    devLog.log('[API Team Members] Criando usuário no Auth...');

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true, // Email já confirmado
      // ✅ Não definir senha - será definida pelo link
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
        role: role, // ✅ Usar role original (admin, colaborador, etc)
        tenant_id: tenantId,
        status: 'active',
        auth_provider: 'supabase',
        permissions: permissions || COLABORADOR_PERMISSIONS, // ✅ Usar permissions do body ou preset padrão
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

    // ✅ Passo 3: Gerar link de definir senha
    devLog.log('[API Team Members] Gerando link de definir senha...');

    // ✅ SOLUÇÃO FINAL: Redirect direto sem callback
    // O Supabase vai colocar os tokens no hash fragment (#access_token=...)
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/nova-senha`;

    const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
      }
    });

    if (resetError) {
      devLog.error('[API Team Members] Erro ao gerar link de senha:', resetError);
      // Não falhar a criação do usuário por causa do link
    } else {
      const passwordResetLink = resetData.properties.action_link || '';
      devLog.log('[API Team Members] Link de senha gerado com sucesso');
      devLog.log('[API Team Members] Link:', passwordResetLink);
      devLog.log('[API Team Members] Redirect URL configurado:', redirectUrl);

      // ✅ Passo 4: Enviar email de boas-vindas com link
      try {
        const { sendTeamMemberWelcomeEmail } = await import('@/lib/services/emailService');
        const emailSent = await sendTeamMemberWelcomeEmail(
          email,
          name,
          passwordResetLink
        );

        if (emailSent) {
          devLog.log('[API Team Members] Email de boas-vindas enviado com sucesso');
        } else {
          devLog.warn('[API Team Members] Falha ao enviar email de boas-vindas');
        }
      } catch (emailError) {
        devLog.error('[API Team Members] Erro ao enviar email de boas-vindas:', emailError);
        // Não falhar a criação do usuário por causa do email
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: role, // ✅ Retornar role original do frontend (admin ou colaborador)
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
    const { id, name, phone, department, role, permissions } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'ID e nome são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Preparar dados de atualização
    const updateData: any = {
      name,
      phone: phone || null,
      department: department || 'Engenharia',
      updated_at: new Date().toISOString()
    };

    // Se role ou permissions foram fornecidos, incluir na atualização
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;

    // Atualizar usuário
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
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
        role: updatedUser.role, // ✅ Retornar role real do banco
        permissions: updatedUser.permissions, // ✅ Retornar permissions atualizadas
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

    // ✅ CORREÇÃO: Excluir permanentemente do banco de dados
    devLog.log('[API Team Members] Excluindo usuário do banco de dados...');

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('tenant_id', tenantId);

    if (deleteError) {
      devLog.error('[API Team Members] Erro ao excluir usuário do DB:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao remover membro da equipe do banco de dados' },
        { status: 500 }
      );
    }

    // ✅ CORREÇÃO: Excluir também do Supabase Auth
    devLog.log('[API Team Members] Excluindo usuário do Auth...');

    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      devLog.error('[API Team Members] Erro ao excluir usuário do Auth:', authDeleteError);
      devLog.warn('[API Team Members] Usuário removido do DB mas falhou ao remover do Auth');
    } else {
      devLog.log('[API Team Members] Usuário excluído do Auth com sucesso');
    }

    devLog.log('[API Team Members] Usuário excluído permanentemente:', userId);

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
