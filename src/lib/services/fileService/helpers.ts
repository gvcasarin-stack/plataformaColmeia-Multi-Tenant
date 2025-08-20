/**
 * @file helpers.ts
 * @description Funções auxiliares para o serviço de arquivos.
 */

import { ProjectFile } from '@/types/project';
import { FileMetadata, FileOperationUser, ProjectStorageStats } from './types';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import logger from '@/lib/utils/logger';

/**
 * Gera um nome único para o arquivo baseado no timestamp e no nome original
 * 
 * @param fileName Nome original do arquivo
 * @returns Nome de arquivo único
 */
export function generateUniqueFileName(fileName: string): string {
  const timestamp = Date.now();
  return `${timestamp}-${fileName}`;
}

/**
 * Cria metadados para o arquivo
 * 
 * @param file O arquivo a ser processado
 * @param projectId ID do projeto
 * @param user Informações do usuário
 * @returns Metadados do arquivo
 */
export function createFileMetadata(
  file: File,
  projectId: string,
  user?: FileOperationUser
): FileMetadata {
  return {
    projectId,
    originalFileName: file.name,
    uploadTimestamp: new Date().toISOString(),
    fileSize: file.size.toString(),
    fileType: file.type,
    uploadedBy: user?.uid || 'unknown',
    uploadedByEmail: user?.email || 'unknown',
    uploadedByName: user?.name || user?.email || 'unknown',
    uploadedByRole: user?.role || 'unknown'
  };
}

/**
 * Cria um objeto ProjectFile a partir de dados básicos
 * 
 * @param file O arquivo original
 * @param path Caminho de armazenamento
 * @param url URL de download
 * @param user Informações do usuário
 * @returns Objeto ProjectFile
 */
export function createProjectFile(
  file: File,
  path: string,
  url: string,
  user?: FileOperationUser
): ProjectFile {
  return {
    name: file.name,
    path,
    url,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user?.uid,
    uploadedByName: user?.name || user?.email || 'Usuário',
    uploadedByEmail: user?.email || '',
    uploadedByRole: user?.role || ''
  };
}

/**
 * Obtém o número do projeto pelo ID
 * 
 * @param projectId ID do projeto
 * @returns Número do projeto ou o próprio ID se não encontrado
 */
export async function getProjectNumber(projectId: string): Promise<string> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      const projectData = projectSnap.data();
      return projectData.number || projectId;
    }
    
    return projectId;
  } catch (error) {
    logger.error('[FileService] Error getting project number:', error);
    return projectId; // Em caso de erro, usar o ID como número
  }
}

/**
 * Calcula o tamanho total dos arquivos de um projeto
 * 
 * @param projectId ID do projeto
 * @returns Estatísticas de armazenamento do projeto
 */
export async function getProjectStorageStats(projectId: string): Promise<ProjectStorageStats> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      throw new Error(`Projeto não encontrado: ${projectId}`);
    }
    
    const projectData = projectSnap.data();
    const files = projectData.files || [];
    
    // Valores iniciais
    let totalStorageUsed = 0;
    let largestFileSize = 0;
    let largestFileName = '';
    let lastUploadDate = '';
    const fileTypes: Record<string, number> = {};
    
    // Processar cada arquivo
    for (const file of files) {
      // Somar tamanho
      const fileSize = file.size || 0;
      totalStorageUsed += fileSize;
      
      // Verificar se é o maior arquivo
      if (fileSize > largestFileSize) {
        largestFileSize = fileSize;
        largestFileName = file.name || 'Desconhecido';
      }
      
      // Atualizar última data de upload
      const uploadDate = file.uploadedAt || '';
      if (!lastUploadDate || uploadDate > lastUploadDate) {
        lastUploadDate = uploadDate;
      }
      
      // Contar tipos de arquivo
      const fileType = file.type || 'unknown';
      fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;
    }
    
    // Calcular tamanho médio
    const fileCount = files.length;
    const averageFileSize = fileCount > 0 ? totalStorageUsed / fileCount : 0;
    
    return {
      projectId,
      totalStorageUsed,
      fileCount,
      averageFileSize,
      largestFileSize,
      largestFileName,
      lastUploadDate,
      fileTypes
    };
  } catch (error) {
    logger.error('[FileService] Error calculating project storage stats:', error);
    
    // Retornar estatísticas vazias em caso de erro
    return {
      projectId,
      totalStorageUsed: 0,
      fileCount: 0,
      averageFileSize: 0,
      largestFileSize: 0,
      largestFileName: '',
      lastUploadDate: '',
      fileTypes: {}
    };
  }
}

/**
 * Identifica o tipo de arquivo com base na extensão ou MIME type
 * 
 * @param file Arquivo ou nome de arquivo
 * @returns Descrição amigável do tipo de arquivo
 */
export function getFileTypeDescription(file: File | string): string {
  // Extrair a extensão
  const extension = typeof file === 'string' 
    ? file.split('.').pop()?.toLowerCase() 
    : file.name.split('.').pop()?.toLowerCase();
  
  // Mapear extensões comuns para descrições amigáveis
  const extensionMap: Record<string, string> = {
    'pdf': 'PDF',
    'doc': 'Documento Word',
    'docx': 'Documento Word',
    'xls': 'Planilha Excel',
    'xlsx': 'Planilha Excel',
    'ppt': 'Apresentação PowerPoint',
    'pptx': 'Apresentação PowerPoint',
    'txt': 'Arquivo de Texto',
    'csv': 'Arquivo CSV',
    'jpg': 'Imagem JPEG',
    'jpeg': 'Imagem JPEG',
    'png': 'Imagem PNG',
    'gif': 'Imagem GIF',
    'webp': 'Imagem WebP',
    'svg': 'Imagem SVG',
    'zip': 'Arquivo ZIP',
    'rar': 'Arquivo RAR',
    '7z': 'Arquivo 7-Zip',
    'dwg': 'Desenho AutoCAD',
    'dxf': 'Arquivo CAD',
    'stp': 'Arquivo STEP'
  };
  
  // Se tivermos uma extensão mapeada, retorná-la
  if (extension && extension in extensionMap) {
    return extensionMap[extension];
  }
  
  // Se for um arquivo, verificar o MIME type
  if (typeof file !== 'string') {
    if (file.type.startsWith('image/')) {
      return 'Imagem';
    }
    if (file.type.startsWith('video/')) {
      return 'Vídeo';
    }
    if (file.type.startsWith('audio/')) {
      return 'Áudio';
    }
    if (file.type.includes('pdf')) {
      return 'PDF';
    }
    if (file.type.includes('word') || file.type.includes('document')) {
      return 'Documento';
    }
    if (file.type.includes('excel') || file.type.includes('sheet')) {
      return 'Planilha';
    }
    if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
      return 'Apresentação';
    }
  }
  
  // Se nada corresponder, usar "Arquivo"
  return 'Arquivo';
}

/**
 * Formata o tamanho do arquivo para exibição
 * 
 * @param bytes Tamanho em bytes
 * @param decimals Casas decimais (padrão 2)
 * @returns Tamanho formatado (ex: "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
} 