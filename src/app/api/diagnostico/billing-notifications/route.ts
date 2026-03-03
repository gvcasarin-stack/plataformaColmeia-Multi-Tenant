import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server';
import { createNotificationDirectly, createNotificationForAllAdmins } from '@/lib/services/notificationService/core';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de Diagnóstico: Billing Notifications
 *
 * Objetivo: Rastrear por que notificações de billing não estão sendo enviadas
 *
 * Uso: GET /api/diagnostico/billing-notifications?userId=xxx
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    testes: {}
  };

  try {
    // 1. Obter userId dos parâmetros
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId é obrigatório',
        exemplo: '/api/diagnostico/billing-notifications?userId=xxx'
      }, { status: 400 });
    }

    diagnostico.userId = userId;

    const supabase = createSupabaseServiceRoleClient();

    // ========================================
    // TESTE 1: Verificar dados do usuário
    // ========================================
    devLog.log('[DiagBilling] TESTE 1: Buscando dados do usuário...');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, tenant_id, role')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      diagnostico.testes.usuario = {
        success: false,
        erro: userError?.message || 'Usuário não encontrado'
      };

      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado',
        diagnostico
      }, { status: 404 });
    }

    diagnostico.testes.usuario = {
      success: true,
      dados: {
        id: userData.id,
        email: userData.email,
        nome: userData.name,
        tenant_id: userData.tenant_id,
        role: userData.role
      }
    };

    devLog.log('[DiagBilling] ✅ TESTE 1 OK - Usuário encontrado');

    // ========================================
    // TESTE 2: Verificar assinatura ativa
    // ========================================
    devLog.log('[DiagBilling] TESTE 2: Buscando assinatura ativa...');

    const { data: assinaturasData, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        plano_id,
        projetos_mensais,
        projetos_usados_mes_atual,
        dia_renovacao,
        proximo_reset,
        status,
        data_inicio,
        planos_assinatura:plano_id (
          nome,
          quantidade_mensal,
          valor_mensal
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'ativa')
      .order('data_inicio', { ascending: false })
      .limit(1);

    if (assinaturasError || !assinaturasData || assinaturasData.length === 0) {
      diagnostico.testes.assinatura = {
        success: false,
        erro: assinaturasError?.message || 'Nenhuma assinatura ativa encontrada',
        info: 'Usuário não tem assinatura ativa. Notificações de billing só são enviadas para usuários com pacote/assinatura.'
      };

      devLog.log('[DiagBilling] ⚠️ TESTE 2 AVISO - Sem assinatura ativa');
    } else {
      const assinatura = assinaturasData[0];
      const projetosDisponiveis = assinatura.projetos_mensais - assinatura.projetos_usados_mes_atual;

      diagnostico.testes.assinatura = {
        success: true,
        dados: {
          id: assinatura.id,
          plano_nome: assinatura.planos_assinatura?.nome || 'N/A',
          projetos_mensais: assinatura.projetos_mensais,
          projetos_usados: assinatura.projetos_usados_mes_atual,
          projetos_disponiveis: projetosDisponiveis,
          status: assinatura.status,
          quota_esgotada: projetosDisponiveis <= 0,
          ultimo_projeto: projetosDisponiveis === 1
        }
      };

      devLog.log('[DiagBilling] ✅ TESTE 2 OK - Assinatura encontrada:', {
        projetosDisponiveis,
        quotaEsgotada: projetosDisponiveis <= 0
      });
    }

    // ========================================
    // TESTE 3: Verificar pacote ativo
    // ========================================
    devLog.log('[DiagBilling] TESTE 3: Buscando pacote ativo...');

    const { data: pacotesData, error: pacotesError } = await supabase
      .from('cliente_pacotes')
      .select(`
        id,
        pacote_id,
        projetos_inclusos,
        projetos_usados,
        data_expiracao,
        status,
        pacotes_definicoes:pacote_id (
          nome,
          quantidade_projetos,
          valor
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'ativo')
      .gte('data_expiracao', new Date().toISOString())
      .order('data_expiracao', { ascending: false })
      .limit(1);

    if (pacotesError || !pacotesData || pacotesData.length === 0) {
      diagnostico.testes.pacote = {
        success: false,
        erro: pacotesError?.message || 'Nenhum pacote ativo encontrado'
      };

      devLog.log('[DiagBilling] ⚠️ TESTE 3 AVISO - Sem pacote ativo');
    } else {
      const pacote = pacotesData[0];
      const projetosDisponiveis = pacote.projetos_inclusos - pacote.projetos_usados;

      diagnostico.testes.pacote = {
        success: true,
        dados: {
          id: pacote.id,
          nome: pacote.pacotes_definicoes?.nome || 'N/A',
          projetos_inclusos: pacote.projetos_inclusos,
          projetos_usados: pacote.projetos_usados,
          projetos_disponiveis: projetosDisponiveis,
          data_expiracao: pacote.data_expiracao,
          quota_esgotada: projetosDisponiveis <= 0,
          ultimo_projeto: projetosDisponiveis === 1
        }
      };

      devLog.log('[DiagBilling] ✅ TESTE 3 OK - Pacote encontrado:', {
        projetosDisponiveis,
        quotaEsgotada: projetosDisponiveis <= 0
      });
    }

    // ========================================
    // TESTE 4: Simular criação de notificação para o cliente
    // ========================================
    devLog.log('[DiagBilling] TESTE 4: Simulando notificação para cliente...');

    try {
      const notificationResult = await createNotificationDirectly({
        type: 'warning',
        title: '[TESTE] Diagnóstico de Billing',
        message: `Esta é uma notificação de teste do sistema de diagnóstico. Se você está vendo isso, significa que as notificações para clientes estão funcionando.`,
        userId: userData.id,
        senderId: 'system',
        senderName: 'Sistema de Diagnóstico',
        senderType: 'system',
        link: '/cliente/painel',
        data: {
          teste: true,
          timestamp: new Date().toISOString()
        }
      });

      diagnostico.testes.notificacao_cliente = {
        success: true,
        notificationId: notificationResult.notificationId,
        mensagem: 'Notificação criada com sucesso. Verifique o painel do cliente.'
      };

      devLog.log('[DiagBilling] ✅ TESTE 4 OK - Notificação para cliente criada:', notificationResult.notificationId);

    } catch (error: any) {
      diagnostico.testes.notificacao_cliente = {
        success: false,
        erro: error.message,
        stack: error.stack,
        mensagem: 'ERRO AO CRIAR NOTIFICAÇÃO PARA CLIENTE - Este é o problema!'
      };

      devLog.error('[DiagBilling] ❌ TESTE 4 FALHOU - Erro ao criar notificação:', error);
    }

    // ========================================
    // TESTE 5: Buscar último projeto criado pelo usuário
    // ========================================
    devLog.log('[DiagBilling] TESTE 5: Buscando último projeto...');

    const { data: lastProject, error: projectError } = await supabase
      .from('projects')
      .select('id, number, name, created_at, billing_mode, billing_snapshot, tenant_id')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (projectError || !lastProject) {
      diagnostico.testes.ultimo_projeto = {
        success: false,
        erro: projectError?.message || 'Nenhum projeto encontrado'
      };

      devLog.log('[DiagBilling] ⚠️ TESTE 5 AVISO - Sem projetos');
    } else {
      diagnostico.testes.ultimo_projeto = {
        success: true,
        dados: {
          id: lastProject.id,
          numero: lastProject.number,
          nome: lastProject.name,
          billing_mode: lastProject.billing_mode,
          billing_snapshot: lastProject.billing_snapshot,
          tenant_id: lastProject.tenant_id,
          criado_em: lastProject.created_at
        }
      };

      devLog.log('[DiagBilling] ✅ TESTE 5 OK - Último projeto encontrado');

      // ========================================
      // TESTE 6: Simular notificação para admins usando o projeto
      // ========================================
      devLog.log('[DiagBilling] TESTE 6: Simulando notificação para admins...');

      try {
        const adminNotificationIds = await createNotificationForAllAdmins({
          type: 'info',
          title: '[TESTE] Diagnóstico de Billing - Admin',
          message: `Cliente ${userData.name || userData.email} - Teste de notificação para administradores.`,
          senderId: 'system',
          senderName: 'Sistema de Diagnóstico',
          senderType: 'system',
          projectId: lastProject.id,
          projectNumber: lastProject.number,
          link: `/admin/projetos/${lastProject.id}`,
          data: {
            teste: true,
            userId: userData.id,
            timestamp: new Date().toISOString()
          }
        });

        diagnostico.testes.notificacao_admins = {
          success: true,
          admins_notificados: adminNotificationIds.length,
          notificationIds: adminNotificationIds,
          mensagem: `${adminNotificationIds.length} administrador(es) notificado(s). Verifique o painel admin.`
        };

        devLog.log('[DiagBilling] ✅ TESTE 6 OK - Notificações para admins criadas:', adminNotificationIds.length);

      } catch (error: any) {
        diagnostico.testes.notificacao_admins = {
          success: false,
          erro: error.message,
          stack: error.stack,
          mensagem: 'ERRO AO CRIAR NOTIFICAÇÃO PARA ADMINS - Este é o problema!'
        };

        devLog.error('[DiagBilling] ❌ TESTE 6 FALHOU - Erro ao criar notificação para admins:', error);
      }
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    const totalTestes = Object.keys(diagnostico.testes).length;
    const testesSucesso = Object.values(diagnostico.testes).filter((t: any) => t.success).length;
    const testesFalha = totalTestes - testesSucesso;

    diagnostico.resumo = {
      total_testes: totalTestes,
      testes_sucesso: testesSucesso,
      testes_falha: testesFalha,
      duracao_ms: Date.now() - startTime,
      status: testesFalha === 0 ? '✅ TODOS OS TESTES PASSARAM' : '⚠️ ALGUNS TESTES FALHARAM',
      proximos_passos: testesFalha > 0
        ? 'Verificar logs de erro nos testes que falharam. O problema está identificado.'
        : 'Sistema de notificações está funcionando. Se ainda não recebe notificações, verificar lógica de geração de warnings em multi-tenant-project-actions.ts'
    };

    devLog.log('[DiagBilling] DIAGNÓSTICO COMPLETO:', diagnostico.resumo);

    return NextResponse.json({
      success: true,
      diagnostico
    });

  } catch (error: any) {
    devLog.error('[DiagBilling] ERRO CRÍTICO no diagnóstico:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      diagnostico
    }, { status: 500 });
  }
}
