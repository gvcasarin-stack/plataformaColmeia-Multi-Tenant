/**
 * Endpoint dedicado para mudança de status de projeto no Kanban (/admin/projetos).
 *
 * Criado para unificar o comportamento do drag-and-drop e do menu de "3 pontinhos"
 * (Mudar Status), que antes seguiam caminhos diferentes: o drag-and-drop calculava o
 * prazo de SLA mas passava pela Server Action `editProjectAction`, cujo `revalidatePath`
 * força o Next.js a buscar novamente os Server Components da página — o que causava a
 * sensação de "tela inteira atualizando" e, em movimentos rápidos e sucessivos, podia
 * sobrescrever o estado otimista local. Já o menu de 3 pontinhos usava um fetch direto
 * (rápido, sem revalidação), mas não calculava o SLA nem registrava o evento de timeline.
 *
 * Esta rota concentra a lógica correta (SLA + evento de timeline + notificação ao
 * cliente) num único Route Handler — que, ao contrário de uma Server Action, nunca
 * dispara revalidação automática de RSC — para que os dois fluxos do Kanban fiquem
 * rápidos e corretos ao mesmo tempo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { waitUntil } from '@vercel/functions';
import { devLog } from '@/lib/utils/productionLogger';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createApiError, ApiErrorCode } from '@/lib/utils/apiErrorHandler';
import { canEditProjects } from '@/lib/utils/check-permissions';
import { calculateSLAExpiration } from '@/lib/utils/sla-calculator';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return createApiError('Acesso negado: tenant não identificado', ApiErrorCode.FORBIDDEN, 403);
    }

    const body = await request.json();
    const newStatusSlug: string | undefined = body?.status;
    const userId: string | undefined = body?.userId;
    const userName: string | undefined = body?.userName;
    const userEmail: string | undefined = body?.userEmail;
    const userRole: string | undefined = body?.userRole;

    if (!newStatusSlug) {
      return createApiError('Status é obrigatório', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const supabase = createSupabaseServiceRoleClient();

    // Permissões (mesmo padrão da rota genérica PUT /api/projects/[id])
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', userId)
        .eq('tenant_id', tenantId)
        .single();

      if (userData && !canEditProjects(userData)) {
        return createApiError('Você não tem permissão para editar projetos', ApiErrorCode.FORBIDDEN, 403);
      }
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, tenant_id, status, number, nome_cliente_final, owner_id, created_by')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (projectError || !project) {
      return createApiError('Projeto não encontrado', ApiErrorCode.NOT_FOUND, 404);
    }

    const oldStatusSlug = project.status;

    // Busca status antigo e novo de uma vez (nome de exibição + config de SLA do novo status)
    const { data: statusRows } = await supabase
      .from('project_statuses')
      .select('id, slug, name, sla_days, sla_exclude_weekends, is_active')
      .eq('tenant_id', tenantId)
      .in('slug', Array.from(new Set([oldStatusSlug, newStatusSlug])));

    const newStatus = statusRows?.find(s => s.slug === newStatusSlug && s.is_active);
    const oldStatus = statusRows?.find(s => s.slug === oldStatusSlug);

    if (!newStatus) {
      return createApiError('Status de projeto inválido para este tenant', ApiErrorCode.VALIDATION_ERROR, 400);
    }

    const now = new Date();
    let slaExpiresAt: string | null = null;

    if (newStatus.sla_days && newStatus.sla_days > 0) {
      const excludeWeekends = newStatus.sla_exclude_weekends !== undefined ? newStatus.sla_exclude_weekends : true;
      slaExpiresAt = calculateSLAExpiration(now, newStatus.sla_days, excludeWeekends).toISOString();
    }

    const updateData: Record<string, any> = {
      status: newStatusSlug,
      status_changed_at: now.toISOString(),
      sla_expires_at: slaExpiresAt,
      sla_expired: false,
      updated_at: now.toISOString(),
    };

    if (userId) {
      updateData.last_update_by = {
        uid: userId,
        email: userEmail || null,
        role: userRole || 'admin',
        timestamp: now.toISOString(),
      };
    }

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .select('id, status, status_changed_at, sla_expires_at, sla_expired')
      .single();

    if (updateError || !updatedProject) {
      devLog.error('[API change-status] Erro ao atualizar status:', updateError);
      return createApiError('Erro ao atualizar status do projeto', ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
    }

    const statusReallyChanged = oldStatusSlug !== newStatusSlug;

    // Evento de timeline (não crítico — não deve falhar a resposta principal)
    if (statusReallyChanged) {
      try {
        const oldName = oldStatus?.name || oldStatusSlug;
        const newName = newStatus.name;
        const slaSuffix = slaExpiresAt && newStatus.sla_days
          ? ` (Prazo: ${newStatus.sla_days} dia${newStatus.sla_days !== 1 ? 's' : ''})`
          : '';

        const timelineContent = `Status alterado de ${oldName} para ${newName}${slaSuffix}`;
        const timelineMetadata = {
          isSystemGenerated: false,
          isStatusChange: true,
          userType: userRole || null,
          data: {
            oldStatus: oldStatusSlug,
            newStatus: newStatusSlug,
            updatedBy: userName || null,
            updatedByEmail: userEmail || null,
            updatedByRole: userRole || null,
          },
        };

        const { error: timelineInsertError } = await supabase.from('project_timeline_events').insert({
          id: randomUUID(),
          project_id: projectId,
          tenant_id: tenantId,
          type: 'status',
          user_id: userId || null,
          user_name: userName || null,
          content: timelineContent,
          old_status: oldStatusSlug,
          new_status: newStatusSlug,
          visibility: 'all',
          metadata: timelineMetadata,
          created_at: now.toISOString(),
        });

        if (timelineInsertError) {
          if (timelineInsertError.code === '23505') {
            // Colisão esperada: a trigger do banco (trg_log_project_status_change) já
            // gravou um evento "Sistema" com este mesmo timestamp (idx_pte_status_dedup
            // evita duas linhas para a mesma transição). Em vez de duplicar, corrige
            // esse registro para refletir o usuário real que fez a mudança.
            const { error: fixError } = await supabase
              .from('project_timeline_events')
              .update({ user_id: userId || null, user_name: userName || null, content: timelineContent, metadata: timelineMetadata })
              .eq('project_id', projectId)
              .eq('type', 'status')
              .eq('old_status', oldStatusSlug)
              .eq('new_status', newStatusSlug)
              .eq('created_at', now.toISOString());
            if (fixError) devLog.error('[API change-status] Erro ao corrigir atribuição do evento de timeline:', fixError);
          } else {
            devLog.error('[API change-status] Erro ao gravar evento de timeline (não crítico):', timelineInsertError);
          }
        }
      } catch (timelineError) {
        devLog.error('[API change-status] Erro ao gravar evento de timeline (não crítico):', timelineError);
      }
    }

    // Notificação ao cliente (in-app + e-mail): não deve bloquear a resposta ao Kanban.
    // O envio de e-mail (AWS SES) é a parte mais lenta dessa rota; usamos waitUntil para
    // que a função continue executando em segundo plano após a resposta já ter sido
    // enviada, em vez de simplesmente não aguardar a promise (o que em ambiente
    // serverless poderia encerrar a execução antes do e-mail sair).
    if (statusReallyChanged) {
      const clientId = project.owner_id || project.created_by;
      if (clientId) {
        waitUntil(
          (async () => {
            try {
              const { notifyStatusChange } = await import('@/lib/services/notificationService');
              await notifyStatusChange({
                projectId,
                projectNumber: project.number,
                projectName: project.nome_cliente_final,
                oldStatus: oldStatusSlug,
                newStatus: newStatusSlug,
                clientId,
                adminId: userId,
                adminName: userName,
              });
            } catch (notificationError) {
              devLog.error('[API change-status] Erro ao notificar cliente (não crítico):', notificationError);
            }
          })()
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: updatedProject.status,
        status_changed_at: updatedProject.status_changed_at,
        sla_expires_at: updatedProject.sla_expires_at,
        sla_expired: updatedProject.sla_expired,
      },
    });
  } catch (error) {
    devLog.error('[API change-status] Erro inesperado:', error);
    return createApiError('Erro interno do servidor', ApiErrorCode.INTERNAL_SERVER_ERROR, 500);
  }
}
