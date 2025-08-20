/**
 * @file types.ts
 * @description Definições de tipos para o serviço de arquivos.
 */

import { ProjectFile } from '@/types/project';

/**
 * Informações do usuário que está realizando operações de arquivo
 */
export interface FileOperationUser {
  /** ID do usuário */
  uid: string;
  /** Email do usuário (opcional) */
  email?: string | null;
  /** Nome do usuário (opcional) */
  name?: string;
  /** Função do usuário (admin, superadmin, client, etc) */
  role?: string;
}

/**
 * Metadados do arquivo para armazenamento
 */
export interface FileMetadata {
  /** ID do projeto ao qual o arquivo pertence */
  projectId: string;
  /** Nome original do arquivo */
  originalFileName: string;
  /** Timestamp de upload em formato ISO */
  uploadTimestamp: string;
  /** Tamanho do arquivo em bytes */
  fileSize: string;
  /** Tipo MIME do arquivo */
  fileType: string;
  /** ID do usuário que fez o upload */
  uploadedBy: string;
  /** Email do usuário que fez o upload */
  uploadedByEmail: string;
  /** Nome do usuário que fez o upload */
  uploadedByName: string;
  /** Função do usuário que fez o upload */
  uploadedByRole: string;
  /** Dados personalizados adicionais */
  [key: string]: string;
}

/**
 * Opções de upload de arquivo
 */
export interface FileUploadOptions {
  /** Se deve notificar sobre o upload */
  notify?: boolean;
  /** Se deve adicionar o arquivo ao array de arquivos do projeto */
  addToProject?: boolean;
  /** Pasta personalizada para o arquivo (padrão é 'projects/[projectId]') */
  customFolder?: string;
  /** Se deve comprimir imagens antes do upload */
  compressImages?: boolean;
  /** Limite de tamanho para compressão de imagens em bytes */
  compressionLimit?: number;
  /** Qualidade da compressão de imagem (0-1) */
  compressionQuality?: number;
}

/**
 * Resultado da operação de upload de arquivo
 */
export interface FileUploadResult {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  /** O arquivo enviado */
  file?: ProjectFile;
  /** Mensagem de erro, se houver */
  error?: string;
  /** ID do projeto */
  projectId: string;
  /** IDs de notificações criadas */
  notificationIds?: string[];
}

/**
 * Resultado da operação de exclusão de arquivo
 */
export interface FileDeleteResult {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  /** Mensagem de erro, se houver */
  error?: string;
  /** ID do projeto */
  projectId: string;
  /** Caminho do arquivo excluído */
  filePath: string;
}

/**
 * Resultado do upload de múltiplos arquivos
 */
export interface MultipleFileUploadResult {
  /** Resultados individuais de cada upload */
  results: FileUploadResult[];
  /** Número total de arquivos enviados com sucesso */
  successCount: number;
  /** Número total de arquivos que falharam */
  failureCount: number;
  /** ID do projeto */
  projectId: string;
}

/**
 * Tipo de validação de arquivo
 */
export type FileValidationType = 
  | 'size' 
  | 'type' 
  | 'name' 
  | 'extension';

/**
 * Resultado da validação de arquivo
 */
export interface FileValidationResult {
  /** Indica se o arquivo é válido */
  isValid: boolean;
  /** Tipo da falha na validação */
  failureType?: FileValidationType;
  /** Mensagem de erro, se houver */
  errorMessage?: string;
}

/**
 * Estatísticas de armazenamento para um projeto
 */
export interface ProjectStorageStats {
  /** ID do projeto */
  projectId: string;
  /** Espaço total usado em bytes */
  totalStorageUsed: number;
  /** Número total de arquivos */
  fileCount: number;
  /** Tamanho médio de arquivo em bytes */
  averageFileSize: number;
  /** Tamanho do maior arquivo em bytes */
  largestFileSize: number;
  /** Nome do maior arquivo */
  largestFileName: string;
  /** Último upload em formato ISO */
  lastUploadDate: string;
  /** Tipos de arquivo presentes */
  fileTypes: Record<string, number>;
} 