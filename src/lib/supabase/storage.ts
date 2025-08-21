/**
 * Configuração do Supabase Storage
 * 
 * Este módulo gerencia upload, download e exclusão de arquivos
 * usando o Supabase Storage como substituto do Firebase Storage
 */

import { createSupabaseServiceRoleClient } from './service';
import { createSupabaseBrowserClient } from './client';
import logger from '@/lib/utils/logger';

// Configurações dos buckets
export const STORAGE_BUCKETS = {
  PROJECT_FILES: 'project-files',
  PROJECT_DOCUMENTS: 'project-documents',
  USER_AVATARS: 'user-avatars'
} as const;

// Tipos para upload de arquivos
export interface UploadFileOptions {
  bucket: string;
  path: string;
  file: File | Buffer;
  contentType?: string;
  metadata?: Record<string, any>;
}

export interface UploadResult {
  success: boolean;
  data?: {
    path: string;
    fullPath: string;
    publicUrl?: string;
  };
  error?: string;
}

export interface DeleteFileOptions {
  bucket: string;
  paths: string[];
}

export interface DeleteResult {
  success: boolean;
  deletedPaths?: string[];
  errors?: Array<{ path: string; error: string }>;
}

/**
 * Classe para gerenciar operações do Supabase Storage
 */
export class SupabaseStorageManager {
  private supabase;
  private isServiceRole: boolean;

  constructor(useServiceRole = false) {
    this.isServiceRole = useServiceRole;
    this.supabase = useServiceRole 
      ? createSupabaseServiceRoleClient() 
      : createSupabaseBrowserClient();
  }

  /**
   * Upload de arquivo para o Supabase Storage
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadResult> {
    try {
      const { bucket, path, file, contentType, metadata } = options;

      logger.info(`[SupabaseStorage] Uploading file to ${bucket}/${path}`);

      const uploadOptions: any = {
        cacheControl: '3600',
        upsert: true
      };

      if (contentType) {
        uploadOptions.contentType = contentType;
      }

      if (metadata) {
        uploadOptions.metadata = metadata;
      }

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .upload(path, file, uploadOptions);

      if (error) {
        logger.error(`[SupabaseStorage] Upload failed:`, error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Obter URL pública se necessário
      let publicUrl;
      try {
        const { data: urlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      } catch (urlError) {
        logger.warn(`[SupabaseStorage] Could not get public URL:`, urlError);
      }

      logger.info(`[SupabaseStorage] File uploaded successfully: ${data.path}`);

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          publicUrl
        }
      };

    } catch (error) {
      logger.error(`[SupabaseStorage] Upload error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Download de arquivo do Supabase Storage
   */
  async downloadFile(bucket: string, path: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
    try {
      logger.info(`[SupabaseStorage] Downloading file from ${bucket}/${path}`);

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .download(path);

      if (error) {
        logger.error(`[SupabaseStorage] Download failed:`, error);
        return {
          success: false,
          error: `Download failed: ${error.message}`
        };
      }

      logger.info(`[SupabaseStorage] File downloaded successfully`);

      return {
        success: true,
        data
      };

    } catch (error) {
      logger.error(`[SupabaseStorage] Download error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown download error'
      };
    }
  }

  /**
   * Exclusão de arquivos do Supabase Storage
   */
  async deleteFiles(options: DeleteFileOptions): Promise<DeleteResult> {
    const { bucket, paths } = options;
    
    try {
      logger.info(`[SupabaseStorage] Deleting ${paths.length} files from ${bucket}`);

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        logger.error(`[SupabaseStorage] Delete failed:`, error);
        return {
          success: false,
          errors: paths.map(path => ({ path, error: error.message }))
        };
      }

      const deletedPaths = data?.map(item => item.name) || [];
      logger.info(`[SupabaseStorage] ${deletedPaths.length} files deleted successfully`);

      return {
        success: true,
        deletedPaths
      };

    } catch (error) {
      logger.error(`[SupabaseStorage] Delete error:`, error);
      return {
        success: false,
        errors: paths.map(path => ({ 
          path, 
          error: error instanceof Error ? error.message : 'Unknown delete error' 
        }))
      };
    }
  }

  /**
   * Obter URL pública de um arquivo
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }

  /**
   * Obter URL assinada (temporária) de um arquivo
   */
  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        url: data.signedUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Listar arquivos em um bucket
   */
  async listFiles(bucket: string, folder?: string): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(bucket)
        .list(folder);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        files: data
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Instâncias pré-configuradas
export const storageManager = new SupabaseStorageManager(false); // Para uso no cliente

// ✅ CORRIGIDO: storageManagerAdmin só para uso no servidor
export const storageManagerAdmin = (() => {
  // Verificar se estamos no servidor (ambiente Node.js)
  if (typeof window === 'undefined' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseStorageManager(true); // Para uso no servidor
  }
  
  // No cliente ou sem variável de ambiente, retornar null
  return null;
})();

// ✅ Função helper para obter storageManagerAdmin com verificação
export const getStorageManagerAdmin = (): SupabaseStorageManager => {
  if (typeof window !== 'undefined') {
    throw new Error('storageManagerAdmin não pode ser usado no cliente');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor');
  }
  
  return new SupabaseStorageManager(true);
};

/**
 * Funções utilitárias para uso direto
 */

/**
 * Upload de arquivo de projeto
 */
export async function uploadProjectFile(
  projectId: string, 
  file: File | Buffer, 
  fileName: string,
  contentType?: string
): Promise<UploadResult> {
  const path = `projects/${projectId}/${fileName}`;
  
  return getStorageManagerAdmin().uploadFile({
    bucket: STORAGE_BUCKETS.PROJECT_FILES,
    path,
    file,
    contentType,
    metadata: {
      projectId,
      uploadedAt: new Date().toISOString()
    }
  });
}

/**
 * Exclusão de arquivo de projeto
 */
export async function deleteProjectFile(
  projectId: string, 
  fileName: string
): Promise<DeleteResult> {
  const path = `projects/${projectId}/${fileName}`;
  
  return getStorageManagerAdmin().deleteFiles({
    bucket: STORAGE_BUCKETS.PROJECT_FILES,
    paths: [path]
  });
}

/**
 * Obter URL pública de arquivo de projeto
 */
export function getProjectFileUrl(projectId: string, fileName: string): string {
  const path = `projects/${projectId}/${fileName}`;
  return getStorageManagerAdmin().getPublicUrl(STORAGE_BUCKETS.PROJECT_FILES, path);
}

/**
 * Validar tipo de arquivo
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Validar tamanho de arquivo
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Gerar nome único para arquivo
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  let nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");
  
  // Remover caracteres especiais e acentos
  nameWithoutExtension = nameWithoutExtension
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remover caracteres especiais
    .replace(/\s+/g, '_') // Substituir espaços por underscore
    .trim();
  
  return `${nameWithoutExtension}_${timestamp}_${random}.${extension}`;
}

export default SupabaseStorageManager;
