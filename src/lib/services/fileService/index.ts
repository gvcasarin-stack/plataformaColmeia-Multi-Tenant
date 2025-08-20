/**
 * @file index.ts
 * @description Arquivo barril para o serviço de arquivos.
 * Fornece uma API unificada para o serviço e compatibilidade com APIs legadas.
 */

// Importar tipos para exportação
import type { 
  // Tipos que realmente existem em ./types.ts
  FileOperationUser,
  FileMetadata,
  FileUploadOptions,
  FileUploadResult,
  FileDeleteResult,
  MultipleFileUploadResult,
  FileValidationType,
  FileValidationResult,
  ProjectStorageStats
  // StorageError, UploadResult, ProjectFileData PARECEM NÃO EXISTIR OU FORAM RENOMEADOS
} from './types';

// Importar funções essenciais para exportação
import {
  uploadProjectFile,
  deleteProjectFile,
  uploadMultipleFiles
} from './core';

import {
  validateFile,
  validateFileExtension,
  validateFileSize
} from './validators';

// ✅ FUNÇÃO CORRIGIDA: Enviar notificação por e-mail sobre documentos COM COOLDOWN
export async function sendEmailNotificationForDocument(
  projectId: string,
  fileName: string,
  uploadedByUid: string,
  uploadedByEmail: string = 'sistema@colmeiasolar.com.br',
  uploadedByName: string = 'Sistema'
): Promise<boolean> {
  try {
    devLog.log(`[FileService] CORRIGIDO - Enviando notificação por e-mail para upload de documento. Projeto: ${projectId}, Arquivo: ${fileName}`);
    
    // ✅ CORREÇÃO: Usar notifyNewDocument que tem cooldown
    const { notifyNewDocument } = await import('@/lib/services/notificationService/helpers');
    
    // Buscar dados do projeto para obter informações necessárias
    const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/service');
    const supabase = createSupabaseServiceRoleClient();
    
    const { data: project } = await supabase
      .from('projects')
      .select('name, number, created_by')
      .eq('id', projectId)
      .single();
    
    if (!project) {
      devLog.error(`[FileService] Projeto ${projectId} não encontrado`);
      return false;
    }
    
    // Buscar dados do uploader
    const { data: uploaderData } = await supabase
      .from('users')
      .select('role, full_name, email')
      .eq('id', uploadedByUid)
      .single();
      
    const uploaderRole = uploaderData?.role || 'user';
    const uploaderFullName = uploaderData?.full_name || uploadedByName;
    
    // Determinar clientId baseado no role do uploader
    let clientId: string | undefined;
    let clientName: string | undefined;
    
    if (uploaderRole === 'admin' || uploaderRole === 'superadmin') {
      // Admin enviou → notificar cliente (dono do projeto)
      clientId = project.created_by;
      
      if (clientId) {
        const { data: clientData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', clientId)
          .single();
        clientName = clientData?.full_name || clientData?.email || 'Cliente';
      }
    } else {
      // Cliente enviou → usar o próprio uploader como cliente
      clientId = uploadedByUid;
      clientName = uploaderFullName;
    }
    
    // ✅ USAR SISTEMA DE COOLDOWN: notifyNewDocument
    const result = await notifyNewDocument({
      projectId: projectId,
      projectNumber: project.number,
      projectName: project.name,
      documentName: fileName,
      uploaderId: uploadedByUid,
      uploaderName: uploaderFullName,
      uploaderRole: uploaderRole,
      clientId: clientId,
      clientName: clientName
    });
    
    devLog.log(`[FileService] CORRIGIDO - Resultado da notificação:`, result);
    return result.emailSent;
    
  } catch (error) {
    devLog.error('[FileService] Erro ao enviar notificação por e-mail:', error);
    return false;
  }
}

// Exportar tipos que realmente existem
export type {
  FileOperationUser,
  FileMetadata,
  FileUploadOptions,
  FileUploadResult,
  FileDeleteResult,
  MultipleFileUploadResult,
  FileValidationType,
  FileValidationResult,
  ProjectStorageStats
};

// Exportar funções
export {
  uploadProjectFile,
  deleteProjectFile,
  uploadMultipleFiles,
  validateFile,
  validateFileExtension,
  validateFileSize
};

// Importar e exportar outras funções de helpers.ts que realmente existem
import { devLog } from "@/lib/utils/productionLogger";
import {
  // calculateStorageUsage, // Não existe em helpers.ts
  // getFileIcon, // Não existe em helpers.ts
  generateUniqueFileName, // Existe
  createFileMetadata as createFileMetadataHelper, // Renomear para evitar conflito se houver outro createFileMetadata
  createProjectFile as createProjectFileHelper, // Renomear
  getProjectNumber as getProjectNumberHelper,
  getProjectStorageStats as getProjectStorageStatsHelper,
  getFileTypeDescription as getFileTypeDescriptionHelper,
  formatFileSize as formatFileSizeHelper
} from './helpers';

export {
  generateUniqueFileName,
  createFileMetadataHelper,
  createProjectFileHelper,
  getProjectNumberHelper,
  getProjectStorageStatsHelper,
  getFileTypeDescriptionHelper,
  formatFileSizeHelper
};

// Para compatibilidade, exportar como objeto padrão
const fileService = {
  uploadProjectFile,
  deleteProjectFile,
  uploadMultipleFiles,
  
  validateFile,
  validateFileExtension,
  validateFileSize,
  
  generateUniqueFileName,
  createFileMetadata: createFileMetadataHelper,
  createProjectFile: createProjectFileHelper,
  getProjectNumber: getProjectNumberHelper,
  getProjectStorageStats: getProjectStorageStatsHelper,
  getFileTypeDescription: getFileTypeDescriptionHelper,
  formatFileSize: formatFileSizeHelper,
  
  sendEmailNotificationForDocument
};

export default fileService; 