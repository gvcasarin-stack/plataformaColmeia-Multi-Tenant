/**
 * @file core.ts
 * @description Funções principais para operações de arquivos.
 */

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject
} from 'firebase/storage';
import { 
  updateDoc, 
  doc, 
  arrayUnion, 
  serverTimestamp, 
  getDoc, 
  arrayRemove 
} from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { ProjectFile } from '@/types/project';
import { 
  FileUploadResult, 
  FileOperationUser, 
  FileUploadOptions,
  FileDeleteResult,
  MultipleFileUploadResult,
  FileMetadata
} from './types';
import { 
  generateUniqueFileName, 
  createFileMetadata,
  createProjectFile,
  getProjectNumber
} from './helpers';
import { validateFile, isImage } from './validators';
import { createNotification } from '@/lib/services/notificationService/core';
import { NotificationType } from '@/types/notification';
import logger from '@/lib/utils/logger';

/**
 * Faz upload de um arquivo para o Firebase Storage e atualiza o projeto
 * 
 * @param projectId ID do projeto
 * @param file Arquivo a ser enviado
 * @param user Informações do usuário que está enviando
 * @param options Opções adicionais
 * @returns Resultado da operação com informações do arquivo
 */
export async function uploadProjectFile(
  projectId: string, 
  file: File, 
  user?: FileOperationUser,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> {
  try {
    // Validar o arquivo
    const validation = validateFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorMessage || 'Arquivo inválido',
        projectId
      };
    }
    
    // Gerar nome de arquivo único
    const fileName = generateUniqueFileName(file.name);
    
    // Definir caminho de armazenamento
    const folderPath = options.customFolder || `projects/${projectId}`;
    const path = `${folderPath}/${fileName}`;
    
    logger.debug('[FileService] Iniciando upload de arquivo', {
      projectId,
      fileName,
      path,
      fileSize: file.size,
      fileType: file.type,
      user: user ? { uid: user.uid, role: user.role } : 'No user'
    });
    
    // Processar a imagem se necessário
    let fileToUpload = file;
    if (options.compressImages && isImage(file) && file.size > (options.compressionLimit || 1024 * 1024)) {
      // Esta funcionalidade será implementada posteriormente, mas mantemos a estrutura preparada
      logger.debug('[FileService] Compressão de imagem seria aplicada, mas não está implementada');
    }
    
    // Criar referência do Storage
    const storageRef = ref(storage, path);
    
    // Criar metadados
    const metadata: FileMetadata = createFileMetadata(file, projectId, user);
    
    // Realizar o upload com tratamento de erros detalhado
    let uploadResult;
    try {
      uploadResult = await uploadBytes(storageRef, fileToUpload, {
        customMetadata: metadata as Record<string, string>
      });
      logger.debug('[FileService] Upload bem-sucedido, obtendo URL de download');
    } catch (uploadError: any) {
      logger.error('[FileService] Erro de upload', {
        code: uploadError.code,
        message: uploadError.message,
        name: uploadError.name,
        projectId,
        fileName: file.name
      });
      
      return {
        success: false,
        error: `Erro ao fazer upload: ${uploadError.message}`,
        projectId
      };
    }
    
    // Obter URL de download
    let downloadUrl;
    try {
      downloadUrl = await getDownloadURL(storageRef);
      logger.debug('[FileService] URL de download obtida com sucesso');
    } catch (urlError: any) {
      logger.error('[FileService] Erro ao obter URL de download', urlError);
      
      return {
        success: false,
        error: `Erro ao obter URL de download: ${urlError.message}`,
        projectId
      };
    }
    
    // Criar objeto de arquivo para o banco de dados
    const fileData = createProjectFile(file, path, downloadUrl, user);
    
    // Adicionar ao projeto se solicitado (padrão é true)
    if (options.addToProject !== false) {
      try {
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
          files: arrayUnion(fileData),
          updatedAt: serverTimestamp(),
          lastUpdateBy: user ? {
            uid: user.uid,
            email: user.email,
            role: user.role,
            timestamp: serverTimestamp()
          } : serverTimestamp()
        });
        
        logger.debug('[FileService] Projeto atualizado com o novo arquivo');
      } catch (updateError: any) {
        logger.error('[FileService] Erro ao atualizar projeto com novo arquivo', updateError);
        
        // Não falhar a operação se o arquivo já foi enviado com sucesso
        // mas registrar o erro para diagnóstico
      }
    }
    
    // Enviar notificações se solicitado
    const notificationIds: string[] = [];
    
    if (options.notify !== false && user) {
      try {
        await sendFileNotifications(projectId, fileData, user, notificationIds);
      } catch (notifyError) {
        logger.error('[FileService] Erro ao enviar notificações', notifyError);
        // Não falhar a operação principal se as notificações falharem
      }
    }
    
    return {
      success: true,
      file: fileData,
      projectId,
      notificationIds
    };
  } catch (error: any) {
    logger.error('[FileService] Erro não tratado ao fazer upload de arquivo', error);
    
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`,
      projectId
    };
  }
}

/**
 * Envia notificações sobre upload de arquivo
 * 
 * @param projectId ID do projeto
 * @param fileData Dados do arquivo
 * @param user Informações do usuário
 * @param notificationIds Array para armazenar IDs de notificações criadas
 */
async function sendFileNotifications(
  projectId: string,
  fileData: ProjectFile,
  user: FileOperationUser,
  notificationIds: string[] = []
): Promise<void> {
  try {
    const projectNumber = await getProjectNumber(projectId);
    const isAdminUploader = user.role === 'admin' || user.role === 'superadmin';
    const uploaderName = user.name || user.email?.split('@')[0] || (isAdminUploader ? 'Admin' : 'Usuário');
    
    let projectData: { name?: string; userId?: string; number?: string } = { name: projectNumber, number: projectNumber };
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const snapData = projectSnap.data();
        projectData = {
          name: snapData.name || projectNumber,
          userId: snapData.userId,
          number: snapData.number || projectNumber
        };
      }
    } catch (projectError) {
      logger.error('[FileService] Erro ao obter dados do projeto para notificações', { projectId, error: projectError });
      // Continuar mesmo sem todos os dados do projeto, usando o que temos
    }
    
    const projectName = projectData.name || projectNumber;
    const clientProjectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${projectId}`;
    const adminProjectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${projectId}`;

    if (isAdminUploader) {
      // Admin enviou arquivo -> notificar cliente dono do projeto
      if (projectData.userId) {
        logger.info('[FileService] Admin uploader. Notifying client:', { clientId: projectData.userId, fileName: fileData.name });
        const result = await createNotification({
          type: 'document_upload', // Usar string literal diretamente
          title: `Novo documento em ${projectName}`,
          message: `${uploaderName} adicionou o documento "${fileData.name}" ao seu projeto.`,
          userId: projectData.userId,
          projectId: projectId,
          projectNumber: projectData.number || projectNumber,
          projectName: projectName,
          senderId: user.uid,
          senderName: uploaderName,
          senderType: 'admin',
          data: { 
            documentName: fileData.name, 
          documentId: fileData.path,
            documentUrl: fileData.url,
            uploaderId: user.uid,
            uploaderName: uploaderName,
            link: clientProjectUrl,
            createdByAdmin: true
          }
        });
        if (result.success && result.id) {
          notificationIds.push(result.id);
          logger.info('[FileService] Client notification created:', { notificationId: result.id });
        }
      } else {
        logger.warn('[FileService] Admin uploader, but no client user ID found on project. Cannot notify client.', { projectId });
      }
    } else {
      // Cliente enviou arquivo -> notificar todos os admins
      logger.info('[FileService] Client uploader. Notifying all_admins:', { clientName: uploaderName, fileName: fileData.name });
      const result = await createNotification({
        type: 'document_upload', // Usar string literal diretamente
        title: `Documento de cliente em ${projectName}`,
        message: `${uploaderName} adicionou o documento "${fileData.name}" ao projeto ${projectData.number || projectNumber}.`,
        userId: 'all_admins',
        projectId: projectId,
        projectNumber: projectData.number || projectNumber,
        projectName: projectName,
        senderId: user.uid,
        senderName: uploaderName,
        senderType: 'client',
        data: { 
          documentName: fileData.name, 
          documentId: fileData.path,
          documentUrl: fileData.url,
          uploaderId: user.uid,
          uploaderName: uploaderName,
          link: adminProjectUrl,
          fromClient: true,
          clientName: uploaderName
        }
      });
      if (result.success && result.id) {
        notificationIds.push(result.id);
        logger.info('[FileService] Admin notification created:', { notificationId: result.id });
      }
    }
  } catch (error) {
    logger.error('[FileService] Erro em sendFileNotifications', { projectId, error });
    // Não relançar para não quebrar o upload principal
  }
}

/**
 * Exclui um arquivo do Firebase Storage e atualiza o projeto
 * 
 * @param projectId ID do projeto
 * @param filePath Caminho do arquivo no Storage
 * @param user Informações do usuário que está excluindo
 * @returns Resultado da operação
 */
export async function deleteProjectFile(
  projectId: string, 
  filePath: string,
  user?: FileOperationUser
): Promise<FileDeleteResult> {
  try {
    logger.debug('[FileService] Iniciando exclusão de arquivo', { projectId, filePath });
    
    // Verificar se o arquivo está associado ao projeto
    let fileData: ProjectFile | null = null;
    let projectData: any = null;
    
    try {
      const projectRef = doc(db, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      
      if (!projectSnap.exists()) {
        return {
          success: false,
          error: 'Projeto não encontrado',
          projectId,
          filePath
        };
      }
      
      projectData = projectSnap.data();
      const files = projectData.files || [];
      fileData = files.find((f: ProjectFile) => f.path === filePath) || null;
      
      if (!fileData) {
        return {
          success: false,
          error: 'Arquivo não encontrado no projeto',
          projectId,
          filePath
        };
      }
    } catch (projectError: any) {
      logger.error('[FileService] Erro ao verificar arquivo no projeto', projectError);
      
      return {
        success: false,
        error: `Erro ao verificar arquivo: ${projectError.message}`,
        projectId,
        filePath
      };
    }
    
    // Excluir o arquivo do Storage
    try {
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
      logger.debug('[FileService] Arquivo excluído do Storage com sucesso');
    } catch (deleteError: any) {
      // Se o arquivo não existir no Storage, continuamos para remover a referência
      if (deleteError.code === 'storage/object-not-found') {
        logger.warn('[FileService] Arquivo não encontrado no Storage, continuando com remoção da referência');
      } else {
        logger.error('[FileService] Erro ao excluir arquivo do Storage', deleteError);
        
        return {
          success: false,
          error: `Erro ao excluir arquivo: ${deleteError.message}`,
          projectId,
          filePath
        };
      }
    }
    
    // Remover a referência ao arquivo do projeto
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        files: arrayRemove(fileData),
        updatedAt: serverTimestamp(),
        lastUpdateBy: user ? {
          uid: user.uid,
          email: user.email,
          role: user.role,
          timestamp: serverTimestamp()
        } : serverTimestamp()
      });
      
      logger.debug('[FileService] Referência ao arquivo removida do projeto');
    } catch (updateError: any) {
      logger.error('[FileService] Erro ao remover referência ao arquivo do projeto', updateError);
      
      return {
        success: false,
        error: `Erro ao atualizar projeto: ${updateError.message}`,
        projectId,
        filePath
      };
    }
    
    // Enviar notificação sobre exclusão do arquivo
    if (user) {
      try {
        const projectNumber = projectData.number || projectId;
        const isAdmin = user.role === 'admin' || user.role === 'superadmin';
        const projectName = projectData.name || projectNumber;
        
        // Admin excluiu arquivo -> notificar cliente
        if (isAdmin && projectData.userId) {
          await createNotification({
            type: 'system_message',
            title: `Documento removido: ${fileData.name}`,
            message: `O administrador ${user.name || 'Admin'} removeu o documento "${fileData.name}" do seu projeto ${projectName}.`,
            userId: projectData.userId,
            projectId: projectId,
            projectNumber: projectNumber,
            projectName: projectName,
            senderId: user.uid,
            senderName: user.name || 'Administrador',
            senderType: 'admin',
            data: {
              documentName: fileData.name,
              action: 'delete',
              itemType: 'document'
            }
          });
        } 
        // Cliente excluiu arquivo -> notificar administradores
        else if (!isAdmin) {
          await createNotification({
            type: 'system_message',
            title: `Cliente removeu documento: ${fileData.name}`,
            message: `O cliente ${user.name || 'Cliente'} removeu o documento "${fileData.name}" do projeto ${projectName}.`,
            userId: 'all_admins',
            projectId: projectId,
            projectNumber: projectNumber,
            projectName: projectName,
            senderId: user.uid,
            senderName: user.name || user.email || 'Cliente',
            senderType: 'client',
            data: {
              documentName: fileData.name,
              action: 'delete',
              itemType: 'document',
              fromClient: true,
              clientName: user.name || user.email || 'Cliente'
            }
          });
        }
      } catch (notifyError) {
        logger.error('[FileService] Erro ao enviar notificação sobre exclusão de arquivo', notifyError);
        // Não falhar a operação se as notificações falharem
      }
    }
    
    return {
      success: true,
      projectId,
      filePath
    };
  } catch (error: any) {
    logger.error('[FileService] Erro não tratado ao excluir arquivo', error);
    
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`,
      projectId,
      filePath
    };
  }
}

/**
 * Faz upload de múltiplos arquivos
 * 
 * @param projectId ID do projeto
 * @param files Lista de arquivos
 * @param user Informações do usuário
 * @param options Opções adicionais
 * @returns Resultado da operação com informações de todos os arquivos
 */
export async function uploadMultipleFiles(
  projectId: string,
  files: File[],
  user?: FileOperationUser,
  options: FileUploadOptions = {}
): Promise<MultipleFileUploadResult> {
  const results: FileUploadResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  
  logger.debug('[FileService] Iniciando upload de múltiplos arquivos', { 
    projectId, 
    fileCount: files.length 
  });
  
  // Para cada arquivo, fazer upload individualmente
  for (const file of files) {
    try {
      const result = await uploadProjectFile(projectId, file, user, options);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    } catch (error) {
      logger.error('[FileService] Erro ao fazer upload de arquivo durante operação múltipla', {
        projectId,
        fileName: file.name,
        error
      });
      
      failureCount++;
      results.push({
        success: false,
        error: 'Erro ao processar arquivo',
        projectId
      });
    }
  }
  
  logger.debug('[FileService] Upload múltiplo concluído', {
    projectId,
    totalFiles: files.length,
    successCount,
    failureCount
  });
  
  return {
    results,
    successCount,
    failureCount,
    projectId
  };
} 