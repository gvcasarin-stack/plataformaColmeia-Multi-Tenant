import { NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para Verificação de SLAs Expirados
 * POST /api/sla/check-expired - Verifica e marca projetos com SLA expirado
 *
 * Esta API deve ser chamada periodicamente (ex: a cada hora) por um cron job
 * ou similar para manter o status de expiração atualizado.
 *
 * Processo:
 * 1. Busca projetos onde sla_expires_at < now() e sla_expired = false
 * 2. Marca esses projetos como sla_expired = true
 * 3. Adiciona evento na timeline do projeto
 * 4. Retorna lista de projetos que foram marcados como expirados
 */

export async function POST() {
  try {
    devLog.log('[sla-check] Iniciando verificação de SLAs expirados');

    const supabase = createSupabaseServiceRoleClient();
    const now = new Date().toISOString();

    // Buscar projetos com SLA expirado que ainda não foram marcados
    const { data: expiredProjects, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id,
        number,
        nome_cliente_final,
        status,
        tenant_id,
        sla_expires_at,
        adminResponsibleEmail:admin_responsible_email
      `)
      .lt('sla_expires_at', now)
      .eq('sla_expired', false)
      .not('sla_expires_at', 'is', null);

    if (fetchError) {
      devLog.error('[sla-check] Erro ao buscar projetos expirados:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar projetos expirados'
      }, { status: 500 });
    }

    if (!expiredProjects || expiredProjects.length === 0) {
      devLog.log('[sla-check] Nenhum projeto com SLA expirado encontrado');
      return NextResponse.json({
        success: true,
        expiredCount: 0,
        message: 'Nenhum projeto com SLA expirado'
      });
    }

    devLog.log(`[sla-check] Encontrados ${expiredProjects.length} projeto(s) com SLA expirado`);

    // Marcar projetos como expirados
    const projectIds = expiredProjects.map(p => p.id);

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        sla_expired: true,
        updated_at: now
      })
      .in('id', projectIds);

    if (updateError) {
      devLog.error('[sla-check] Erro ao marcar projetos como expirados:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao atualizar projetos expirados'
      }, { status: 500 });
    }

    // Adicionar eventos na timeline de cada projeto
    const timelineEvents = expiredProjects.map(project => ({
      project_id: project.id,
      tenant_id: project.tenant_id,
      type: 'sla_expired',
      title: 'SLA Expirado',
      description: `O prazo para o status "${project.status}" foi excedido.`,
      icon: 'AlertTriangle',
      color: 'red',
      created_at: now,
      created_by: 'system'
    }));

    const { error: timelineError } = await supabase
      .from('timeline_events')
      .insert(timelineEvents);

    if (timelineError) {
      devLog.error('[sla-check] Erro ao criar eventos de timeline:', timelineError);
      // Não falha a operação, apenas registra o erro
    }

    devLog.log(`[sla-check] ${expiredProjects.length} projeto(s) marcado(s) como expirados com sucesso`);

    // Retornar lista de projetos expirados (pode ser usado para enviar notificações)
    const expiredList = expiredProjects.map(p => ({
      id: p.id,
      number: p.number,
      clientName: p.nome_cliente_final,
      status: p.status,
      tenantId: p.tenant_id,
      slaExpiresAt: p.sla_expires_at,
      adminEmail: p.adminResponsibleEmail
    }));

    return NextResponse.json({
      success: true,
      expiredCount: expiredProjects.length,
      expiredProjects: expiredList,
      message: `${expiredProjects.length} projeto(s) marcado(s) como expirado(s)`
    });

  } catch (error) {
    devLog.error('[sla-check] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

/**
 * GET endpoint para verificação manual ou teste
 */
export async function GET() {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const now = new Date().toISOString();

    // Apenas retorna contagem de projetos que seriam marcados como expirados
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .lt('sla_expires_at', now)
      .eq('sla_expired', false)
      .not('sla_expires_at', 'is', null);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar projetos'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pendingExpiredCount: count || 0,
      message: `${count || 0} projeto(s) pendente(s) para marcar como expirado(s)`
    });

  } catch (error) {
    devLog.error('[sla-check] Erro inesperado no GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}
