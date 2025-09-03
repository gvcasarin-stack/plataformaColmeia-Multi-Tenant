import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API DE TESTE - FLUXO COMPLETO DE COMENTÁRIO
 * Simula todo o fluxo de quando um comentário é adicionado
 */
export async function POST(request: NextRequest) {
  console.log('💬 [TEST-COMMENT-FLOW] =================================');
  console.log('💬 [TEST-COMMENT-FLOW] TESTE DE FLUXO DE COMENTÁRIO');
  console.log('💬 [TEST-COMMENT-FLOW] Timestamp:', new Date().toISOString());
  
  const results = {
    steps: [] as any[],
    errors: [] as any[],
    success: false
  };
  
  try {
    const body = await request.json();
    const { projectId, authorId, commentText, isAdmin } = body;
    
    console.log('💬 [TEST-COMMENT-FLOW] Parâmetros:', {
      projectId,
      authorId,
      commentText,
      isAdmin
    });
    
    if (!projectId || !authorId || !commentText) {
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: projectId, authorId, commentText, isAdmin' 
      }, { status: 400 });
    }
    
    const supabase = createSupabaseServiceRoleClient();
    
    // PASSO 1: Buscar dados do projeto
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 1: Buscando projeto...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, created_by, tenant_id, nome_cliente_final, number')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      results.errors.push({ step: 1, error: 'Projeto não encontrado', details: projectError });
      console.error('❌ Projeto não encontrado');
      return NextResponse.json(results, { status: 404 });
    }
    
    results.steps.push({
      step: 1,
      success: true,
      data: {
        projectName: project.nome_cliente_final,
        projectNumber: project.number,
        clientId: project.created_by,
        tenantId: project.tenant_id
      }
    });
    
    // PASSO 2: Buscar dados do autor
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 2: Buscando autor...');
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('*, tenant_id')
      .eq('id', authorId)
      .single();
    
    if (authorError || !author) {
      results.errors.push({ step: 2, error: 'Autor não encontrado', details: authorError });
      console.error('❌ Autor não encontrado');
      return NextResponse.json(results, { status: 404 });
    }
    
    results.steps.push({
      step: 2,
      success: true,
      data: {
        authorName: author.name || author.full_name || author.email,
        authorRole: author.role,
        authorTenantId: author.tenant_id
      }
    });
    
    // PASSO 3: Verificar isolamento multi-tenant
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 3: Verificando isolamento...');
    if (project.tenant_id !== author.tenant_id) {
      results.errors.push({ 
        step: 3, 
        error: 'VIOLAÇÃO DE TENANT!',
        details: `Projeto tenant: ${project.tenant_id}, Autor tenant: ${author.tenant_id}`
      });
      console.error('❌ VIOLAÇÃO DE TENANT!');
    } else {
      results.steps.push({
        step: 3,
        success: true,
        message: 'Isolamento OK - mesmo tenant'
      });
    }
    
    // PASSO 4: Determinar destinatários
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 4: Determinando destinatários...');
    let recipients: any[] = [];
    
    if (isAdmin) {
      // Admin comentou -> notificar cliente
      console.log('💬 Admin comentou -> buscando cliente...');
      const { data: client, error: clientError } = await supabase
        .from('users')
        .select('*')
        .eq('id', project.created_by)
        .single();
      
      if (client) {
        recipients.push({
          type: 'client',
          id: client.id,
          email: client.email,
          name: client.name || client.full_name
        });
      }
    } else {
      // Cliente comentou -> notificar admins do mesmo tenant
      console.log('💬 Cliente comentou -> buscando admins do tenant...');
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', project.tenant_id)
        .in('role', ['admin', 'superadmin']);
      
      if (admins) {
        admins.forEach(admin => {
          recipients.push({
            type: 'admin',
            id: admin.id,
            email: admin.email,
            name: admin.name || admin.full_name
          });
        });
      }
    }
    
    results.steps.push({
      step: 4,
      success: true,
      data: {
        recipientCount: recipients.length,
        recipients: recipients.map(r => ({
          type: r.type,
          email: r.email,
          name: r.name
        }))
      }
    });
    
    // PASSO 5: Testar criação de notificações
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 5: Testando notificações...');
    try {
      const { notifyNewComment } = await import('@/lib/services/notificationService');
      
      console.log('💬 Chamando notifyNewComment com:', {
        projectId,
        projectNumber: project.number,
        projectName: project.nome_cliente_final,
        commentText,
        authorId,
        authorName: author.name || author.email,
        authorRole: author.role,
        clientId: project.created_by
      });
      
      const notifyResult = await notifyNewComment({
        projectId,
        projectNumber: project.number,
        projectName: project.nome_cliente_final,
        commentText,
        authorId,
        authorName: author.name || author.email,
        authorRole: author.role,
        clientId: project.created_by,
        clientName: recipients.find(r => r.type === 'client')?.name
      });
      
      results.steps.push({
        step: 5,
        success: true,
        data: {
          notificationIds: notifyResult.notificationIds,
          emailSent: notifyResult.emailSent
        }
      });
      
    } catch (notifyError: any) {
      results.errors.push({ 
        step: 5, 
        error: 'Erro ao notificar',
        details: notifyError.message,
        stack: notifyError.stack
      });
      console.error('❌ Erro ao chamar notifyNewComment:', notifyError);
    }
    
    // PASSO 6: Verificar notificações criadas
    console.log('💬 [TEST-COMMENT-FLOW] PASSO 6: Verificando notificações no banco...');
    const { data: recentNotifications, error: notifCheckError } = await supabase
      .from('notifications')
      .select('*')
      .eq('project_id', projectId)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // últimos 60 segundos
      .order('created_at', { ascending: false });
    
    results.steps.push({
      step: 6,
      success: true,
      data: {
        notificationsCreated: recentNotifications?.length || 0,
        notifications: recentNotifications?.map(n => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message.substring(0, 50) + '...'
        }))
      }
    });
    
    // RESUMO
    results.success = results.errors.length === 0;
    
    console.log('💬 [TEST-COMMENT-FLOW] RESUMO:', {
      success: results.success,
      totalSteps: results.steps.length,
      totalErrors: results.errors.length
    });
    
    return NextResponse.json(results);
    
  } catch (error: any) {
    console.error('❌ [TEST-COMMENT-FLOW] ERRO CRÍTICO:', error);
    results.errors.push({
      critical: true,
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(results, { status: 500 });
  } finally {
    console.log('💬 [TEST-COMMENT-FLOW] FIM DO TESTE');
    console.log('💬 [TEST-COMMENT-FLOW] =================================');
  }
}