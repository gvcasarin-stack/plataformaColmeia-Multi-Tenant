"use client"

import { useState } from "react"
import { FileUpload } from "@/components/ui/file-upload"
import { toast } from "@/components/ui/use-toast"
import { Project } from "@/types/project"
import { useAuth } from "@/lib/hooks/useAuth"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Trash2, X, Check } from "lucide-react"
import { devLog } from "@/lib/utils/productionLogger";
import { deleteFileAction } from "@/lib/actions/project-actions"

interface FileUploadSectionProps {
  project?: Project;
  onUpdate?: (files: File[]) => Promise<void>;
  onUpload?: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  onUploadSuccess?: () => void;
}

export function FileUploadSection({ 
  project, 
  onUpdate, 
  onUpload,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  onUploadSuccess
}: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [recentlyUploadedFiles, setRecentlyUploadedFiles] = useState<Set<string>>(new Set())
  const { user } = useAuth()
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null)

  // Função para verificar se um arquivo foi recentemente enviado
  const wasRecentlyUploaded = (fileName: string) => {
    return recentlyUploadedFiles.has(fileName);
  }
  
  // Função para marcar um arquivo como recentemente enviado e limpar após 5 segundos
  const markAsRecentlyUploaded = (fileName: string) => {
    setRecentlyUploadedFiles(prev => {
      const newSet = new Set(prev);
      newSet.add(fileName);
      return newSet;
    });
    
    // Remover do conjunto após 5 segundos para permitir re-upload posterior
    setTimeout(() => {
      setRecentlyUploadedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }, 5000);
  }

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Evitar processamento se já estiver fazendo upload
    if (uploading) {
      devLog.log('Upload já em andamento. Ignorando nova solicitação');
      
      // Verificar se o upload está preso em estado de uploading por muito tempo
      // e resetar se necessário (mais de 30 segundos)
      if (uploadStartTime && Date.now() - uploadStartTime > 30000) {
        devLog.log('Upload parece estar preso. Resetando estado...');
        setUploading(false);
        setUploadProgress({});
        setUploadStartTime(null);
        // Permitir que o usuário tente novamente
        return;
      }
      
      return;
    }
    
    // Registrar o tempo de início do upload
    setUploadStartTime(Date.now());
    
    // ✅ CORRIGIDO: Verificar se o usuário está autenticado (compatível com Supabase)
    const userId = user?.id;
    if (!user || !userId) {
      devLog.log('[FileUpload] Erro de autenticação - usuário não encontrado:', { user, userId });
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para fazer upload de arquivos.",
        variant: "destructive"
      });
      return;
    }

    // Debug completo do objeto usuário
    devLog.log('[FileUpload] ✅ Usuário autenticado (Supabase):', {
      id: userId,
      email: user.email,
      name: (user as any).full_name || (user as any).name,
      role: user.role
    });
    
    // Verificar se o projeto existe
    if (!project || !project.id) {
      toast({
        title: "Erro",
        description: "Dados do projeto não encontrados.",
        variant: "destructive"
      });
      return;
    }
    
    // Filtrar arquivos que foram recentemente enviados para evitar duplicação
    const filesToUpload = files.filter(file => !wasRecentlyUploaded(file.name));
    
    if (filesToUpload.length === 0) {
      devLog.log('Todos os arquivos já foram enviados recentemente');
      toast({
        title: "Atenção",
        description: "Estes arquivos foram enviados recentemente. Aguarde alguns segundos para enviar novamente.",
        variant: "default"
      });
      return;
    }
    
    // Marcar arquivos como recentemente enviados
    filesToUpload.forEach(file => markAsRecentlyUploaded(file.name));
    
    setUploading(true);
    setSelectedFiles(filesToUpload);
    
    try {
      const uploadedFiles = [];

      for (const file of filesToUpload) {
        // Configurar state inicial do progresso
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));
        
        try {
          devLog.log(`[FileUpload] Iniciando upload do arquivo: ${file.name}`);
          devLog.log(`[FileUpload] Usuário: ${userId}, Email: ${user.email}`);
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
          
          // ✅ CORRIGIDO: Usar server action para upload seguro
          const formData = new FormData();
          formData.append('file', file);
          
          const { uploadProjectFileAction } = await import('@/lib/actions/file-actions');
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
          
          const uploadResult = await uploadProjectFileAction(
            project.id,
            formData,
            {
              id: userId,
              email: user.email,
              role: user.role,
              profile: (user as any).profile
            } as any
          );
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 80 }));
          
          if (!uploadResult.success) {
            throw new Error(uploadResult.error || 'Erro no upload');
          }
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          
          devLog.log(`[FileUpload] ✅ Upload concluído (Server Action): ${file.name}`);
          devLog.log(`[FileUpload] Dados retornados:`, uploadResult.data);
          
          // Adicionar à lista de arquivos enviados
          uploadedFiles.push(file);
          
        } catch (error) {
          devLog.error(`[FileUpload] ❌ Erro no upload de ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
          
          toast({
            title: "Erro no upload",
            description: `Falha ao enviar ${file.name}: ${error.message || 'Erro desconhecido'}`,
            variant: "destructive"
          });
        }
      }
      
      // Se houver uploads bem-sucedidos
      if (uploadedFiles.length > 0) {
        devLog.log(`[FileUpload] ✅ ${uploadedFiles.length} arquivo(s) enviado(s) com sucesso`);
        
        // Atualizar o projeto se necessário
        if (onUpdate) {
          await onUpdate(uploadedFiles);
        } else if (onUpload) {
          await onUpload(uploadedFiles);
        }
        
        // Mostrar mensagem de sucesso
        toast({
          title: "Arquivo enviado com sucesso!",
          description: `${uploadedFiles.length} arquivo(s) adicionado(s) ao projeto`,
          className: "bg-green-500 text-white",
          duration: 5000
        });
        
        // Chamar callback de sucesso para atualizar a timeline
        if (onUploadSuccess) {
          devLog.log('[FileUpload] Chamando onUploadSuccess para atualizar timeline');
          await onUploadSuccess();
        }
      }
      
      // Limpar progresso e arquivos selecionados
      setTimeout(() => {
        setUploadProgress({});
        setSelectedFiles([]);
        setUploading(false);
        setUploadStartTime(null);
      }, 500);
      
    } catch (error) {
      devLog.error('[FileUpload] Erro geral no upload de arquivos:', error);
      
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao enviar os arquivos. Tente novamente.",
        variant: "destructive"
      });
      
      // Garantir que o estado de upload seja resetado mesmo em caso de erro
      setUploading(false);
      setUploadStartTime(null);
    }
  };

  // Convert allowedTypes to accept format for FileUpload component
  const getAcceptString = () => {
    const typeToExtension: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg,.jpeg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx'
    };
    
    return allowedTypes
      .map(type => typeToExtension[type] || type)
      .filter(Boolean)
      .join(',');
  };

  return (
    <div className="space-y-4 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-4">
        <FileUpload
          onFilesSelected={handleFileUpload}
          maxFiles={maxFiles}
          maxSize={maxSize}
          selectedFiles={selectedFiles}
          loading={uploading}
          accept={getAcceptString()}
        />
        {Object.entries(uploadProgress).map(([fileName, progress]) => (
          <div key={fileName} className="w-full space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{fileName}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
