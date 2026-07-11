import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de Gerenciamento de Status de Projetos Multi-Tenant
 * GET /api/project-statuses - Listar status do tenant
 * POST /api/project-statuses - Criar novo status
 */

export async function GET(request: NextRequest) {
  try {
    devLog.log('[project-statuses] GET - Listando status de projetos');

    // Obter tenant_id dos headers do middleware
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Usar função SQL para buscar status com contagem de projetos
    const { data: statuses, error } = await supabase.rpc('get_tenant_project_statuses', {
      p_tenant_id: tenantId
    });

    if (error) {
      devLog.error('[project-statuses] Erro ao buscar status via função SQL, tentando busca direta:', error);

      // Fallback: busca direta na tabela
      const { data: fallbackStatuses, error: fallbackError } = await supabase
        .from('project_statuses')
        .select(`
          id,
          name,
          slug,
          color,
          order_index,
          is_default,
          icon,
          is_active,
          sla_days,
          sla_exclude_weekends,
          is_conclusion,
          visible_in_roadmap
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (fallbackError) {
        devLog.error('[project-statuses] Fallback também falhou:', fallbackError);

        // Último fallback: retornar status padrão básicos
        const defaultStatuses = [
          { id: 'default-1', name: 'Não Iniciado', slug: 'nao-iniciado', color: '#f59e0b', order_index: 1, is_default: true, project_count: 0 },
          { id: 'default-2', name: 'Em Desenvolvimento', slug: 'em-desenvolvimento', color: '#3b82f6', order_index: 2, is_default: true, project_count: 0 },
          { id: 'default-3', name: 'Finalizado', slug: 'finalizado', color: '#22c55e', order_index: 9, is_default: true, project_count: 0 }
        ];

        devLog.log('[project-statuses] Retornando status padrão mínimos');
        return NextResponse.json({
          success: true,
          data: defaultStatuses,
          count: defaultStatuses.length,
          fallback: 'default'
        });
      }

      // Mapear dados do fallback para formato esperado
      const mappedStatuses = (fallbackStatuses || []).map(status => ({
        ...status,
        order: status.order_index,
        project_count: 0 // Não temos contagem no fallback
      }));

      devLog.log('[project-statuses] Status encontrados via fallback:', {
        tenantId,
        count: mappedStatuses.length
      });

      return NextResponse.json({
        success: true,
        data: mappedStatuses,
        count: mappedStatuses.length,
        fallback: 'direct'
      });
    }

    // Se não houve erro, retornar dados normalmente
    if (!statuses || statuses.length === 0) {
      devLog.warn('[project-statuses] Tenant sem status, pode ser novo tenant');

      // Tentar criar status padrão para tenant novo
      try {
        const { error: createError } = await supabase.rpc('create_default_project_statuses', {
          p_tenant_id: tenantId
        });

        if (!createError) {
          // Se criou com sucesso, buscar novamente
          const { data: newStatuses } = await supabase.rpc('get_tenant_project_statuses', {
            p_tenant_id: tenantId
          });

          if (newStatuses && newStatuses.length > 0) {
            devLog.log('[project-statuses] Status padrão criados automaticamente para novo tenant');
            return NextResponse.json({
              success: true,
              data: newStatuses,
              count: newStatuses.length,
              auto_created: true
            });
          }
        }
      } catch (autoCreateError) {
        devLog.warn('[project-statuses] Falha na criação automática (não crítico):', autoCreateError);
      }
    }

    devLog.log('[project-statuses] Status encontrados:', {
      tenantId,
      count: statuses?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: statuses || [],
      count: statuses?.length || 0
    });

  } catch (error) {
    devLog.error('[project-statuses] Erro inesperado no GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    devLog.log('[project-statuses] POST - Criando novo status');

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
    const { name, color = '#6b7280', icon, insert_after_id } = body;

    // Validações
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

    // Gerar slug a partir do nome
    const slug = name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífen
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, ''); // Remove hífens do início e fim

    if (slug.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nome do status deve conter pelo menos um caractere válido'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar status ativos existentes, ordenados — usado para calcular o próximo
    // order_index (sempre no final, opção segura) e, se uma posição específica foi
    // pedida, para recalcular a ordem final depois de inserir
    const { data: existingStatuses } = await supabase
      .from('project_statuses')
      .select('id, order_index')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    const existingList = existingStatuses || [];
    const nextOrderIndex = (existingList.length > 0
      ? Math.max(...existingList.map((s) => s.order_index))
      : 0) + 1;

    // Inserir novo status sempre com order_index seguro (final da lista);
    // reposicionamento (se solicitado) é feito depois, num segundo passo
    const { data: newStatus, error } = await supabase
      .from('project_statuses')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        slug: slug,
        color: color,
        icon: icon || null,
        order_index: nextOrderIndex,
        is_default: false,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      devLog.error('[project-statuses] Erro ao criar status:', error);

      // Erro de duplicação
      if (error.code === '23505') {
        if (error.message.includes('slug')) {
          return NextResponse.json({
            success: false,
            error: 'Já existe um status com nome similar'
          }, { status: 409 });
        }
        if (error.message.includes('name')) {
          return NextResponse.json({
            success: false,
            error: 'Já existe um status com esse nome'
          }, { status: 409 });
        }
      }

      return NextResponse.json({
        success: false,
        error: 'Erro ao criar status'
      }, { status: 500 });
    }

    // 🆕 Reposicionar, se uma posição específica foi solicitada (insert_after_id).
    // Sem esse parâmetro, o comportamento padrão (inserir no final) é mantido.
    if (insert_after_id) {
      const afterIndex = existingList.findIndex((s) => s.id === insert_after_id);

      if (afterIndex !== -1) {
        const finalOrderIds = [
          ...existingList.slice(0, afterIndex + 1).map((s) => s.id),
          newStatus.id,
          ...existingList.slice(afterIndex + 1).map((s) => s.id),
        ];

        // Só precisa renumerar se a posição pedida não for já o final
        if (afterIndex + 1 < existingList.length) {
          // Fase 1: mover todos os existentes para uma faixa temporária alta,
          // evitando qualquer colisão de order_index durante a renumeração
          for (let i = 0; i < existingList.length; i++) {
            await supabase
              .from('project_statuses')
              .update({ order_index: 1000000 + i })
              .eq('id', existingList[i].id)
              .eq('tenant_id', tenantId);
          }

          // Fase 2: aplicar a ordem final sequencial (1..N)
          for (let i = 0; i < finalOrderIds.length; i++) {
            await supabase
              .from('project_statuses')
              .update({ order_index: i + 1 })
              .eq('id', finalOrderIds[i])
              .eq('tenant_id', tenantId);
          }

          newStatus.order_index = afterIndex + 2;
        }
      }
    }

    devLog.log('[project-statuses] Status criado com sucesso:', {
      statusId: newStatus.id,
      name: newStatus.name,
      slug: newStatus.slug
    });

    return NextResponse.json({
      success: true,
      data: newStatus,
      message: 'Status criado com sucesso'
    });

  } catch (error) {
    devLog.error('[project-statuses] Erro inesperado no POST:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}