"use client"

import { useState } from 'react'
import { Project, UpdatedProject } from "@/types/project"
import { FileEdit } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExpandedProjectView } from "@/app/components/expanded-project-view"
import { KanbanBoard } from "@/components/kanban/KanbanBoard"
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuth } from '@/lib/hooks/useAuth'
import { Loading } from '@/components/ui/loading'
import { toast } from "@/components/ui/use-toast"
import { DataTable } from "@/components/ui/data-table"
import { devLog } from "@/lib/utils/productionLogger";
import { ColumnDef } from "@tanstack/react-table"

/**
 * Props para o componente ProjectManagementTable
 */
interface ProjectManagementTableProps {
  /**
   * Título exibido acima da tabela
   */
  title?: string;
  /**
   * Subtítulo exibido acima da tabela
   */
  subtitle?: string;
  /**
   * Lista de projetos a serem exibidos na tabela
   */
  projects?: Project[];
  /**
   * Flag que indica se a tabela está em modo de edição
   */
  editable?: boolean;
  /**
   * Função chamada quando um projeto é atualizado
   */
  onProjectUpdate?: (project: UpdatedProject) => Promise<void>;
  /**
   * Modo de visualização (card ou kanban)
   */
  view?: 'card' | 'kanban';
  /**
   * Texto de busca para filtrar projetos
   */
  searchQuery?: string;
}

/**
 * Tabela de gerenciamento de projetos com recursos avançados
 * 
 * Este componente oferece uma tabela com funcionalidades de filtragem, paginação,
 * e possibilidade de edição de projetos
 */
export function ProjectManagementTable({
  title = "Gerenciamento de Projetos",
  subtitle = "Visualize e gerencie todos os projetos",
  projects: propProjects,
  editable = true,
  onProjectUpdate,
  view = 'card',
  searchQuery = ''
}: ProjectManagementTableProps) {
  // Estado interno para gerenciar projetos se não fornecidos via props
  const { projects: hookProjects, loading: projectsLoading, error: projectsError, updateProject: hookUpdateProject } = useProjects()
  const projects = propProjects || hookProjects
  const updateProject = onProjectUpdate || hookUpdateProject
  
  // Estado e referências para UI
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Gerenciamento de usuário atual
  const { user } = useAuth()
  
  // Estados de carregamento
  const [isUpdating, setIsUpdating] = useState(false)

  // Filtragem de projetos com base na busca
  const filteredProjects = searchQuery.trim() 
    ? projects.filter(project => 
        project.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.nomeClienteFinal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.empresaIntegradora?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects
  
  // Função para expandir e visualizar detalhes de um projeto
  const handleExpandProject = (project: Project) => {
    setSelectedProject(project)
    setIsExpanded(true)
  }
  
  // Função para atualizar um projeto
  const handleUpdateProject = async (updatedProject: UpdatedProject) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para atualizar projetos.",
        variant: "destructive",
      })
      return
    }
    
    try {
      setIsUpdating(true)
      await updateProject(updatedProject)
      
      toast({
        title: "Projeto atualizado",
        description: "O projeto foi atualizado com sucesso.",
      })
      
      // Fecha o painel de detalhes
      setIsExpanded(false)
      setSelectedProject(null)
      
      // Retorno fictício para satisfazer o tipo esperado pela interface
      return updatedProject as UpdatedProject
    } catch (error) {
      devLog.error("Erro ao atualizar projeto:", error)
      
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o projeto. Tente novamente.",
        variant: "destructive",
      })
      
      // Em caso de erro, mantemos a promessa retornando o projeto original
      return updatedProject as UpdatedProject
    } finally {
      setIsUpdating(false)
    }
  }
  
  // Definição das colunas da tabela
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "number",
      header: "Número",
      cell: ({ row }) => <div className="font-medium">{row.getValue("number")}</div>,
    },
    {
      accessorKey: "nomeClienteFinal",
      header: "Cliente",
      cell: ({ row }) => <div>{row.getValue("nomeClienteFinal") || "—"}</div>,
    },
    {
      accessorKey: "potencia",
      header: "Potência",
      cell: ({ row }) => <div>{row.getValue("potencia")} kWp</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={getStatusVariant(status)}>
            {status}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original as Project
        
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleExpandProject(project)
            }}
          >
            <FileEdit className="h-4 w-4 mr-2" />
            Detalhes
          </Button>
        )
      },
    },
  ]
  
  // Função auxiliar para determinar a variante do badge de status
  function getStatusVariant(status: string): "default" | "outline" | "secondary" | "destructive" {
    switch (status?.toLowerCase()) {
      case "em andamento":
        return "default"
      case "concluído":
        return "outline"
      case "aguardando":
        return "secondary"
      case "cancelado":
        return "destructive"
      default:
        return "secondary"
    }
  }
  
  if (projectsLoading) {
    return <Loading />
  }
  
  if (projectsError) {
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="text-sm text-red-700">
            Erro ao carregar projetos. Por favor, tente novamente.
          </div>
        </div>
      </div>
    )
  }
  
  // Renderização condicional baseada no modo de visualização
  if (view === 'kanban') {
    return (
      <div className="space-y-4">
        <KanbanBoard 
          projects={filteredProjects} 
          onProjectClick={handleExpandProject}
          onProjectUpdate={updateProject}
        />
        
        {selectedProject && (
          <ExpandedProjectView
            project={selectedProject}
            isOpen={isExpanded}
            onClose={() => setIsExpanded(false)}
            onUpdate={handleUpdateProject}
            isProcessing={isUpdating}
            editable={editable}
          />
        )}
      </div>
    )
  }
  
  // Visualização padrão em tabela
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      
      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={filteredProjects}
          onRowClick={(row) => handleExpandProject(row.original as Project)}
        />
      </div>
      
      {selectedProject && (
        <ExpandedProjectView
          project={selectedProject}
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          onUpdate={handleUpdateProject}
          isProcessing={isUpdating}
          editable={editable}
        />
      )}
    </div>
  )
}
