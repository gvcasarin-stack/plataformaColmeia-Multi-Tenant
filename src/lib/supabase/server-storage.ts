/**
 * Operações de Storage exclusivamente para uso no servidor
 * 
 * Este módulo fornece operações seguras de Supabase Storage
 * que só podem ser executadas no ambiente servidor
 */

import { createSupabaseServiceRoleClient } from './service';
import { STORAGE_BUCKETS } from './storage';
import logger from '@/lib/utils/logger';

/**
 * Classe para operações de storage no servidor
 */
class ServerStorageManager {
  private supabase;

  constructor() {
    // Verificar se estamos no servidor
    if (typeof window !== 'undefined') {
      throw new Error('ServerStorageManager só pode ser usado no servidor');
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
    }
    
    this.supabase = createSupabaseServiceRoleClient();
  }

  /**
   * Deletar arquivos do storage
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<{
    success: boolean;
    deletedPaths?: string[];
    errors?: Array<{ path: string; error: string }>;
  }> {
    try {
      logger.info(`[ServerStorage] Deleting ${paths.length} files from ${bucket}`);

      const { data, error } = await this.supabase.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        logger.error(`[ServerStorage] Delete failed:`, error);
        return {
          success: false,
          errors: paths.map(path => ({ path, error: error.message }))
        };
      }

      const deletedPaths = data?.map(item => item.name) || [];
      logger.info(`[ServerStorage] ${deletedPaths.length} files deleted successfully`);

      return {
        success: true,
        deletedPaths
      };

    } catch (error) {
      logger.error(`[ServerStorage] Delete error:`, error);
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
   * Upload de arquivo
   */
  async uploadFile(options: {
    bucket: string;
    path: string;
    file: File | Buffer;
    contentType?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    data?: { path: string; fullPath: string; publicUrl?: string };
    error?: string;
  }> {
    try {
      const { bucket, path, file, contentType, metadata } = options;

      logger.info(`[ServerStorage] Uploading file to ${bucket}/${path}`);

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
        logger.error(`[ServerStorage] Upload failed:`, error);
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Obter URL pública
      let publicUrl;
      try {
        const { data: urlData } = this.supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      } catch (urlError) {
        logger.warn(`[ServerStorage] Could not get public URL:`, urlError);
      }

      logger.info(`[ServerStorage] File uploaded successfully: ${data.path}`);

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          publicUrl
        }
      };

    } catch (error) {
      logger.error(`[ServerStorage] Upload error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }
}

// Funções utilitárias para uso em server actions
export async function deleteProjectFiles(filePaths: string[]): Promise<{
  success: boolean;
  deletedPaths?: string[];
  errors?: Array<{ path: string; error: string }>;
}> {
  const manager = new ServerStorageManager();
  return manager.deleteFiles(STORAGE_BUCKETS.PROJECT_FILES, filePaths);
}

export async function uploadProjectFile(
  projectId: string,
  file: File | Buffer,
  fileName: string,
  contentType?: string
): Promise<{
  success: boolean;
  data?: { path: string; fullPath: string; publicUrl?: string };
  error?: string;
}> {
  const manager = new ServerStorageManager();
  const path = `projects/${projectId}/${fileName}`;
  
  return manager.uploadFile({
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

export default ServerStorageManager;
