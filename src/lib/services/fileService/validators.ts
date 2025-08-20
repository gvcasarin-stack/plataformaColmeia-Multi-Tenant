/**
 * @file validators.ts
 * @description Funções de validação para arquivos.
 */

import { FileValidationResult } from './types';
import logger from '@/lib/utils/logger';

// Constantes para validação
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const VALID_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed'
];

// Extensões de arquivo permitidas
const VALID_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'rar', '7z', 'dwg', 'dxf', 'stp'
];

/**
 * Valida o tamanho do arquivo
 * 
 * @param file O arquivo a ser validado
 * @param maxSize Tamanho máximo em bytes (padrão 20MB)
 * @returns Resultado da validação
 */
export function validateFileSize(file: File, maxSize: number = MAX_FILE_SIZE): FileValidationResult {
  if (file.size > maxSize) {
    const errorMessage = `Arquivo muito grande (${(file.size / (1024 * 1024)).toFixed(2)}MB). Tamanho máximo: ${(maxSize / (1024 * 1024)).toFixed(2)}MB`;
    logger.warn('[FileService] File size validation failed', { 
      fileName: file.name, 
      fileSize: file.size, 
      maxSize 
    });
    
    return {
      isValid: false,
      failureType: 'size',
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Valida o tipo MIME do arquivo
 * 
 * @param file O arquivo a ser validado
 * @param allowedTypes Tipos MIME permitidos (opcional)
 * @returns Resultado da validação
 */
export function validateFileType(file: File, allowedTypes?: string[]): FileValidationResult {
  // Se não foram especificados tipos, usar a lista padrão
  const types = allowedTypes || [...VALID_IMAGE_TYPES, ...VALID_DOCUMENT_TYPES];
  
  if (!types.includes(file.type)) {
    const errorMessage = `Tipo de arquivo não permitido: ${file.type}. Tipos permitidos: ${types.join(', ')}`;
    logger.warn('[FileService] File type validation failed', { 
      fileName: file.name, 
      fileType: file.type
    });
    
    return {
      isValid: false,
      failureType: 'type',
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Valida o nome do arquivo
 * 
 * @param file O arquivo a ser validado
 * @returns Resultado da validação
 */
export function validateFileName(file: File): FileValidationResult {
  // Verificar se o nome contém caracteres inválidos
  const invalidCharsRegex = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidCharsRegex.test(file.name)) {
    const errorMessage = `Nome de arquivo contém caracteres inválidos: ${file.name}`;
    logger.warn('[FileService] File name validation failed', { fileName: file.name });
    
    return {
      isValid: false,
      failureType: 'name',
      errorMessage
    };
  }
  
  // Verificar se o nome é muito longo
  if (file.name.length > 250) {
    const errorMessage = `Nome de arquivo muito longo: ${file.name.length} caracteres. Máximo: 250`;
    logger.warn('[FileService] File name too long', { fileName: file.name, length: file.name.length });
    
    return {
      isValid: false,
      failureType: 'name',
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Valida a extensão do arquivo
 * 
 * @param file O arquivo a ser validado
 * @param allowedExtensions Extensões permitidas (opcional)
 * @returns Resultado da validação
 */
export function validateFileExtension(file: File, allowedExtensions?: string[]): FileValidationResult {
  // Se não foram especificadas extensões, usar a lista padrão
  const extensions = allowedExtensions || VALID_EXTENSIONS;
  
  // Obter a extensão do arquivo
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (!extensions.includes(fileExtension)) {
    const errorMessage = `Extensão de arquivo não permitida: ${fileExtension}. Extensões permitidas: ${extensions.join(', ')}`;
    logger.warn('[FileService] File extension validation failed', { 
      fileName: file.name, 
      extension: fileExtension 
    });
    
    return {
      isValid: false,
      failureType: 'extension',
      errorMessage
    };
  }
  
  return { isValid: true };
}

/**
 * Executa todas as validações em um arquivo
 * 
 * @param file O arquivo a ser validado
 * @param options Opções adicionais de validação
 * @returns Resultado da validação
 */
export function validateFile(file: File, options?: {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}): FileValidationResult {
  // Validar tamanho
  const sizeValidation = validateFileSize(file, options?.maxSize);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }
  
  // Validar tipo
  const typeValidation = validateFileType(file, options?.allowedTypes);
  if (!typeValidation.isValid) {
    return typeValidation;
  }
  
  // Validar nome
  const nameValidation = validateFileName(file);
  if (!nameValidation.isValid) {
    return nameValidation;
  }
  
  // Validar extensão
  const extensionValidation = validateFileExtension(file, options?.allowedExtensions);
  if (!extensionValidation.isValid) {
    return extensionValidation;
  }
  
  return { isValid: true };
}

/**
 * Detecta se um arquivo é uma imagem
 * 
 * @param file O arquivo a ser verificado
 * @returns true se o arquivo for uma imagem
 */
export function isImage(file: File): boolean {
  return VALID_IMAGE_TYPES.includes(file.type);
}

/**
 * Detecta se um arquivo é um documento
 * 
 * @param file O arquivo a ser verificado
 * @returns true se o arquivo for um documento
 */
export function isDocument(file: File): boolean {
  return VALID_DOCUMENT_TYPES.includes(file.type);
} 