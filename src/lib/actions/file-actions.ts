'use server'

import { revalidatePath } from 'next/cache';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { uploadProjectFile } from '@/lib/supabase/server-storage';
import { generateUniqueFileName } from '@/lib/supabase/storage';
import { devLog } from "@/lib/utils/productionLogger";
import { notifyNewDocument } from '@/lib/services/notificationService/helpers';
// ✅ SEGURANÇA: Importar utilitários de segurança multi-tenant
import { getTenantFromUser, canUserAccessResource, verifyResourceOwnership } from '@/lib/utils/tenant-security';

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
    // 🚨 [DEBUG CRÍTICO] Capturar usuário que chega na função
    devLog.log('🚨 [DEBUG SESSION] uploadProjectFileAction - Dados do usuário recebido:', {
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      timestamp: new Date().toISOString(),
      projectId: projectId,
      expectedUserId: '70b7eacc-a3d5-480d-8058-f850671ba34f',
      userIdMatch: user?.id === '70b7eacc-a3d5-480d-8058-f850671ba34f' ? '✅ MATCH' : '❌ DIFFERENT'
    });

    // Verificar autenticação
    if (!user || !user.id) {
      return {
        success: false,
        error: 'Usuário não autenticado'
      };
    }

    // ✅ SEGURANÇA: Verificação direta e simples sem dependências complexas
    devLog.log('🔍 [uploadProjectFileAction] Verificando acesso ao projeto:', {
      userId: user.id,
      projectId,
      userEmail: user.email
    });
    
    // ✅ CORREÇÃO CRÍTICA: Criar cliente Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Obter tenant do usuário diretamente
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo?.tenant_id) {
      devLog.error('[uploadProjectFileAction] Usuário não encontrado:', userError?.message);
      return {
        success: false,
        error: 'Usuário não encontrado'
      };
    }

    // Verificar se projeto pertence ao mesmo tenant (verificação direta)
    const { data: projectExists, error: projectExistsError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('tenant_id', userInfo.tenant_id)
      .single();

    if (projectExistsError || !projectExists) {
      devLog.error('[uploadProjectFileAction] Projeto não encontrado no tenant do usuário:', {
        projectId,
        userTenantId: userInfo.tenant_id,
        error: projectExistsError?.message
      });
      return {
        success: false,
        error: 'Projeto não encontrado'
      };
    }

    devLog.log('🚨 [CRITICAL DEBUG] Acesso autorizado, continuando...', {
      projectId,
      userTenantId: userInfo.tenant_id
    });
    
    // ✅ CORRIGIDO: Buscar perfil do usuário da tabela users
    devLog.log('🔍 [URGENT DEBUG] Buscando perfil do usuário:', user.id);
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, name, email')
      .eq('id', user.id)
      .single();
    
    devLog.log('🚨 [CRITICAL DEBUG] Resultado da busca do perfil:', {
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
      name: user.email || 'Usuário', 
      email: user.email 
    } as any;
    
    devLog.log('🔍 [URGENT DEBUG] Perfil final a ser usado:', finalProfile);
    
    // ✅ SEGURANÇA: Buscar projeto verificando tenant (redundante mas seguro)
    devLog.log('🚨 [CRITICAL DEBUG] Buscando projeto na base:', projectId);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, created_by, owner_id, nome_cliente_final, number')
      .eq('id', projectId)
      .eq('tenant_id', userInfo.tenant_id)  // ✅ CRÍTICO: Verificar tenant
      .single();

    devLog.log('🚨 [CRITICAL DEBUG] Resultado da busca do projeto:', {
      project,
      projectError: projectError?.message,
      hasProject: !!project
    });

    if (projectError || !project) {
      return {
        success: false,
        error: 'Projeto não encontrado'
      };
    }

    // ✅ CORRIGIDO: Verificar permissão com role correto
    // isOwner: considera tanto created_by quanto owner_id (campo mais recente que separa criador de proprietário)
    const isOwner = project.created_by === user.id || project.owner_id === user.id;
    // isAdmin: colaborador tem acesso administrativo a projetos, consistente com o restante da aplicação
    const isAdmin = finalProfile.role === 'admin' || finalProfile.role === 'superadmin' || finalProfile.role === 'colaborador';
    
    devLog.log('🚨 [CRITICAL DEBUG] Verificação de permissões:', {
      userId: user.id,
      projectCreatedBy: project.created_by,
      userRole: finalProfile.role,
      isOwner,
      isAdmin,
      hasPermission: isOwner || isAdmin
    });
    
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
      devLog.log('🚨 [CRITICAL ERROR] PERMISSÃO NEGADA:', {
        userId: user.id,
        projectCreatedBy: project.created_by,
        userRole: finalProfile.role,
        isOwner,
        isAdmin
      });
      return {
        success: false,
        error: 'Sem permissão para fazer upload neste projeto'
      };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Permissão autorizada, continuando...');

    // Extrair arquivo do FormData
    devLog.log('🚨 [CRITICAL DEBUG] Extraindo arquivo do FormData...');
    const file = formData.get('file') as File;
    if (!file) {
      devLog.log('🚨 [CRITICAL ERROR] ARQUIVO NÃO FORNECIDO');
      return {
        success: false,
        error: 'Nenhum arquivo fornecido'
      };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Arquivo extraído:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validar arquivo
    devLog.log('🚨 [CRITICAL DEBUG] Validando arquivo...');
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      devLog.log('🚨 [CRITICAL ERROR] ARQUIVO MUITO GRANDE:', {
        fileSize: file.size,
        maxSize,
        fileName: file.name
      });
      return {
        success: false,
        error: 'Arquivo muito grande (máximo 10MB)'
      };
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      devLog.log('🚨 [CRITICAL ERROR] TIPO DE ARQUIVO NÃO PERMITIDO:', {
        fileType: file.type,
        allowedTypes,
        fileName: file.name
      });
      return {
        success: false,
        error: 'Tipo de arquivo não permitido'
      };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Arquivo validado com sucesso!');

    // Gerar nome único
    const uniqueFileName = generateUniqueFileName(file.name);
    
    devLog.log(`[uploadProjectFileAction] Uploading file: ${uniqueFileName} for project: ${projectId}`);

    // Fazer upload usando server storage
    devLog.log('🚨 [CRITICAL DEBUG] Iniciando upload do arquivo:', {
      projectId,
      fileName: uniqueFileName,
      fileType: file.type,
      fileSize: file.size
    });
    
    const uploadResult = await uploadProjectFile(
      projectId,
      file,
      uniqueFileName,
      file.type
    );
    
    devLog.log('🚨 [CRITICAL DEBUG] Resultado do upload:', {
      success: uploadResult.success,
      error: uploadResult.error,
      data: uploadResult.data
    });

    if (!uploadResult.success) {
      devLog.log('🚨 [CRITICAL ERROR] UPLOAD FALHOU COMPLETAMENTE:', {
        uploadError: uploadResult.error,
        projectId,
        fileName: uniqueFileName,
        fileType: file.type
      });
      devLog.error(`[uploadProjectFileAction] Upload failed:`, uploadResult.error);
      return {
        success: false,
        error: uploadResult.error || 'Erro no upload'
      };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Upload bem-sucedido! Continuando...');

    // Atualizar projeto com novo arquivo
    const fileId = crypto.randomUUID();
    const newFile = {
      id: fileId,
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
      .select('files')
      .eq('id', projectId)
      .single();

    const currentFiles = currentProject?.files || [];

    // Gravar evento na tabela dedicada (substitui JSONB timeline_events)
    const eventTimestamp = new Date().toISOString();
    const { error: timelineInsertError } = await supabase
      .from('project_timeline_events')
      .insert({
        project_id: projectId,
        tenant_id: userInfo.tenant_id,
        type: 'document',
        user_id: user.id,
        user_name: finalProfile.name || finalProfile.email || 'Usuário',
        content: `Arquivo "${file.name}" foi enviado.`,
        file_name: file.name,
        file_url: newFile.url,
        file_path: newFile.path,
        file_id: fileId,
        created_at: eventTimestamp
      });

    if (timelineInsertError) {
      devLog.error('[uploadProjectFileAction] Falha ao gravar evento na timeline:', timelineInsertError);
      // Não aborta o upload — só registra o erro
    }

    // Atualizar projeto (apenas files, sem timeline_events)
    devLog.log('🚨 [CRITICAL DEBUG] Atualizando projeto no banco:', {
      projectId,
      newFileName: newFile.name,
      currentFilesCount: currentFiles.length
    });

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        files: [...currentFiles, newFile],
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId);
      
    devLog.log('🚨 [CRITICAL DEBUG] Resultado da atualização do projeto:', {
      updateError: updateError?.message,
      hasError: !!updateError,
      projectId
    });

    if (updateError) {
      devLog.log('🚨 [CRITICAL ERROR] FALHOU AO ATUALIZAR PROJETO:', {
        updateError: updateError.message,
        code: updateError.code,
        details: updateError.details,
        projectId,
        userId: user.id
      });
      devLog.error(`[uploadProjectFileAction] Failed to update project:`, updateError);
      return {
        success: false,
        error: 'Erro ao atualizar projeto'
      };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Projeto atualizado com sucesso!');

    // ✅ CORREÇÃO: Só revalidar em runtime, não durante build/static generation
    try {
      revalidatePath('/projetos');
      revalidatePath(`/projetos/${projectId}`);
    } catch (error) {
      // Falha silenciosa se não conseguir revalidar (ex: durante build estático)
      devLog.log('[revalidatePath] Skipped:', error.message);
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
          .select('id, name, email')
          .eq('id', project.created_by)
          .single();
          
        devLog.log(`🔍 [URGENT DEBUG] Resultado da busca do cliente:`, {
          clientData,
          clientError: clientError?.message,
          hasClientData: !!clientData
        });
          
        if (clientData) {
          clientId = clientData.id;
          clientName = clientData.name || clientData.email || 'Cliente';
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
        projectName: project.nome_cliente_final,
        projectNumber: project.number,
        documentName: file.name,
        uploaderId: user.id,
        uploaderName: (finalProfile as any).name || finalProfile.email || 'Usuário',
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
        projectName: project.nome_cliente_final,
        projectNumber: project.number,
        documentName: file.name,
        uploaderName: (finalProfile as any).name || finalProfile.email || 'Usuário',
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

    devLog.log('🚨 [CRITICAL DEBUG] UPLOAD COMPLETO - SUCESSO TOTAL!');
    
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
    devLog.log('🚨 [CRITICAL ERROR] uploadProjectFileAction FALHOU:', error);
    devLog.log('🚨 [CRITICAL ERROR] Stack trace:', error?.stack);
    devLog.error(`[uploadProjectFileAction] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    };
  }
}

/**
 * 🎨 Server Action para upload de imagens inline em comentários
 * Diferente do uploadProjectFileAction, esta função:
 * - NÃO cria evento de documento na timeline
 * - NÃO adiciona o arquivo à lista de arquivos do projeto
 * - Apenas faz upload e retorna a URL pública
 */
export async function uploadCommentImageAction(
  projectId: string,
  formData: FormData,
  user: { id: string; email?: string; role?: string }
): Promise<{
  success: boolean;
  data?: { publicUrl: string };
  error?: string;
}> {
  try {
    // Extrair arquivo do FormData
    const imageFile = formData.get('file') as File;

    if (!imageFile) {
      return {
        success: false,
        error: 'Nenhum arquivo fornecido'
      };
    }

    devLog.log('🎨 [uploadCommentImageAction] Iniciando upload de imagem inline:', {
      projectId,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      userId: user.id
    });

    // Validar que é uma imagem
    if (!imageFile.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Apenas arquivos de imagem são permitidos'
      };
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return {
        success: false,
        error: 'Imagem muito grande. Máximo 10MB.'
      };
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar acesso ao projeto (segurança multi-tenant)
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo?.tenant_id) {
      devLog.error('[uploadCommentImageAction] Usuário não encontrado:', userError?.message);
      return {
        success: false,
        error: 'Usuário não encontrado'
      };
    }

    // Verificar se projeto pertence ao mesmo tenant
    const { data: projectExists, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('tenant_id', userInfo.tenant_id)
      .single();

    if (projectError || !projectExists) {
      devLog.error('[uploadCommentImageAction] Projeto não encontrado no tenant:', projectError?.message);
      return {
        success: false,
        error: 'Projeto não encontrado'
      };
    }

    // Gerar nome único para a imagem
    const uniqueFileName = generateUniqueFileName(imageFile.name);

    devLog.log('🎨 [uploadCommentImageAction] Fazendo upload:', uniqueFileName);

    // Fazer upload APENAS ao Storage (sem criar evento ou adicionar ao projeto)
    const uploadResult = await uploadProjectFile(
      projectId,
      imageFile,
      uniqueFileName,
      imageFile.type
    );

    if (!uploadResult.success || !uploadResult.data?.publicUrl) {
      devLog.error('🎨 [uploadCommentImageAction] Erro no upload:', uploadResult.error);
      return {
        success: false,
        error: uploadResult.error || 'Erro ao fazer upload da imagem'
      };
    }

    devLog.log('🎨 [uploadCommentImageAction] Upload bem-sucedido:', {
      publicUrl: uploadResult.data.publicUrl
    });

    return {
      success: true,
      data: {
        publicUrl: uploadResult.data.publicUrl
      }
    };

  } catch (error) {
    devLog.error('🎨 [uploadCommentImageAction] Erro:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    };
  }
} 