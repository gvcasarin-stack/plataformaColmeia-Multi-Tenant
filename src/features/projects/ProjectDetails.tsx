"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Project } from "@/types/project"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileEdit, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Timeline } from "@/components/timeline"
import { useProjects } from "@/lib/hooks/useProjects"
import { Loading } from "@/components/ui/loading"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ExpandedProjectView } from "@/app/components/expanded-project-view"
import { useAuth } from "@/lib/contexts/AuthContext"
import { FileUploadSection } from "@/components/file-upload-section"
import logger from '@/lib/utils/logger';
import { devLog } from "@/lib/utils/productionLogger";
import { getProjectAction } from "@/lib/actions/project-actions";

/**
 * Interface para as props do componente ProjectDetails
 */
interface ProjectDetailsProps {
  projectId: string
}

/**
 * Componente para exibir os detalhes de um projeto específico
 * 
 * Exibe informações detalhadas sobre um projeto, com opções para editar,
 * excluir e gerenciar arquivos do projeto
 */
export function ProjectDetails({ projectId }: ProjectDetailsProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { projects, loading, error, updateProject, deleteProject } = useProjects()
  const [project, setProject] = useState<Project | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Buscar o projeto da lista de projetos carregados
  useEffect(() => {
    const foundProject = projects.find(p => p.id === projectId);
    
    if (foundProject) {
      logger.debug(`Projeto encontrado na lista com status: ${foundProject.status}`);
      setProject(foundProject);
    } else {
      logger.debug('Projeto não encontrado na lista de projetos, buscando via action...');
      // Se não encontrar na lista local (ex: refresh da página), buscar via action
      const fetchProjectWithAction = async () => {
        const result = await getProjectAction(projectId);
        if (result.data) {
          logger.debug(`Projeto buscado via action com status: ${result.data.status}`);
          setProject(result.data);
        } else if (result.error) {
          logger.error('Erro ao buscar projeto via action:', result.error);
          setProject(null); // Definir como nulo se houver erro
        }
      };
      fetchProjectWithAction();
    }
  }, [projectId, projects]); // Mantendo projects como dependência para re-verificar se a lista mudar
  
  /**
   * Manipula a atualização de um projeto
   */
  const handleProjectUpdate = async (updatedProject: Project) => {
    try {
      logger.debug('Starting handleProjectUpdate with data:', updatedProject);
      
      // Call updateProject with the complete project data
      const updateResult = await updateProject(updatedProject);
      
      logger.debug('Update result:', updateResult);
      
      // Update the local state with the updated project
      setProject(updateResult || updatedProject);
      
      // Show toast
      toast({
        title: "Projeto atualizado",
        description: `Projeto atualizado com sucesso. Status: ${updatedProject.status}`,
      });
      
      // Force page reload
      setTimeout(() => {
        window.location.href = window.location.href.split('?')[0] + '?refresh=' + Date.now();
      }, 1500);
      
      setIsEditing(false);
    } catch (error) {
      logger.error('Error in handleProjectUpdate:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  }

  /**
   * Manipula a exclusão de um projeto
   */
  const handleProjectDelete = async () => {
    try {
      await deleteProject(projectId)
      toast({
        title: "Projeto excluído",
        description: "O projeto foi excluído com sucesso.",
      })
      router.push("/projetos")
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o projeto.",
        variant: "destructive",
      })
    }
  }

  /**
   * Manipula o upload de arquivos
   */
  const handleFileUpload = async (files: File[]) => {
    // Upload já é tratado pelo FileUploadSection via Server Action
    // Não precisa fazer nada adicional aqui
    devLog.log('[ProjectDetails] Upload de arquivos concluído:', files.length);
  }

  /**
   * Recarrega os dados do projeto após upload
   */
  const refreshProjectData = async () => {
    try {
      devLog.log('[ProjectDetails] Recarregando dados do projeto após upload...');
      const result = await getProjectAction(projectId);
      if (result.data) {
        devLog.log('[ProjectDetails] Projeto recarregado com sucesso');
        setProject(result.data);
      } else if (result.error) {
        devLog.error('[ProjectDetails] Erro ao recarregar projeto:', result.error);
      }
    } catch (error) {
      devLog.error('[ProjectDetails] Erro ao recarregar projeto:', error);
    }
  }

  if (loading) return <Loading />
  if (error) return <div className="text-center text-red-500">{error}</div>
  if (!project) return <div className="text-center">Projeto não encontrado.</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">
            Projeto {project.number}
          </h1>
          <Badge className="ml-2">{project.status}</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="flex items-center"
          >
            <FileEdit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="flex items-center">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir projeto</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleProjectDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Informações do Projeto</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Empresa Integradora</dt>
                <dd className="mt-1">{project.empresaIntegradora}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Cliente Final</dt>
                <dd className="mt-1">{project.nomeClienteFinal}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Distribuidora</dt>
                <dd className="mt-1">{project.distribuidora}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Potência</dt>
                <dd className="mt-1">{project.potencia} kWp</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Data de Entrega</dt>
                <dd className="mt-1">
                  {new Date(project.dataEntrega).toLocaleDateString("pt-BR")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Prioridade</dt>
                <dd className="mt-1">
                  <Badge variant="outline">{project.prioridade}</Badge>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border p-6">
            <FileUploadSection
              project={project}
              onUpdate={handleFileUpload}
              onUploadSuccess={refreshProjectData}
            />
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Linha do Tempo</h2>
          <Timeline projectId={project.id} />
        </div>
      </div>

      {isEditing && (
        <ExpandedProjectView
          project={project}
          onClose={() => setIsEditing(false)}
          onUpdate={handleProjectUpdate}
          currentUserEmail={user?.email || ''}
        />
      )}
    </div>
  )
}
