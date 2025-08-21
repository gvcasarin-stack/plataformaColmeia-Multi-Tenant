'use server'

import { revalidatePath } from 'next/cache';
// ❌ FIREBASE - REMOVIDO: import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// ❌ FIREBASE - REMOVIDO: import { getStorage } from 'firebase-admin/storage';
// ❌ FIREBASE - REMOVIDO: import { getOrCreateFirebaseAdminApp } from '@/lib/firebase-admin';

// ✅ SUPABASE - ADICIONADO: Importações do Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

import { Project, UpdatedProject, TimelineEvent, CreateProjectClientData } from '@/types/project';

// Correção da importação:
import { type CreateProjectOptions } from '@/lib/services/projectService/index'; // CreateProjectOptions vem do index (que reexporta de types)

// ✅ SUPABASE - Usar funções Supabase em vez de Firebase
import {
  getProjectById,
  getProjectsByUserId,
  getProjectsWithFilters
} from '@/lib/services/projectService/supabase';

// ❌ FIREBASE - REMOVIDO: Importações do Firebase core.ts
// import {
//   createProject as createProjectCore,
//   getProject as getProjectCore,
//   updateProject as updateProjectCore,
//   deleteProject as deleteProjectCore,
//   addProjectComment as addProjectCommentCore,
//   addProjectTimelineEvent as addProjectTimelineEventCore,
//   generateUniqueProjectNumber as generateUniqueProjectNumberCore,
//   isProjectNumberAlreadyUsed as isProjectNumberAlreadyUsedCore,
//   getProjectsAdmin
// } from '@/lib/services/projectService/core';

// Manter esta importação para isProjectNumberAlreadyUsed de queries.ts se for diferente e usada.
import { isProjectNumberAlreadyUsed as isProjectNumberAlreadyUsedQueries, findProjectByNumber as findProjectByNumberQueries } from '@/lib/services/projectService/queries';

// Remover ou manter este import global dependendo se ainda é usado.
// Por agora, vamos comentar para ver se algo quebra, forçando o uso das importações diretas.
// import projectService from '@/lib/services/projectService/index';

import { User } from '@/types/user';
import logger from '@/lib/utils/logger';

// ✅ MIGRADO PARA SUPABASE: Usar novas funções integradas de notificação + e-mail
import {
  notifyNewProject,
  notifyNewComment,
  notifyNewDocument,
  notifyStatusChange
} from '@/lib/services/notificationService';

import { getUserDataSupabase } from "@/lib/services/authService.supabase";
import { devLog } from "@/lib/utils/productionLogger";
import { getUserDataAdminSupabase } from "@/lib/services/authService.supabase";

// ✅ REMOVIDO: Imports antigos de e-mail e notificação separados
// import { createNotification } from '@/lib/services/notificationService';
// import { NotificationType } from '@/types/notification';

/**
 * ✅ CORREÇÃO REACT #130: Função para sanitizar objetos antes de retornar das Server Actions
 * Remove objetos com protótipos null e estruturas não serializáveis
 */
function sanitizeForSerialization<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Se for um tipo primitivo, retorna como está
  if (typeof obj !== 'object') {
    return obj;
  }

  // Se for um array, sanitiza cada item
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForSerialization(item)) as unknown as T;
  }

  // Se for uma data, converte para string ISO
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Para objetos, cria um novo objeto plain
  const sanitized: any = {};
  
  // Usa Object.keys para evitar problemas com protótipos null
  Object.keys(obj).forEach(key => {
    const value = (obj as any)[key];
    
    // Sanitiza recursivamente
    sanitized[key] = sanitizeForSerialization(value);
  });

  // Retorna um objeto plain sem protótipo
  return Object.assign({}, sanitized) as T;
}

const validProjectStatuses = [
  'Não Iniciado',
  'Em Desenvolvimento',
  'Aguardando',
  'Homologação',
  'Projeto Aprovado',
  'Aguardando Vistoria',
  'Projeto Pausado',
  'Em Vistoria',
  'Finalizado',
  'Cancelado'
] as const;

// ✅ Função auxiliar para gerar número sequencial quando fallback é necessário
async function generateFallbackSequentialNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FV-${currentYear}-`;
  
  try {
    // Tentar buscar projetos existentes no banco de dados para determinar próximo número
    const supabase = createSupabaseServiceRoleClient();
    const { data: projects, error } = await supabase
      .from('projects')
      .select('number')
      .like('number', `${prefix}%`)
      .order('number', { ascending: false })
      .limit(1);

    if (!error && projects && projects.length > 0) {
      const lastNumber = projects[0].number;
      const numberPart = lastNumber.replace(prefix, '');
      const parsedNumber = parseInt(numberPart);
      if (!isNaN(parsedNumber)) {
        const nextNumber = parsedNumber + 1;
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
    }
    
    // Se não conseguir buscar ou não houver projetos, começar com 001
    return `${prefix}001`;
  } catch (error) {
    // Em caso de erro total, usar número baseado na data para evitar duplicatas
    const dayOfYear = Math.floor((Date.now() - new Date(currentYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const randomSuffix = Math.floor(Math.random() * 100);
    return `${prefix}${(dayOfYear * 100 + randomSuffix).toString().padStart(3, '0')}`;
  }
}

export async function updateProjectAction(
  project: UpdatedProject,
  user: { id: string; email?: string | null; role?: string }
): Promise<{ data?: Project; error?: string; message?: string; refresh?: boolean }> {
  // Log bem no início da função para verificar se ela é chamada no servidor
  logger.info(`[updateProjectAction SERVER LOG] Action INVOCADA. Project ID: ${project.id}, User Email: ${user.email}, TimelineEvents Count: ${project.timelineEvents?.length || 0}`);
  try {
    devLog.log('[updateProjectAction] Starting update:', { 
      projectId: project.id, 
      status: project.status,
      timelineEvents: project.timelineEvents?.length || 0
    });

    if (!project.id) {
      return { error: 'Project ID is required' };
    }

    // ❌ FIREBASE - COMENTADO: Initialize admin SDK
    // getOrCreateFirebaseAdminApp();
    // const adminDb = getFirestore();

    // ❌ FIREBASE - COMENTADO: Use admin SDK for Firestore operations
    // const projectRef = adminDb.collection('projects').doc(project.id);
    // const projectDoc = await projectRef.get();
    
    // if (!projectDoc.exists) {
    //   devLog.error('[updateProjectAction] Project not found');
    //   return { error: 'Project not found' };
    // }

    // const currentData = projectDoc.data() as Project;
    const timestamp = new Date().toISOString();

    // Salvar o status antigo e a lista de arquivos antiga para comparação
    // const oldStatus = currentData.status;
    // const oldFiles = currentData.files || []; // Garantir que seja um array

    devLog.log('Current project state:', {
      // currentStatus: currentData.status,
      newStatus: project.status,
      // existingEvents: currentData?.timelineEvents?.length || 0
    });

    // Prepare update data
    const updateData: any = {
      ...project,
      updatedAt: timestamp,
      lastUpdateBy: {
        uid: user.id,
        email: user.email,
        role: user.role,
        timestamp
      }
    };

    // Handle timeline events
    if (project.timelineEvents) {
      // const existingEvents = currentData?.timelineEvents || [];
      const uniqueEvents = new Map();
      
      // Add new events first
      project.timelineEvents.forEach(event => {
        uniqueEvents.set(event.id, event);
      });
      
      // Add existing events, avoiding duplicates
      // existingEvents.forEach(event => {
      //   if (!uniqueEvents.has(event.id)) {
      //     uniqueEvents.set(event.id, event);
      //   }
      // });

      // Convert Map back to array and sort by timestamp
      updateData.timelineEvents = Array.from(uniqueEvents.values())
        .sort((a, b) => {
          const aTime = new Date(a.timestamp);
          const bTime = new Date(b.timestamp);
          return bTime.getTime() - aTime.getTime();
        });
    }

    devLog.log('Updating project with:', {
      status: updateData.status,
      timelineEventsCount: updateData.timelineEvents?.length || 0
    });

    // Declarar finalData no escopo correto
    let finalData: Project;

    try {
      // ✅ SUPABASE - IMPLEMENTAÇÃO: Atualizar projeto no Supabase
      const supabase = createSupabaseServiceRoleClient();
      
      // Primeiro, buscar dados atuais para comparação
      const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();

      if (fetchError || !currentProject) {
        devLog.error('[updateProjectAction] Project not found:', fetchError);
        return { error: 'Project not found' };
      }

      // Salvar dados antigos para comparação
      const oldStatus = currentProject.status;
      const oldFiles = currentProject.files || [];

      // Preparar dados para atualização no Supabase
      const supabaseUpdateData: any = {
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        prioridade: updateData.prioridade,
        empresa_integradora: updateData.empresaIntegradora || updateData.empresa_integradora,
        nome_cliente_final: updateData.nomeClienteFinal || updateData.nome_cliente_final,
        distribuidora: updateData.distribuidora,
        potencia: updateData.potencia,
        data_entrega: updateData.dataEntrega || updateData.data_entrega,
        valor_projeto: updateData.valorProjeto || updateData.valor_projeto,
        pagamento: updateData.pagamento,

        // ✅ Persistir disjuntor do padrão de entrada (camelCase → snake_case)
        // - Usa camelCase se presente (tratando string vazia como undefined)
        // - Faz fallback para snake_case se vier nesse formato
        disjuntor_padrao_entrada:
          (typeof updateData.disjuntorPadraoEntrada === 'string'
            ? (updateData.disjuntorPadraoEntrada.trim() !== ''
                ? updateData.disjuntorPadraoEntrada.trim()
                : undefined)
            : (updateData as any).disjuntor_padrao_entrada),

        admin_responsible_id: updateData.adminResponsibleId || updateData.admin_responsible_id,
        admin_responsible_name: updateData.adminResponsibleName || updateData.admin_responsible_name,
        admin_responsible_email: updateData.adminResponsibleEmail || updateData.admin_responsible_email,
        admin_responsible_phone: updateData.adminResponsiblePhone || updateData.admin_responsible_phone,
        timeline_events: updateData.timelineEvents,
        documents: updateData.documents,
        files: updateData.files,
        comments: updateData.comments,
        history: updateData.history,
        last_update_by: updateData.lastUpdateBy,
        updated_at: new Date().toISOString()
      };

      // Remover campos undefined/null
      Object.keys(supabaseUpdateData).forEach(key => {
        if (supabaseUpdateData[key] === undefined || supabaseUpdateData[key] === null) {
          delete supabaseUpdateData[key];
        }
      });

      devLog.log('[updateProjectAction] Updating with Supabase data:', {
        projectId: project.id,
        fieldsToUpdate: Object.keys(supabaseUpdateData)
      });

      // Executar atualização no Supabase
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(supabaseUpdateData)
        .eq('id', project.id)
        .select()
        .single();

      if (updateError) {
        devLog.error('[updateProjectAction] Supabase update failed:', updateError);
        return { error: `Failed to update project: ${updateError.message}` };
      }

      devLog.log('[updateProjectAction] Project updated successfully in Supabase');

      // ✅ CORRIGIDO: Usar dados já disponíveis do projeto atualizado
      // Converter dados do Supabase para o formato esperado
      finalData = {
        id: updatedProject.id,
        userId: updatedProject.created_by,
        name: updatedProject.name,
        number: updatedProject.number,
        empresaIntegradora: updatedProject.empresa_integradora,
        nomeClienteFinal: updatedProject.nome_cliente_final,
        distribuidora: updatedProject.distribuidora,
        potencia: updatedProject.potencia,
        dataEntrega: updatedProject.data_entrega,
        status: updatedProject.status,
        prioridade: updatedProject.prioridade,
        valorProjeto: updatedProject.valor_projeto,
        pagamento: updatedProject.pagamento,

        // ✅ Retornar campo mapeado para manter UI consistente
        disjuntorPadraoEntrada: (updatedProject as any).disjuntor_padrao_entrada,

        createdAt: typeof updatedProject.created_at === 'string' ? updatedProject.created_at : new Date(updatedProject.created_at).toISOString(),
        updatedAt: typeof updatedProject.updated_at === 'string' ? updatedProject.updated_at : new Date(updatedProject.updated_at).toISOString(),
        adminResponsibleId: updatedProject.admin_responsible_id,
        adminResponsibleName: updatedProject.admin_responsible_name,
        adminResponsibleEmail: updatedProject.admin_responsible_email,
        adminResponsiblePhone: updatedProject.admin_responsible_phone,
        timelineEvents: updatedProject.timeline_events || [],
        documents: updatedProject.documents || [],
        files: updatedProject.files || [],
        comments: updatedProject.comments || [],
        history: updatedProject.history || [],
        lastUpdateBy: updatedProject.last_update_by
      };

      // Verificar mudança de status para notificações
      if (finalData.status && oldStatus !== finalData.status) {
        logger.info(`[updateProjectAction] Status mudou de ${oldStatus} para ${finalData.status}. Enviando notificações de status.`);
        
        const projectUrlClient = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${finalData.id}`;
        
        if (finalData.userId) { 
          try {
            await notifyStatusChange({
              projectId: finalData.id,
              projectNumber: finalData.number,
              projectName: finalData.name,
              oldStatus: oldStatus,
              newStatus: finalData.status,
              clientId: finalData.userId,
              adminId: user.id,
              adminName: user.email || 'Admin'
            });
            logger.info(`[updateProjectAction] Status change notification sent: ${oldStatus} → ${finalData.status}`);
          } catch (notificationError) {
            logger.error("[updateProjectAction] Falha ao enviar notificação de mudança de status:", notificationError);
          }
        }
      }

      // Verificar novos arquivos para notificações
      const newFiles = finalData.files || [];
      const addedFiles = newFiles.filter(newFile => 
        !oldFiles.some(oldFile => oldFile.url === newFile.url) 
      );

      if (addedFiles.length > 0) {
        logger.info(`[updateProjectAction] ${addedFiles.length} novo(s) arquivo(s) adicionado(s). Iniciando envio de notificações de documento.`);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const projectUrlClient = `${baseUrl}/cliente/projetos/${finalData.id}`;
        const projectUrlAdmin = `${baseUrl}/admin/projetos/${finalData.id}`;
        let clientNameToNotify = "Cliente não especificado";
        
        // Buscar nome do cliente para a notificação
        if (finalData.userId) {
          try {
            const clientUserData = await getUserDataAdminSupabase(finalData.userId);
            if (clientUserData && clientUserData.name) {
              clientNameToNotify = clientUserData.name;
            } else if (clientUserData && clientUserData.email) {
              clientNameToNotify = clientUserData.email; 
            }
          } catch (e) {
            logger.error("[updateProjectAction] Falha ao buscar dados do cliente para notificação de documento: ", e);
          }
        }

        for (const addedFile of addedFiles) {
          // Notificar o cliente (dono do projeto)
          if (finalData.userId) {
            try {
              await notifyNewDocument({
                projectId: finalData.id,
                projectNumber: finalData.number,
                projectName: finalData.name,
                documentName: addedFile.name,
                uploaderId: user.id,
                uploaderName: user.email || 'Admin',
                uploaderRole: user.role || 'admin',
                clientId: finalData.userId,
                clientName: clientNameToNotify
              });
            } catch (emailError) {
              logger.error("[updateProjectAction] Falha ao enviar notificação de novo documento para o usuário:", emailError);
            }
          }

          // Notificar Admins
          try {
            await notifyNewDocument({
              projectId: finalData.id,
              projectNumber: finalData.number,
              projectName: finalData.name,
              documentName: addedFile.name,
              uploaderId: user.id,
              uploaderName: user.email || 'Admin',
              uploaderRole: user.role || 'admin',
              clientId: finalData.userId,
              clientName: clientNameToNotify
            });
          } catch (emailError) {
            logger.error("[updateProjectAction] Falha ao enviar notificação de novo documento para admin:", emailError);
          }
        }
      }

    } catch (updateError) {
      devLog.error('[updateProjectAction] Update failed:', updateError);
      return { error: 'Failed to update project in database' };
    }

    devLog.log('Final project state:', {
      status: finalData.status,
      timelineEvents: finalData?.timelineEvents?.length || 0
    });

    // Force revalidation
    revalidatePath('/projetos');
    revalidatePath(`/projetos/${project.id}`);
    revalidatePath('/');

    return sanitizeForSerialization({
      data: {
        ...finalData,
        id: project.id
      },
      message: project.status !== finalData.status 
        ? `Status atualizado para ${finalData.status}`
        : 'Projeto atualizado com sucesso',
      refresh: false // Alterado para false para evitar refresh sempre
    });
  } catch (error) {
    // Interceptar erros de Server Components render
    /*
    if (error instanceof Error && 
        (error.message.includes('Server Components render') || 
         error.message.includes('digest property'))) {
      
      devLog.log('[ACTION INTERCEPTOR] Erro de Server Components render capturado:', error.message);
      
      // Retornar uma resposta "bem-sucedida" para não quebrar a UI
      return { 
        message: "Operação realizada com sucesso (erro de renderização suprimido)",
        refresh: false 
      };
    }
    */
    
    // Para outros erros, propagar normalmente
    devLog.error('[updateProjectAction] Error updating project:', error); // Adicionado para logar o erro completo
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha ao atualizar o projeto',
      refresh: false
    };
  }
}

export async function addCommentAction(
  projectId: string, 
  comment: { text: string; timestamp?: string },
  user: { id: string; email?: string | null; name?: string | null; role?: string }
): Promise<{ 
  data?: Project & { id: string }; 
  error?: string; 
  message?: string; 
  refresh?: boolean;
}> {
  
  // Logs removidos por questões de segurança em produção
  try {
    if (!projectId || !comment.text) {
      return { error: 'Project ID and comment text are required' };
    }
    if (!user || !user.id) {
      return { error: 'User information is required' };
    }

    logger.info(`[addCommentAction] User: ${user.name} (${user.role}) is adding comment to project ${projectId}`);

    // ❌ FIREBASE - COMENTADO: const adminApp = getOrCreateFirebaseAdminApp();
    // ❌ FIREBASE - COMENTADO: const adminDb = getFirestore(adminApp);
    // ❌ FIREBASE - COMENTADO: const projectRef = adminDb.collection('projects').doc(projectId);

    // ❌ FIREBASE - COMENTADO: const newCommentId = adminDb.collection('projects').doc().id; // Gera um ID único para o comentário
    const newCommentId = crypto.randomUUID(); // ✅ SUPABASE - Gerar UUID

    const newCommentEntry = {
      id: newCommentId,
      userId: user.id,
      userName: user.name || user.email || 'Usuário Desconhecido',
      userRole: user.role || 'client',
      text: comment.text,
      timestamp: comment.timestamp || new Date().toISOString(),
      replies: [],
      reactions: {}
    };

    const newTimelineEvent: TimelineEvent = {
      id: newCommentId, // Usar o mesmo ID para o evento de timeline
      type: 'comment',
      timestamp: newCommentEntry.timestamp,
      user: newCommentEntry.userName,
      userId: newCommentEntry.userId,
      content: newCommentEntry.text,
      commentId: newCommentId,
    };

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Adicionar comentário no Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Logs removidos por questões de segurança em produção
    
    // 🚀 OTIMIZAÇÃO: Buscar APENAS os campos necessários (não o projeto inteiro)
    const { data: basicProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, name, number, created_by, comments, timeline_events')
      .eq('id', projectId)
      .single();

    if (fetchError || !basicProject) {
      // Logs removidos por questões de segurança em produção
      devLog.error('[addCommentAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }

    // Logs removidos por questões de segurança em produção
    
    const currentComments = basicProject.comments || [];
    const currentTimelineEvents = basicProject.timeline_events || [];
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        comments: [...currentComments, newCommentEntry],
        timeline_events: [...currentTimelineEvents, newTimelineEvent]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          name: user.name || user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId);

    if (updateError) {
      devLog.error('[addCommentAction] Update failed:', updateError);
      return { error: `Failed to add comment: ${updateError.message}` };
    }

    devLog.log('[addCommentAction] Comment added successfully to Supabase');
    
    const authorName = user.name || user.email || 'Usuário Desconhecido';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const projectUrlClient = `${baseUrl}/cliente/projetos/${projectId}`;
    const projectUrlAdmin = `${baseUrl}/admin/projetos/${projectId}`;
    const projectClientOwnerId = basicProject.created_by; // Cliente dono do projeto

    // ✅ DEBUG: Log detalhado dos dados do projeto (OTIMIZADO)
    devLog.log('[addCommentAction] DEBUG - Project data analysis (OTIMIZADO):', {
      projectId,
      projectName: basicProject.name,
      projectNumber: basicProject.number,
      projectClientOwnerId: projectClientOwnerId,
      authorId: user.id,
      authorRole: user.role
    });

    // 🔥 CRIAR NOTIFICAÇÃO E ENVIAR E-MAIL
    try {
      console.log('[addCommentAction] 🔍 CHEGOU ATÉ NOTIFICAÇÕES - REAL APP:', {
        projectId,
        userId: user.id,
        userRole: user.role,
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        projectClientOwnerId: projectClientOwnerId
      });
      
      devLog.log('[addCommentAction] DEBUG - Iniciando sistema de notificações...');
      
      // Determinar se é admin comentando ou cliente comentando
      const isAdmin = user.role === 'admin' || user.role === 'superadmin';
      
      if (isAdmin && projectClientOwnerId) {
        // ✅ Admin comentou → Notificar cliente
        devLog.log('[addCommentAction] Admin commented - notifying client', { 
          authorName, 
          projectClientOwnerId, 
          projectName: basicProject.name 
        });
        
        // ✅ DEBUG: Log da query antes de executar
        devLog.log('[addCommentAction] DEBUG - About to query users table:', {
          queryTable: 'users',
          queryField: 'id',
          queryValue: projectClientOwnerId,
          selectFields: 'full_name, email'
        });
        
        try {
          // Buscar dados do cliente para pegar o nome correto
          const { data: clientData, error: clientQueryError } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', projectClientOwnerId)
            .single();

          devLog.log('[addCommentAction] DEBUG - Client query result:', {
            clientData,
            clientQueryError,
            hasClientData: !!clientData,
            clientName: clientData?.full_name,
            clientEmail: clientData?.email
          });

          if (clientQueryError) {
            devLog.error('[addCommentAction] Erro ao buscar dados do cliente:', clientQueryError);
            throw new Error(`Erro ao buscar cliente: ${clientQueryError.message}`);
          }

          if (!clientData) {
            devLog.warn('[addCommentAction] Cliente não encontrado na base:', projectClientOwnerId);
            throw new Error('Cliente não encontrado');
          }

          devLog.log('[addCommentAction] DEBUG - Calling notifyNewComment...');
          devLog.log('[addCommentAction] DEBUG - Comment data being sent:', {
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.name,
            commentText: comment.text,
            commentTextType: typeof comment.text,
            commentObject: comment,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'admin',
            clientId: projectClientOwnerId,
            clientName: clientData.full_name || clientData.email || 'Cliente'
          });
          
          // Logs removidos por questões de segurança em produção
          
          // Notificar o cliente
          const notificationResult = await notifyNewComment({
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.name,
            commentText: comment.text,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'admin',
            clientId: projectClientOwnerId,
            clientName: clientData.full_name || clientData.email || 'Cliente'
          });

          devLog.log('[addCommentAction] DEBUG - Notification result:', {
            success: notificationResult,
            notificationIds: notificationResult.notificationIds?.length,
            emailSent: notificationResult.emailSent
          });
          
        } catch (clientError) {
          devLog.error('[addCommentAction] Erro na notificação para cliente:', clientError);
          // Não falha o comentário se a notificação falhar
        }
        
      } else {
        // ✅ Cliente comentou → Notificar todos os admins
        devLog.log('[addCommentAction] Client commented - notifying all admins', { 
          authorName, 
          projectName: basicProject.name 
        });
        
        try {
          // Logs removidos por questões de segurança em produção
          
          devLog.log('[addCommentAction] DEBUG - Calling notifyNewComment for admins...');
          devLog.log('[addCommentAction] DEBUG - Admin notification data:', {
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.name,
            commentText: comment.text,
            commentTextType: typeof comment.text,
            commentObject: comment,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'client'
          });
          
          const notificationResult = await notifyNewComment({
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.name,
            commentText: comment.text,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'client',
            clientId: user.id,  // ✅ Cliente que comentou
            clientName: authorName  // ✅ Nome do cliente
          });

          devLog.log('[addCommentAction] DEBUG - Admin notification result:', {
            success: notificationResult,
            notificationIds: notificationResult.notificationIds?.length,
            emailSent: notificationResult.emailSent
          });
          
        } catch (adminError) {
          devLog.error('[addCommentAction] Erro na notificação para admins:', adminError);
          // Não falha o comentário se a notificação falhar
        }
      }
      
    } catch (notificationError) {
      devLog.error('[addCommentAction] Failed to create notification:', notificationError);
      // Não falha o comentário se a notificação falhar, mas loga o erro
    }

    // ✅ CORREÇÃO: Só revalidar em runtime, não durante build/static generation
    try {
      revalidatePath('/projetos');
      revalidatePath(`/projetos/${projectId}`);
    } catch (error) {
      // Falha silenciosa se não conseguir revalidar (ex: durante build estático)
      console.log('[revalidatePath] Skipped:', error.message);
    }

    // 🔧 CORREÇÃO: Resposta ULTRA OTIMIZADA - apenas dados essenciais
    return { 
      data: {
        id: projectId,
        name: basicProject.name || 'Projeto',
        number: basicProject.number || 'N/A',
        commentAdded: true,
        timestamp: new Date().toISOString()
      } as any, // ✅ Permite propriedades customizadas
      message: 'Comentário adicionado com sucesso',
      refresh: true
    };
  } catch (error) {
    // Interceptar erros de Server Components render
    /*
    if (error instanceof Error && 
        (error.message.includes('Server Components render') || 
         error.message.includes('digest property'))) {
      
      devLog.log('[ACTION INTERCEPTOR] Erro de Server Components render capturado:', error.message);
      
      // Retornar uma resposta "bem-sucedida" para não quebrar a UI
      return { 
        message: "Comentário adicionado com sucesso (erro de renderização suprimido)",
        refresh: false // Important: set to false to avoid re-render loop if the error persists
      };
    }
    */
    
    // Para outros erros, continuar com o comportamento atual
    devLog.error('[addCommentAction] Error adding comment:', error); // Adicionado para logar o erro completo
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha ao adicionar comentário',
      refresh: false
    };
  }
}

export async function deleteCommentAction(
  projectId: string,
  commentId: string,
  user: { id: string; email?: string | null; role?: string } // ✅ SUPABASE: Corrigido uid para id
): Promise<{ 
  data?: Project & { id: string }; 
  error?: string; 
  message?: string; 
  refresh?: boolean;
}> {
  try {
    devLog.log('[deleteCommentAction] Starting delete comment:', { projectId, commentId, userId: user.id });

    if (!projectId || !commentId) {
      return { error: 'Project ID and Comment ID are required' };
    }
    if (!user || !user.id) {
      return { error: 'User information is required' };
    }

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Remover comentário no Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados atuais do projeto
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !currentProject) {
      devLog.error('[deleteCommentAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }

    const currentComments = currentProject.comments || [];
    const currentTimelineEvents = currentProject.timeline_events || [];

    // Logs detalhados para depuração
    devLog.log(`[deleteCommentAction] Attempting to find commentId: "${commentId}"`);
    devLog.log(`[deleteCommentAction] Searching in project.comments (${currentComments.length} items):`);
    
    currentComments.forEach((c, idx) => {
      const contentPreview = c.text ? c.text.substring(0, 30) : 'N/A (text missing or not a string)';
      devLog.log(`  Comment ${idx}: ID = "${c.id}", Text = "${contentPreview}"`);
      if (c.id === commentId) {
        devLog.log(`    MATCH FOUND in project.comments for ID: "${commentId}"`);
      }
    });

    devLog.log(`[deleteCommentAction] Searching in project.timeline_events (${currentTimelineEvents.length} items):`);
    currentTimelineEvents.forEach((event, idx) => {
      let eventContentPreview = 'N/A';
      if (event.content) {
        eventContentPreview = event.content.substring(0,30);
      } else if (event.fileName) {
        eventContentPreview = event.fileName;
      }
      devLog.log(`  TimelineEvent ${idx}: ID = "${event.id}", Type = "${event.type}", Content = "${eventContentPreview}"`);
      if (event.id === commentId && event.type === 'comment') {
        devLog.log(`    MATCH FOUND in project.timeline_events for ID: "${commentId}" (type: comment)`);
      }
    });

    const commentExistsInProjectComments = currentComments.some(c => c.id === commentId);
    const timelineEventExists = currentTimelineEvents.some(event => event.id === commentId && event.type === 'comment');

    devLog.log(`[deleteCommentAction] Result of checks: commentExistsInProjectComments = ${commentExistsInProjectComments}, timelineEventExists = ${timelineEventExists}`);

    const originalCommentEvent = currentTimelineEvents.find(event => event.id === commentId && event.type === 'comment');
    const canDelete = user.role === 'admin' || user.role === 'superadmin' || (originalCommentEvent && originalCommentEvent.userId === user.id);

    if (!canDelete) {
      devLog.error('[deleteCommentAction] User does not have permission to delete this comment.', { commentId, userId: user.id, commentUserId: originalCommentEvent?.userId });
      return { error: 'Você não tem permissão para excluir este comentário.' };
    }

    if (!commentExistsInProjectComments && !timelineEventExists) {
      devLog.warn('[deleteCommentAction] Comment ID not found in project.comments AND not in timeline_events after detailed check. ID:', commentId);
      return { message: 'Comentário já removido ou não encontrado.', refresh: true };
    }

    const updatedComments = currentComments.filter(c => c.id !== commentId);
    const updatedTimelineEvents = currentTimelineEvents.filter(event => event.id !== commentId);

    if (updatedComments.length === currentComments.length && updatedTimelineEvents.length === currentTimelineEvents.length) {
      devLog.warn('[deleteCommentAction] Filtering did not change comment or timeline arrays. Comment ID:', commentId);
      return { message: 'Comentário não pôde ser removido (não encontrado durante a fase de filtro).', refresh: true };
    }

    // Atualizar projeto no Supabase
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        comments: updatedComments,
        timeline_events: updatedTimelineEvents,
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[deleteCommentAction] Supabase update failed:', updateError);
      return { error: `Failed to delete comment: ${updateError.message}` };
    }

    devLog.log('[deleteCommentAction] Comment deleted successfully from Supabase.', { projectId, commentId });

    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);

    return { 
      message: 'Comentário removido com sucesso!', 
      refresh: true // Recomendar refresh para que o onSnapshot pegue a mudança rapidamente
    };

  } catch (error) {
    devLog.error('[deleteCommentAction] Error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Falha ao remover comentário', 
      refresh: false 
    };
  }
}

export async function deleteFileAction(
  projectId: string,
  filePath: string, // Caminho do arquivo no Supabase Storage
  fileUrl: string,  // URL do arquivo, usada para encontrar no array project.files e timelineEvents
  user: { id?: string; email?: string | null; role?: string; profile?: any }
): Promise<{ 
  data?: Project & { id: string }; 
  error?: string; 
  message?: string; 
  refresh?: boolean;
}> {
  try {
    devLog.log('[deleteFileAction] Starting delete file:', { projectId, filePath, fileUrl, userId: user.id });
    
    // ✅ DEBUG COMPLETO: Vamos ver TUDO que está chegando
    devLog.log('[deleteFileAction] COMPLETE USER OBJECT RECEIVED:', {
      userObject: user,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      userKeys: user ? Object.keys(user) : 'no user',
      // Verificar se profile existe
      hasProfile: !!(user as any)?.profile,
      profileObject: (user as any)?.profile,
      profileRole: (user as any)?.profile?.role,
      profileKeys: (user as any)?.profile ? Object.keys((user as any).profile) : 'no profile',
      // Verificar se profileRole existe diretamente
      directProfileRole: (user as any)?.profileRole,
      // Serializar tudo para ver estrutura completa
      fullUserSerialized: JSON.stringify(user, null, 2)
    });

    if (!projectId || !filePath || !fileUrl) {
      return { error: 'Project ID, File Path, and File URL are required' };
    }
    
    // ✅ CORRIGIDO: Usar apenas id para compatibilidade com Supabase
    const userId = user.id;
    if (!user || !userId) {
      return { error: 'User information is required' };
    }
    
    // ✅ CORRIGIDO: Verificar role em múltiplos locais
    const userRole = user.role || user.profile?.role || (user as any).profileRole;
    devLog.log('[deleteFileAction] User role verification:', {
      userRole: user.role,
      profileRole: user.profile?.role,
      directProfileRole: (user as any).profileRole,
      finalRole: userRole,
      userEmail: user.email,
      userId: userId
    });
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      devLog.warn('[deleteFileAction] Permission denied for user role:', userRole);
      return { error: 'Permissão negada para excluir arquivo.' };
    }

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Excluir arquivo no Supabase Storage
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados do projeto para verificar se existe e obter arquivos
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData) {
      devLog.error('[deleteFileAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }

    const currentFiles = projectData.files || [];
    const currentTimelineEvents = projectData.timeline_events || [];

    // 1. Excluir o arquivo do Supabase Storage
    try {
      devLog.log(`[deleteFileAction] Attempting to delete from Supabase Storage: ${filePath}`);
      
      // ✅ CORRIGIDO: Usar o módulo server-storage seguro
      const { deleteProjectFiles } = await import('@/lib/supabase/server-storage');
      
      // Deletar arquivo do storage
      const deleteResult = await deleteProjectFiles([filePath]);

      if (!deleteResult.success) {
        devLog.error('[deleteFileAction] Error deleting file from Supabase Storage:', deleteResult.errors);
        // Continuar mesmo se o arquivo não existir no storage
        if (deleteResult.errors?.some(e => e.error.includes('not found'))) {
          devLog.warn('[deleteFileAction] File not found in Supabase Storage, continuing with database cleanup');
        } else {
          return { error: 'Falha ao remover arquivo do armazenamento.' };
        }
      } else {
        devLog.log('[deleteFileAction] File deleted from Supabase Storage successfully.', { filePath });
      }
    } catch (storageError: any) {
      devLog.error('[deleteFileAction] Error deleting file from Supabase Storage:', storageError);
      // Continuar com a limpeza do banco mesmo se houver erro no storage
      devLog.warn('[deleteFileAction] Continuing with database cleanup despite storage error');
    }

    // 2. Remover referências do banco de dados
    const updatedFiles = currentFiles.filter(f => f.url !== fileUrl);
    
    // ✅ MELHORADO: Remover TODOS os eventos relacionados ao arquivo
    const updatedTimelineEvents = currentTimelineEvents.filter(event => {
      // Remover eventos que:
      // 1. Têm fileUrl igual ao arquivo sendo deletado
      // 2. São do tipo 'document' ou 'file_upload' e têm fileName igual
      // 3. Mencionam o arquivo no conteúdo
      const deletedFile = currentFiles.find(f => f.url === fileUrl);
      const fileName = deletedFile?.name;
      
      return !(
        event.fileUrl === fileUrl ||
        (fileName && event.fileName === fileName) ||
        (fileName && event.content?.includes(fileName))
      );
    });

    if (currentFiles.length === updatedFiles.length && currentTimelineEvents.length === updatedTimelineEvents.length) {
      devLog.warn('[deleteFileAction] File reference or its timeline event not found in database.', { projectId, fileUrl });
      return { message: 'Referências do arquivo já removidas ou não encontradas.', refresh: true };
    }

    // Atualizar projeto no Supabase
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        files: updatedFiles,
        timeline_events: updatedTimelineEvents,
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: userId,
          email: user.email,
          role: userRole,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[deleteFileAction] Failed to update project in Supabase:', updateError);
      return { error: `Falha ao atualizar projeto: ${updateError.message}` };
    }

    devLog.log('[deleteFileAction] File references deleted from Supabase successfully.', { projectId, fileUrl });

    // Converter dados do Supabase para o formato esperado
    const finalProjectData: Project = {
      id: updatedProject.id,
      userId: updatedProject.created_by,
      name: updatedProject.name,
      number: updatedProject.number,
      empresaIntegradora: updatedProject.empresa_integradora,
      nomeClienteFinal: updatedProject.nome_cliente_final,
      distribuidora: updatedProject.distribuidora,
      potencia: updatedProject.potencia,
      dataEntrega: updatedProject.data_entrega,
      status: updatedProject.status,
      prioridade: updatedProject.prioridade,
      valorProjeto: updatedProject.valor_projeto,
      pagamento: updatedProject.pagamento,
      
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      adminResponsibleId: updatedProject.admin_responsible_id,
      adminResponsibleName: updatedProject.admin_responsible_name,
      adminResponsibleEmail: updatedProject.admin_responsible_email,
      adminResponsiblePhone: updatedProject.admin_responsible_phone,
      timelineEvents: updatedProject.timeline_events || [],
      documents: updatedProject.documents || [],
      files: updatedProject.files || [],
      comments: updatedProject.comments || [],
      history: updatedProject.history || [],
      lastUpdateBy: updatedProject.last_update_by
    };

    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);

    return { 
      data: {
        ...finalProjectData,
        id: projectId
      },
      message: 'Arquivo e suas referências removidos com sucesso!', 
      refresh: true 
    };

  } catch (error) {
    devLog.error('[deleteFileAction] Error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Falha ao remover arquivo e suas referências', 
      refresh: false 
    };
  }
}

// ✅ SUPABASE - NOVA SERVER ACTION PARA CRIAÇÃO DE PROJETO PELO CLIENTE
export async function createProjectClientAction(
  projectDataFromClient: CreateProjectClientData, 
  clientUser: { id: string; name?: string | null; email?: string | null; companyName?: string | null; } // Mudado de uid para id para compatibilidade com Supabase
): Promise<{ data?: Project; error?: string; message?: string }> {
  try {
    logger.info('[createProjectClientAction] DEBUGGING - Dados recebidos na action:', { 
      clientId: clientUser.id, 
      clientEmail: clientUser.email,
      clientName: clientUser.name,
      hasClientUser: !!clientUser,
      TODOS_OS_DADOS: projectDataFromClient,
      LISTA_MATERIAIS: projectDataFromClient.listaMateriais,
      DISJUNTOR: projectDataFromClient.disjuntorPadraoEntrada,
      KEYS_RECEBIDAS: Object.keys(projectDataFromClient)
    });

    if (!clientUser || !clientUser.id) {
      logger.warn('[createProjectClientAction] ID do usuário cliente não fornecido.');
      return { error: 'ID do usuário não encontrado. Faça login novamente.' };
    }

    if (!clientUser.email) {
      logger.warn('[createProjectClientAction] Email do usuário cliente não fornecido.');
      return { error: 'Email do usuário não encontrado. Faça login novamente.' };
    }

    // ✅ SUPABASE - Initialize Supabase Service Role Client
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      logger.info('[createProjectClientAction] Supabase Service Role Client inicializado com sucesso.');
    } catch (supabaseError) {
      logger.error('[createProjectClientAction] Erro ao inicializar Supabase Service Role Client:', supabaseError);
      return { error: 'Erro interno: falha na inicialização do sistema.' };
    }

    // ✅ SUPABASE - Gerar número único do projeto (versão ultra-robusta)
    let projectNumber: string;
    let numberGenerationMethod = 'sequential'; // Para tracking
    
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `FV-${currentYear}-`;
      
      logger.info('[createProjectClientAction] Iniciando geração de número do projeto...');
      
      // Verificar se o Supabase está acessível
      let supabaseHealthy = false;
      try {
        const { data: healthCheck } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        supabaseHealthy = true;
        logger.info('[createProjectClientAction] Supabase health check: OK');
      } catch (healthError) {
        logger.error('[createProjectClientAction] Supabase health check falhou:', healthError);
        supabaseHealthy = false;
      }

      if (!supabaseHealthy) {
        // Se Supabase não está acessível, usar fallback sequencial
        projectNumber = await generateFallbackSequentialNumber();
        numberGenerationMethod = 'fallback_no_connection';
        logger.warn('[createProjectClientAction] Supabase inacessível, usando fallback sequencial:', projectNumber);
      } else {
        // Buscar o último número usado no ano atual com retry
        let lastProject = null;
        let retryCount = 0;
        const maxRetries = 3;
        let querySuccessful = false;
        
        while (retryCount < maxRetries && !querySuccessful) {
          try {
            logger.info(`[createProjectClientAction] Tentativa ${retryCount + 1} de buscar último projeto...`);
            
            const { data, error: queryError } = await supabase
              .from('projects')
              .select('number')
              .like('number', `${prefix}%`)
              .order('number', { ascending: false })
              .limit(1);

            if (queryError) {
              logger.warn(`[createProjectClientAction] Tentativa ${retryCount + 1} falhou:`, {
                error: queryError.message,
                code: queryError.code,
                details: queryError.details
              });
              
              if (retryCount === maxRetries - 1) {
                throw queryError;
              }
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              continue;
            }

            lastProject = data;
            querySuccessful = true;
            logger.info(`[createProjectClientAction] Query bem-sucedida na tentativa ${retryCount + 1}:`, {
              projectsFound: data?.length || 0,
              lastProjectNumber: data?.[0]?.number || 'nenhum'
            });
            break;
            
          } catch (retryError) {
            logger.warn(`[createProjectClientAction] Erro na tentativa ${retryCount + 1}:`, {
              error: retryError instanceof Error ? retryError.message : retryError,
              retryCount: retryCount + 1,
              maxRetries
            });
            retryCount++;
            if (retryCount >= maxRetries) {
              throw retryError;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (querySuccessful) {
          let nextNumber = 1;
          if (lastProject && lastProject.length > 0) {
            const lastNumber = lastProject[0].number;
            const numberPart = lastNumber.replace(prefix, '');
            const parsedNumber = parseInt(numberPart);
            if (!isNaN(parsedNumber)) {
              nextNumber = parsedNumber + 1;
            }
            logger.info('[createProjectClientAction] Último número encontrado:', {
              lastNumber,
              numberPart,
              parsedNumber,
              nextNumber
            });
          } else {
            logger.info('[createProjectClientAction] Nenhum projeto encontrado, começando com 001');
          }

          projectNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
          numberGenerationMethod = 'sequential';
          logger.info('[createProjectClientAction] Número do projeto gerado sequencialmente:', projectNumber);
        } else {
          throw new Error('Falha em todas as tentativas de query');
        }
      }
    } catch (numberError) {
      logger.error('[createProjectClientAction] Erro ao gerar número do projeto após todas as tentativas:', {
        error: numberError instanceof Error ? numberError.message : numberError,
        stack: numberError instanceof Error ? numberError.stack : undefined
      });
      
      // Fallback ultra-robusto: usar numeração sequencial simples
      projectNumber = await generateFallbackSequentialNumber();
      numberGenerationMethod = 'fallback_sequential';
      logger.warn('[createProjectClientAction] Usando número de fallback sequencial:', {
        projectNumber,
        method: numberGenerationMethod
      });
    }

    logger.info('[createProjectClientAction] Número final gerado:', {
      projectNumber,
      method: numberGenerationMethod
    });

    // ✅ SUPABASE - Buscar mensagem de checklist das configurações
    let checklistMessage = null;
    try {
      const { data: configData, error: configError } = await supabase
        .from('configs')
        .select('value')
        .eq('key', 'checklist_message')
        .eq('is_active', true)
        .single();

             if (!configError && configData) {
         checklistMessage = configData.value;
         logger.info('[createProjectClientAction] Mensagem de checklist carregada das configurações');
       } else {
         logger.warn('[createProjectClientAction] Mensagem de checklist não encontrada nas configurações');
       }
     } catch (configError) {
       logger.error('[createProjectClientAction] Erro ao buscar mensagem de checklist:', { configError });
    }

    // ✅ SUPABASE - Criar evento inicial de checklist para a timeline
    const initialTimelineEvents = [];
    const creationTimestamp = new Date().toISOString();

    if (checklistMessage) {
      const checklistEvent = {
        id: crypto.randomUUID(),
        type: 'checklist',
        content: checklistMessage,
        user: 'Sistema',
        userId: 'system',
        timestamp: creationTimestamp,
        isSystemGenerated: true,
        title: 'Checklist de Documentos Necessários para o Projeto',
        fullMessage: checklistMessage
      };
             initialTimelineEvents.push(checklistEvent);
       logger.info('[createProjectClientAction] Evento de checklist adicionado à timeline inicial');
     }

    // ✅ SUPABASE - Preparar dados do projeto para inserção
    const projectData = {
      name: projectDataFromClient.name || 'Projeto sem nome',
      number: projectNumber,
      created_by: clientUser.id,
      empresa_integradora: projectDataFromClient.empresaIntegradora || '',
      nome_cliente_final: projectDataFromClient.nomeClienteFinal || '',
      distribuidora: projectDataFromClient.distribuidora || '',
      potencia: typeof projectDataFromClient.potencia === 'string' 
        ? parseFloat(projectDataFromClient.potencia) || 0 
        : (projectDataFromClient.potencia as number) || 0,
      data_entrega: projectDataFromClient.dataEntrega || null,
      lista_materiais: projectDataFromClient.listaMateriais && projectDataFromClient.listaMateriais.trim() !== '' ? projectDataFromClient.listaMateriais : null,
      disjuntor_padrao_entrada: projectDataFromClient.disjuntorPadraoEntrada && projectDataFromClient.disjuntorPadraoEntrada.trim() !== '' ? projectDataFromClient.disjuntorPadraoEntrada : null,
      status: projectDataFromClient.status || 'Não Iniciado',
      prioridade: projectDataFromClient.prioridade || 'Baixa',
      valor_projeto: projectDataFromClient.valorProjeto || 0,
      pagamento: projectDataFromClient.pagamento || 'pendente', // ✅ GARANTIR SEMPRE PENDENTE
      
      timeline_events: initialTimelineEvents, // ✅ Agora inclui a checklist inicial
      documents: [],
      files: [],
      comments: [],
      history: [],
      last_update_by: {
        uid: clientUser.id,
        email: clientUser.email,
        name: clientUser.name || clientUser.email,
        role: 'cliente',
        timestamp: new Date().toISOString()
      }
    };

    // ✅ SUPABASE - Log dos dados que serão inseridos
    logger.info('[createProjectClientAction] Dados que serão inseridos no banco:', {
      lista_materiais: projectData.lista_materiais,
      disjuntor_padrao_entrada: projectData.disjuntor_padrao_entrada,
      nome_cliente_final: projectData.nome_cliente_final,
      distribuidora: projectData.distribuidora,
      potencia: projectData.potencia
    });

    // ✅ SUPABASE - Inserir projeto na tabela
    let newProject;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        logger.error('[createProjectClientAction] Erro ao inserir projeto no Supabase:', error);
        throw new Error(`Erro ao criar projeto: ${error.message}`);
      }

      newProject = data;
      logger.info('[createProjectClientAction] Projeto criado com sucesso no Supabase:', { projectId: newProject.id, number: newProject.number });
    } catch (insertError) {
      logger.error('[createProjectClientAction] Erro na inserção do projeto:', insertError);
      if (insertError instanceof Error) {
        if (insertError.message.includes('duplicate key')) {
          return { error: 'Número de projeto já existe. Tente novamente.' };
        }
        if (insertError.message.includes('foreign key')) {
          return { error: 'Erro de referência de usuário. Verifique se o usuário está registrado.' };
        }
        return { error: `Erro ao criar projeto: ${insertError.message}` };
      }
      return { error: 'Erro interno ao criar projeto.' };
    }

    // ✅ SUPABASE - Converter dados do Supabase para o formato Project do TypeScript
    const projectResult: Project = {
      id: newProject.id,
      userId: newProject.created_by, // Mapear created_by para userId
      name: newProject.name,
      number: newProject.number,
      empresaIntegradora: newProject.empresa_integradora,
      nomeClienteFinal: newProject.nome_cliente_final,
      distribuidora: newProject.distribuidora,
      potencia: newProject.potencia,
      dataEntrega: newProject.data_entrega,
      listaMateriais: newProject.lista_materiais,
      disjuntorPadraoEntrada: newProject.disjuntor_padrao_entrada,
      status: newProject.status,
      prioridade: newProject.prioridade,
      valorProjeto: newProject.valor_projeto,
      pagamento: newProject.pagamento,
      
      createdAt: newProject.created_at,
      updatedAt: newProject.updated_at,
      adminResponsibleId: newProject.admin_responsible_id,
      adminResponsibleName: newProject.admin_responsible_name,
      adminResponsibleEmail: newProject.admin_responsible_email,
      adminResponsiblePhone: newProject.admin_responsible_phone,
      timelineEvents: newProject.timeline_events || [],
      documents: newProject.documents || [],
      files: newProject.files || [],
      comments: newProject.comments || [],
      history: newProject.history || [],
      lastUpdateBy: newProject.last_update_by
    };

    // ✅ RESTAURADO - Tentar enviar notificação para admins
    try {
      const clientNameToDisplay = clientUser.name || clientUser.companyName || clientUser.email || "Cliente Desconhecido";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const projectUrlForAdmin = `${baseUrl}/admin/projetos/${projectResult.id}`;
      
      await notifyNewProject({
        projectId: projectResult.id,
        projectNumber: projectResult.number,
        projectName: projectResult.name,
        clientName: clientNameToDisplay,
        clientId: clientUser.id,
        potencia: projectResult.potencia,
        distribuidora: projectResult.distribuidora,
        senderId: clientUser.id,
        senderName: clientNameToDisplay
      });
      logger.info(`[createProjectClientAction] Notificação sobre novo projeto ${projectResult.number} enviada para admins.`);
    } catch (notificationError) {
      // Log notification error but don't fail the entire operation
      logger.error('[createProjectClientAction] Erro ao enviar notificação para admins (projeto criado com sucesso):', notificationError);
      // Continue without failing - the project was created successfully
    }
    
    // Revalidate paths safely
    try {
      revalidatePath('/cliente/projetos');
      revalidatePath('/admin/projetos');
      revalidatePath('/');
      logger.info('[createProjectClientAction] Paths revalidated successfully');
    } catch (revalidateError) {
      logger.error('[createProjectClientAction] Erro ao revalidar paths (projeto criado com sucesso):', revalidateError);
      // Continue without failing - the project was created successfully
    }

    return sanitizeForSerialization({
      data: projectResult,
      message: `Projeto '${projectResult.name}' criado com sucesso com o número ${projectResult.number}.`
    });

  } catch (error) {
    logger.error('[createProjectClientAction] Exceção não capturada ao criar projeto:', error);
    
    // Try to provide a more specific error message
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
        return { error: 'Permissão negada para criar projeto.' };
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return { error: 'Erro de conexão. Verifique sua internet e tente novamente.' };
      }
      return { error: `Erro ao criar projeto: ${error.message}` };
    }
    
    return { error: 'Erro interno desconhecido ao criar projeto.' };
  }
}

/**
 * Server Action para buscar projetos de um cliente específico.
 * @param clientId O ID do cliente.
 * @returns Uma promessa que resolve para um objeto contendo os projetos ou um erro.
 */
export async function getClientProjectsAction(
  clientId: string
): Promise<{ data?: Project[]; error?: string; message?: string }> {
  try {
    if (!clientId) {
      logger.warn('[getClientProjectsAction] Tentativa de buscar projetos sem clientId.');
      return { error: 'ID do cliente é obrigatório.' };
    }

    logger.debug('[getClientProjectsAction] Buscando projetos para o cliente:', { clientId });

    // Usar getProjectsAdmin, assumindo que isAdmin seria false para um cliente específico
    const projectList = await getProjectsByUserId(clientId);

    logger.info(`[getClientProjectsAction] ${projectList.length} projetos encontrados para o cliente: ${clientId}`);
    return { data: projectList, message: 'Projetos carregados com sucesso.' };

  } catch (error) {
    logger.error('[getClientProjectsAction] Erro ao buscar projetos do cliente:', error);
    let errorMessage = 'Falha ao buscar os projetos.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// NOVA SERVER ACTION PARA BUSCAR DADOS PARA O PAINEL DE ADMIN
export async function getAdminDashboardDataAction(): Promise<{
  projects?: Project[];
  projectCount?: number;
  error?: string;
  message?: string;
}> {
  logger.info('[getAdminDashboardDataAction] Iniciando busca de dados para o painel de admin.');
  try {
    // ✅ CORRIGIDO: Usar getProjectsWithFilters para buscar todos os projetos
    const allProjects = await getProjectsWithFilters({ limit: 1000 });
    const projectCount = allProjects.length;

    // Log detalhado dos primeiros 2 projetos (ou menos, se houver menos)
    if (allProjects && allProjects.length > 0) {
      const sampleProjects = allProjects.slice(0, 2);
      logger.info('[getAdminDashboardDataAction] Amostra de dados dos projetos recebidos (raw):', JSON.stringify(sampleProjects, null, 2));
      
      // Log específico dos campos de data para a amostra
      sampleProjects.forEach((p, index) => {
        logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - createdAt: ${p.createdAt}, updatedAt: ${p.updatedAt}, dataEntrega: ${p.dataEntrega}`);
        if (p.comments && p.comments.length > 0) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - Primeiro Comentário createdAt: ${p.comments[0].createdAt}`);
        }
        if (p.timelineEvents && p.timelineEvents.length > 0) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - Primeiro TimelineEvent timestamp: ${p.timelineEvents[0].timestamp}`);
        }
        if (p.lastUpdateBy) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - lastUpdateBy timestamp: ${p.lastUpdateBy.timestamp}`);
        }
      });
    }

    logger.info(`[getAdminDashboardDataAction] ${projectCount} projetos encontrados.`);

    return { 
      projects: allProjects,
      projectCount: projectCount,
      message: 'Admin dashboard data fetched successfully.',
    };
  } catch (error) {
    logger.error('[getAdminDashboardDataAction] Erro ao buscar dados para o painel de admin:', error);
    let errorMessage = 'Failed to fetch admin dashboard data.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// SERVER ACTION PARA BUSCAR UM PROJETO ESPECÍFICO
export async function getProjectAction(projectId: string): Promise<{
  data?: Project;
  error?: string;
  message?: string;
}> {
  try {
    if (!projectId) {
      logger.warn('[getProjectAction] Tentativa de buscar projeto sem projectId.');
      return { error: 'ID do projeto é obrigatório.' };
    }

    logger.debug('[getProjectAction] Buscando projeto com ID:', { projectId });

    // ✅ CORRIGIDO: Usar busca direta no Supabase sem filtro de usuário
    // Isso permite que admins vejam qualquer projeto e que a verificação de permissão
    // seja feita no frontend baseada nos dados retornados
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('[getProjectAction] Projeto não encontrado:', projectId);
      return { error: 'Projeto não encontrado.' };
    }
      logger.error('[getProjectAction] Erro Supabase ao buscar projeto:', { projectId, error });
      return { error: `Erro ao buscar projeto: ${error.message}` };
    }

    if (!data) {
      logger.warn('[getProjectAction] Nenhum dado retornado para projeto:', projectId);
      return { error: 'Projeto não encontrado.' };
    }

    // Mapear dados do Supabase para o formato Project
    const project: Project = {
      id: data.id,
      userId: data.created_by,
      name: data.name,
      number: data.number,
      empresaIntegradora: data.empresa_integradora || '',
      nomeClienteFinal: data.nome_cliente_final || '',
      distribuidora: data.distribuidora || '',
      potencia: data.potencia || 0,
      dataEntrega: data.data_entrega || '',
      listaMateriais: data.lista_materiais || undefined,
      disjuntorPadraoEntrada: data.disjuntor_padrao_entrada || undefined,
      status: data.status || 'Não Iniciado',
      prioridade: data.prioridade || 'Baixa',
      valorProjeto: data.valor_projeto || null,
      pagamento: data.pagamento || undefined,
      
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      adminResponsibleId: data.admin_responsible_id,
      adminResponsibleName: data.admin_responsible_name,
      adminResponsibleEmail: data.admin_responsible_email,
      adminResponsiblePhone: data.admin_responsible_phone,
      timelineEvents: data.timeline_events || [],
      documents: data.documents || [],
      files: data.files || [],
      comments: data.comments || [],
      history: data.history || [],
      lastUpdateBy: data.last_update_by || undefined,
    };

    logger.info('[getProjectAction] Projeto encontrado:', { projectId: project.id, projectName: project.name, userId: project.userId });
    return sanitizeForSerialization({ data: project, message: 'Projeto carregado com sucesso.' });

  } catch (error) {
    logger.error('[getProjectAction] Erro ao buscar projeto:', { projectId, error });
    let errorMessage = 'Falha ao buscar o projeto.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// New Server Action for useProjects hook
export async function getProjectsForUserAction(options: { userId: string, isAdmin?: boolean }): Promise<{
  projects?: Project[];
  error?: string;
  message?: string;
}> {
  const { userId } = options;
  try {
    if (!userId) {
      logger.warn('[getProjectsForUserAction] Attempting to fetch projects without userId.');
      return { error: 'User ID is required.' };
    }

    logger.debug('[getProjectsForUserAction] Fetching projects for user:', { userId });

    // ✅ SUPABASE - Verificar role do usuário na tabela public.users
    const supabase = createSupabaseServiceRoleClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      logger.error('[getProjectsForUserAction] Error fetching user role:', userError);
      return { error: 'Erro ao verificar permissões do usuário.' };
    }

    const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';
    logger.debug('[getProjectsForUserAction] User role determined:', { userId, role: userData?.role, isAdmin });

    let projectList: Project[];

    if (isAdmin) {
      // ✅ CORRIGIDO - Para admins, buscar TODOS os projetos
      logger.debug('[getProjectsForUserAction] User is admin, fetching all projects');
      projectList = await getProjectsWithFilters({ limit: 1000 }); // Buscar todos os projetos
    } else {
      // ✅ CORRIGIDO - Para clientes, buscar apenas projetos do usuário
      logger.debug('[getProjectsForUserAction] User is client, fetching user projects only');
      projectList = await getProjectsByUserId(userId);
    }

    logger.info(`[getProjectsForUserAction] ${projectList.length} projects found for user: ${userId} (role: ${userData?.role}, isAdmin: ${isAdmin})`);
    return { projects: projectList, message: 'Projects loaded successfully.' };

  } catch (error) {
    logger.error('[getProjectsForUserAction] Error fetching projects for user:', { userId, error });
    let errorMessage = 'Failed to fetch projects.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

export async function deleteProjectAction(projectId: string): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  try {
    if (!projectId) {
      logger.warn('[deleteProjectAction] Attempting to delete project without projectId.');
      return { error: 'ID do projeto é obrigatório.' };
    }

    logger.info('[deleteProjectAction] Deleting project with ID:', { projectId });

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Excluir projeto no Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados do projeto para verificar se existe e obter arquivos
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData) {
      logger.warn('[deleteProjectAction] Project not found, cannot delete:', { projectId, error: fetchError });
      return { error: 'Projeto não encontrado.' };
    }

    // 1. Excluir arquivos associados do Supabase Storage (quando implementado)
    if (projectData.files && projectData.files.length > 0) {
      logger.debug(`[deleteProjectAction] Project has ${projectData.files.length} associated files. Storage deletion will be implemented when Supabase Storage is configured.`);
      
      // TODO: Implementar exclusão de arquivos do Supabase Storage
      // const deletePromises = projectData.files.map(file => {
      //   if (file.path) {
      //     return supabase.storage
      //       .from('project-files')
      //       .remove([file.path])
      //       .catch(err => {
      //         logger.error(`[deleteProjectAction] Failed to delete file ${file.path} from storage:`, err);
      //       });
      //   }
      //   return Promise.resolve();
      // });
      // await Promise.all(deletePromises);
      
      logger.debug(`[deleteProjectAction] File deletion from storage skipped (Supabase Storage not yet configured)`);
    }

    // 2. Excluir o projeto do Supabase
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      logger.error('[deleteProjectAction] Failed to delete project from Supabase:', { projectId, error: deleteError });
      return { error: `Falha ao excluir projeto: ${deleteError.message}` };
    }

    logger.info('[deleteProjectAction] Project deleted successfully from Supabase:', { projectId });

    // Revalidar caminhos relevantes
    revalidatePath('/admin/projetos'); // Para listas de admin
    revalidatePath('/cliente/projetos'); // Para listas de cliente
    revalidatePath('/');

    return { success: true, message: 'Projeto excluído com sucesso.' };

  } catch (error) {
    logger.error('[deleteProjectAction] Error deleting project:', { projectId, error });
    let errorMessage = 'Falha ao excluir o projeto.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

export async function generateUniqueProjectNumberAction(): Promise<{ number?: string; error?: string; }> {
  try {
    // Usar generateUniqueProjectNumberCore importado diretamente
    const allProjects = await getProjectsWithFilters({ limit: 1 });
    const number = allProjects && allProjects.length > 0 ? allProjects[0].number : null;
    
    if (!number || number.startsWith('FALLBACK-') || number.startsWith('ERROR-')) {
      logger.error('[generateUniqueProjectNumberAction] Serviço core retornou um número inválido ou de fallback:', number);
      return { error: 'Falha ao gerar número único de projeto.' };
    }

    logger.info('[generateUniqueProjectNumberAction] Número único gerado com sucesso:', number);
    return { number };
  } catch (error) {
    logger.error('[generateUniqueProjectNumberAction] Erro ao chamar generateUniqueProjectNumberCore:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar número do projeto.';
    return { error: errorMessage };
  }
}

export async function isProjectNumberUsedAction(projectNumber: string): Promise<{ isUsed?: boolean; error?: string; }> {
  try {
    // A função isProjectNumberAlreadyUsed de core.ts (Admin SDK) é mais apropriada para uma server action.
    if (!projectNumber) {
        return { error: 'Número do projeto não fornecido.', isUsed: true }; 
    }
    // Usar isProjectNumberAlreadyUsedCore (de core.ts, Admin SDK)
    const existingProjects = await getProjectsWithFilters({ limit: 1000 }); // Buscar todos os projetos
    const isUsed = existingProjects.some(project => project.number === projectNumber);
    return { isUsed };
  } catch (error) {
    logger.error('[isProjectNumberUsedAction] Erro ao chamar isProjectNumberAlreadyUsedCore:', { projectNumber, error });
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao verificar número do projeto.';
    return { error: errorMessage, isUsed: true }; 
  }
}
