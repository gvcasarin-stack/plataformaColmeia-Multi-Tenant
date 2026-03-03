import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks
 * Busca todas as tarefas do tenant atual
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[GET /api/tasks] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    devLog.log('[GET /api/tasks] Buscando tarefas do tenant:', tenantId);

    const supabase = createSupabaseServiceRoleClient();

    // Buscar tarefas do tenant com informações relacionadas
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        opportunity:opportunities(id, title),
        assigned_user:users!tasks_assigned_to_fkey(id, name, email),
        created_by_user:users!tasks_created_by_fkey(id, name, email)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[GET /api/tasks] Erro ao buscar tarefas:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[GET /api/tasks] Tarefas encontradas:', data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    devLog.error('[GET /api/tasks] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar tarefas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Cria uma nova tarefa no sistema
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/tasks] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { created_by, ...taskData } = body;

    if (!created_by) {
      devLog.error('[POST /api/tasks] User ID não fornecido');
      return NextResponse.json(
        { error: 'Usuário não identificado' },
        { status: 400 }
      );
    }

    // Validar campo obrigatório: title
    if (!taskData.title || taskData.title.trim() === '') {
      return NextResponse.json(
        { error: 'Título da tarefa é obrigatório' },
        { status: 400 }
      );
    }

    // Validar campo obrigatório: priority
    if (!taskData.priority) {
      return NextResponse.json(
        { error: 'Prioridade é obrigatória' },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/tasks] Criando tarefa:', {
      title: taskData.title,
      priority: taskData.priority,
      tenant_id: tenantId
    });

    const supabase = createSupabaseServiceRoleClient();

    // Criar a tarefa
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        tenant_id: tenantId,
        created_by,
        completed: false
      })
      .select(`
        *,
        opportunity:opportunities(id, title),
        assigned_user:users!tasks_assigned_to_fkey(id, name, email),
        created_by_user:users!tasks_created_by_fkey(id, name, email)
      `)
      .single();

    if (error) {
      devLog.error('[POST /api/tasks] Erro ao criar tarefa:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[POST /api/tasks] Tarefa criada com sucesso:', newTask?.id);

    return NextResponse.json({
      success: true,
      data: newTask
    });

  } catch (error: any) {
    devLog.error('[POST /api/tasks] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar tarefa' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks
 * Atualiza o status de conclusão de uma tarefa
 */
export async function PATCH(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, completed } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da tarefa é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('tasks')
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[PATCH /api/tasks] Erro ao atualizar tarefa:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    devLog.error('[PATCH /api/tasks] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar tarefa' },
      { status: 500 }
    );
  }
}
