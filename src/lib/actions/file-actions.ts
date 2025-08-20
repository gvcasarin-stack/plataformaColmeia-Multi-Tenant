'use server'

import { revalidatePath } from 'next/cache';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { uploadProjectFile } from '@/lib/supabase/server-storage';
import { generateUniqueFileName } from '@/lib/supabase/storage';
import { devLog } from "@/lib/utils/productionLogger";
import { notifyNewDocument } from '@/lib/services/notificationService/helpers';

/**
 * Server Action para upload de arquivos de projeto
 */
export async function uploadProjectFileAction(
  projectId: string,
  formData: FormData,
  user: { id: string; email?: string; role?: string }
): Promise<{
  success: boolean;
  data?: { path: string; publicUrl?: string; fileName: string };
  error?: string;
  message?: string;
}> {
  try {
    // Verificar autenticação
    if (!user || !user.id) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // Verificar se o projeto existe e se o usuário tem permissão
    const supabase = createSupabaseServiceRoleClient();
    
    // ✅ CORRIGIDO: Buscar perfil do usuário da tabela users
    devLog.log('🔍 [URGENT DEBUG] Buscando perfil do usuário:', user.id);
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, full_name, email')
      .eq('id', user.id)
      .single();
    
    devLog.log('🔍 [URGENT DEBUG] Resultado da busca do perfil:', {
      userProfile,
      profileError: profileError?.message,
      hasProfile: !!userProfile
    });
    
    if (profileError) {
      devLog.error('🚨 [URGENT DEBUG] ERRO na busca do perfil:', profileError);
      // ✅ FALLBACK: Usar role padrão se não conseguir buscar perfil
      devLog.log('🔍 [URGENT DEBUG] Usando fallback para role');
    }
    
    // ✅ FALLBACK para evitar quebrar totalmente
    const finalProfile = userProfile || { 
      role: 'user', 
      full_name: user.email || 'Usuário', 
      email: user.email 
    };
    
    devLog.log('🔍 [URGENT DEBUG] Perfil final a ser usado:', finalProfile);
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by, name, number')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return {
        success: false,
        error: 'Projeto não encontrado'
      };
    }

    // ✅ CORRIGIDO: Verificar permissão com role correto
    const isOwner = project.created_by === user.id;
    const isAdmin = finalProfile.role === 'admin' || finalProfile.role === 'superadmin';
    
    // 🔍 DEBUG: Log da verificação de permissões
    devLog.log('🔍 [FILE UPLOAD DEBUG] Verificação de permissões:', {
      projectId,
      userId: user.id,
      userEmail: user.email,
      userProfileRole: finalProfile.role, // ✅ CORRETO
      projectCreatedBy: project.created_by,
      isOwner,
      isAdmin,
      userProfile: finalProfile
    });
    
    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'Sem permissão para fazer upload neste projeto'
      };
    }

    // Extrair arquivo do FormData
    const file = formData.get('file') as File;
    if (!file) {
      return {
        success: false,
        error: 'Nenhum arquivo fornecido'
      };
    }

    // Validar arquivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'Arquivo muito grande (máximo 10MB)'
      };
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Tipo de arquivo não permitido'
      };
    }

    // Gerar nome único
    const uniqueFileName = generateUniqueFileName(file.name);
    
    devLog.log(`[uploadProjectFileAction] Uploading file: ${uniqueFileName} for project: ${projectId}`);

    // Fazer upload usando server storage
    const uploadResult = await uploadProjectFile(
      projectId,
      file,
      uniqueFileName,
      file.type
    );

    if (!uploadResult.success) {
      devLog.error(`[uploadProjectFileAction] Upload failed:`, uploadResult.error);
      return {
        success: false,
        error: uploadResult.error || 'Erro no upload'
      };
    }

    // Atualizar projeto com novo arquivo
    const newFile = {
      id: crypto.randomUUID(),
      name: file.name,
      originalName: file.name,
      fileName: uniqueFileName,
      url: uploadResult.data?.publicUrl || '',
      path: uploadResult.data?.path || '',
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.id,
      uploadedByName: user.email || 'Usuário'
    };

    // Buscar arquivos atuais do projeto
    const { data: currentProject } = await supabase
      .from('projects')
      .select('files, timeline_events')
      .eq('id', projectId)
      .single();

    const currentFiles = currentProject?.files || [];
    const currentTimeline = currentProject?.timeline_events || [];

    // Criar evento de timeline
    const timelineEvent = {
      id: crypto.randomUUID(),
      type: 'document',
      timestamp: new Date().toISOString(),
      user: finalProfile.full_name || finalProfile.email || 'Usuário',
      userId: user.id,
      content: `Arquivo "${file.name}" foi enviado.`,
      fileName: file.name,
      fileUrl: newFile.url,
      fileId: newFile.id
    };

    // Atualizar projeto
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        files: [...currentFiles, newFile],
        timeline_events: [...currentTimeline, timelineEvent],
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId);

    if (updateError) {
      devLog.error(`[uploadProjectFileAction] Failed to update project:`, updateError);
      return {
        success: false,
        error: 'Erro ao atualizar projeto'
      };
    }

    // ✅ CORREÇÃO: Só revalidar em runtime, não durante build/static generation
    try {
      revalidatePath('/projetos');
      revalidatePath(`/projetos/${projectId}`);
    } catch (error) {
      // Falha silenciosa se não conseguir revalidar (ex: durante build estático)
      console.log('[revalidatePath] Skipped:', error.message);
    }

    devLog.log(`[uploadProjectFileAction] File uploaded successfully: ${uniqueFileName}`);

    // 🔥 ADICIONAR NOTIFICAÇÕES E EMAILS
    try {
      devLog.log(`🔍 [URGENT DEBUG] INÍCIO DAS NOTIFICAÇÕES - Upload concluído, iniciando notificações...`);
      devLog.log(`🔍 [URGENT DEBUG] Dados básicos:`, {
        projectId: project.id,
        fileName: file.name,
        userId: user.id,
        finalProfileRole: finalProfile.role,
        isAdmin
      });
      
      // ✅ CORRIGIDO: Buscar dados do cliente do projeto
      let clientId: string | undefined;
      let clientName: string | undefined;
      
      devLog.log(`🔍 [URGENT DEBUG] Verificando se é admin (${isAdmin}) e se projeto tem created_by (${project.created_by})`);
      
      if (isAdmin && project.created_by) {
        devLog.log(`🔍 [URGENT DEBUG] É admin fazendo upload, buscando dados do cliente: ${project.created_by}`);
        
        // Admin fez upload - buscar dados do cliente dono do projeto
        const { data: clientData, error: clientError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', project.created_by)
          .single();
          
        devLog.log(`🔍 [URGENT DEBUG] Resultado da busca do cliente:`, {
          clientData,
          clientError: clientError?.message,
          hasClientData: !!clientData
        });
          
        if (clientData) {
          clientId = clientData.id;
          clientName = clientData.full_name || clientData.email || 'Cliente';
          devLog.log(`🔍 [URGENT DEBUG] Cliente encontrado:`, { clientId, clientName });
        } else {
          devLog.error(`🚨 [URGENT DEBUG] ERRO: Cliente não encontrado!`, clientError);
        }
      } else {
        devLog.log(`🔍 [URGENT DEBUG] Não é admin ou projeto sem created_by - isAdmin:${isAdmin}, created_by:${project.created_by}`);
      }
      
      // 🔍 DEBUG DETALHADO: Log de todos os parâmetros
      devLog.log('🔍 [DEBUG notifyNewDocument] Parâmetros que serão enviados:', {
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.number,
        documentName: file.name,
        uploaderId: user.id,
        uploaderName: finalProfile.full_name || finalProfile.email || 'Usuário',
        uploaderRole: finalProfile.role || 'user',
        clientId: clientId,
        clientName: clientName,
        // Dados de contexto
        isOwner,
        isAdmin,
        projectCreatedBy: project.created_by,
        userRole: user.role,
        userProfileRole: finalProfile.role,
      });
      
      devLog.log(`🔍 [URGENT DEBUG] CHAMANDO notifyNewDocument...`);
      
      const notificationResult = await notifyNewDocument({
        projectId: project.id,
        projectName: project.name,
        projectNumber: project.number,
        documentName: file.name,
        uploaderName: finalProfile.full_name || finalProfile.email || 'Usuário',
        uploaderRole: finalProfile.role || 'user',
        uploaderId: user.id,
        clientId: clientId,  // ✅ ADICIONADO: ID do cliente
        clientName: clientName // ✅ ADICIONADO: Nome do cliente
      });
      
      devLog.log(`🔍 [URGENT DEBUG] RESULTADO da notifyNewDocument:`, notificationResult);
      
      devLog.log(`🔍 [URGENT DEBUG] Notificações enviadas com sucesso`);
    } catch (notificationError) {
      devLog.error(`🚨 [URGENT DEBUG] ERRO CRÍTICO ao enviar notificações:`, notificationError);
      devLog.error(`🚨 [URGENT DEBUG] Stack trace:`, notificationError.stack);
      // Não falha o upload se houver erro de notificação
    }

    return {
      success: true,
      data: {
        path: uploadResult.data?.path || '',
        publicUrl: uploadResult.data?.publicUrl || '',
        fileName: uniqueFileName
      },
      message: 'Arquivo enviado com sucesso'
    };

  } catch (error) {
    devLog.error(`[uploadProjectFileAction] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    };
  }
} 