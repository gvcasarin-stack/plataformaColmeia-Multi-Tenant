"use client"

import React, { useState, useEffect, useMemo, ReactNode, forwardRef, useImperativeHandle } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card } from "@/components/ui/card"
import { 
  Building2, 
  Users,
  BarChart3, 
  X
} from 'lucide-react'
import { Project, TimelineEvent } from "@/types/project"
import { ProjectStatus } from "@/types/kanban"
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { EditableColumnTitle } from '@/components/kanban'
import { getKanbanColumnTitles, updateKanbanColumnTitle, getKanbanColumnColors } from '@/lib/services/kanbanService'
import { toast } from '@/components/ui/use-toast'
import { DeleteColumnDialog } from '@/components/kanban'
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth'

/**
 * Define os IDs de coluna padrão do quadro Kanban
 */
type ColumnId = 
  | "nao-iniciados" 
  | "em-desenvolvimento" 
  | "aguardando-assinaturas" 
  | "em-homologacao" 
  | "projeto-aprovado" 
  | "aguardando-solicitar-vistoria" 
  | "projeto-pausado" 
  | "em-vistoria" 
  | "finalizado" 
  | "cancelado";

/**
 * Interface que define a estrutura de uma coluna do quadro Kanban
 */
interface Column {
  id: ColumnId;
  title: string;
  status: ProjectStatus;
  iconType: string; // ✅ CORREÇÃO REACT #130: Usar string ao invés de ReactNode
  color: string;
  style?: {
    border?: string;
    bg?: string;
  };
}

/**
 * Props do componente KanbanBoard
 */
interface KanbanBoardProps {
  projects: Project[];
  searchQuery?: string;
  onProjectUpdate?: (updatedProject: any) => Promise<any>;
}

/**
 * Estilos de prioridade para os cartões de projeto
 */
const priorityStyles = {
  'Alta': { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20', icon: <BarChart3 className="w-3 h-3 text-red-600" /> },
  'Média': { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-600/20', icon: <BarChart3 className="w-3 h-3 text-yellow-600" /> },
  'Baixa': { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20', icon: <BarChart3 className="w-3 h-3 text-green-600" /> },
  'Urgente': { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-600/20', icon: <BarChart3 className="w-3 h-3 text-purple-600" /> }
} as const; 

/**
 * Componente KanbanBoard
 * 
 * Um quadro Kanban editável para gerenciamento de projetos
 * Permite arrastar e soltar projetos entre colunas e editar títulos de colunas
 */
export const KanbanBoard = forwardRef<
  { reloadColumnTitles: () => Promise<boolean> },
  KanbanBoardProps
>(function KanbanBoard({ projects, searchQuery = '', onProjectUpdate }, ref) {
  const router = useRouter()
  const { user } = useAuth();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [customColumnTitles, setCustomColumnTitles] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dynamicColumns, setDynamicColumns] = useState<Record<string, any>>({});
  const [columnColors, setColumnColors] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string, title: string, isDefault: boolean }>({ id: '', title: '', isDefault: false });

  // Expor o método reloadColumnTitles através da ref
  useImperativeHandle(ref, () => ({
    reloadColumnTitles: async () => {
      return await reloadColumnTitles();
    }
  }));

  // Função para recarregar os títulos das colunas (útil após adicionar uma nova coluna)
  const reloadColumnTitles = async () => {
    try {
      setIsLoading(true);
      const titles = await getKanbanColumnTitles();
      setCustomColumnTitles(titles);
      
      // Carregar as cores das colunas
      const colors = await getKanbanColumnColors();
      setColumnColors(colors);
      
      // Identificar novas colunas personalizadas que não estão no conjunto padrão
      const baseColumnIds = [
        "nao-iniciados", "em-desenvolvimento", "aguardando-assinaturas", 
        "em-homologacao", "projeto-aprovado", "aguardando-solicitar-vistoria", 
        "projeto-pausado", "em-vistoria", "finalizado", "cancelado"
      ];
      
      // Colunas adicionadas pelo usuário (não estão nas colunas base)
      const customColumns: Record<string, any> = {};
      
      Object.entries(titles).forEach(([columnId, title]) => {
        if (!baseColumnIds.includes(columnId)) {
          // Esta é uma coluna personalizada adicionada pelo usuário
          const columnColor = colors[columnId] || 'bg-gray-500'; // Usar cor armazenada ou cinza como fallback
            
          customColumns[columnId] = {
            id: columnId,
            title: title,
            status: title as ProjectStatus, // O status é o mesmo que o título
            iconType: "x",
            color: columnColor,
            style: { 
              border: `border-l-${columnColor.replace('bg-', '')}`, 
              bg: `from-${columnColor.replace('bg-', '')}-50/80 to-${columnColor.replace('bg-', '')}-50/30` 
            }
          };
        }
      });
      
      setDynamicColumns(customColumns);
      return true;
    } catch (error) {
      devLog.error('Erro ao recarregar títulos de colunas:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível recarregar os títulos das colunas.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return localProjects;
    
    const query = searchQuery.toLowerCase();
    return localProjects.filter(project => {
      return (
        project.name?.toLowerCase().includes(query) ||
        project.number?.toString().includes(query) ||
        project.nomeClienteFinal?.toLowerCase().includes(query) ||
        project.empresaIntegradora?.toLowerCase().includes(query)
      );
    });
  }, [localProjects, searchQuery]);

  // Função para lidar com o clique no botão de excluir coluna
  const handleDeleteClick = (columnId: string, columnTitle: string, isDefaultColumn: boolean, e: React.MouseEvent) => {
    // Impedir que o clique propague para o contêiner (evita navegação para a página do projeto)
    e.stopPropagation();
    
    setColumnToDelete({
      id: columnId,
      title: columnTitle,
      isDefault: isDefaultColumn
    });
    setDeleteDialogOpen(true);
  };

  // Definir as colunas com títulos personalizados, se disponíveis
  const columns = useMemo<Record<ColumnId, Column>>(() => {
    const baseColumns: Record<ColumnId, Column> = {
  "nao-iniciados": {
        id: "nao-iniciados",
    title: "Não Iniciado",
        status: "Não Iniciado" as ProjectStatus,
        iconType: "x",
        color: "bg-blue-500",
        style: { border: 'border-l-blue-400', bg: 'from-blue-50/80 to-blue-50/30' }
  },
  "em-desenvolvimento": {
        id: "em-desenvolvimento",
    title: "Em Desenvolvimento",
        status: "Em Desenvolvimento" as ProjectStatus,
        iconType: "x",
        color: "bg-yellow-500",
        style: { border: 'border-l-yellow-400', bg: 'from-yellow-50/80 to-yellow-50/30' }
  },
  "aguardando-assinaturas": {
        id: "aguardando-assinaturas",
        title: "Aguardando Assinaturas",
        status: "Aguardando Assinaturas" as ProjectStatus,
        iconType: "x",
        color: "bg-orange-500",
        style: { border: 'border-l-orange-400', bg: 'from-orange-50/80 to-orange-50/30' }
  },
  "em-homologacao": {
        id: "em-homologacao",
        title: "Em Homologação",
        status: "Em Homologação" as ProjectStatus,
        iconType: "x",
        color: "bg-purple-500",
        style: { border: 'border-l-purple-400', bg: 'from-purple-50/80 to-purple-50/30' }
  },
  "projeto-aprovado": {
        id: "projeto-aprovado",
    title: "Projeto Aprovado",
        status: "Projeto Aprovado" as ProjectStatus,
        iconType: "x",
        color: "bg-green-500",
        style: { border: 'border-l-green-400', bg: 'from-green-50/80 to-green-50/30' }
      },
      "aguardando-solicitar-vistoria": {
        id: "aguardando-solicitar-vistoria",
        title: "Aguardando Solicitar Vistoria",
        status: "Aguardando Solicitar Vistoria" as ProjectStatus,
        iconType: "x",
        color: "bg-amber-500",
        style: { border: 'border-l-amber-400', bg: 'from-amber-50/80 to-amber-50/30' }
  },
  "projeto-pausado": {
        id: "projeto-pausado",
    title: "Projeto Pausado",
        status: "Projeto Pausado" as ProjectStatus,
        iconType: "x",
        color: "bg-yellow-500",
        style: { border: 'border-l-yellow-400', bg: 'from-yellow-50/80 to-yellow-50/30' }
  },
  "em-vistoria": {
        id: "em-vistoria",
    title: "Em Vistoria",
        status: "Em Vistoria" as ProjectStatus,
        iconType: "x",
        color: "bg-cyan-500",
        style: { border: 'border-l-cyan-400', bg: 'from-cyan-50/80 to-cyan-50/30' }
  },
  "finalizado": {
        id: "finalizado",
    title: "Finalizado",
        status: "Finalizado" as ProjectStatus,
        iconType: "x",
        color: "bg-emerald-500",
        style: { border: 'border-l-emerald-400', bg: 'from-emerald-50/80 to-emerald-50/30' }
  },
  "cancelado": {
        id: "cancelado",
    title: "Cancelado",
        status: "Cancelado" as ProjectStatus,
        iconType: "x",
        color: "bg-red-500",
        style: { border: 'border-l-red-400', bg: 'from-red-50/80 to-red-50/30' }
      }
    };

    // Aplicar títulos personalizados se disponíveis
    if (customColumnTitles && !isLoading) {
      Object.keys(baseColumns).forEach((id) => {
        if (customColumnTitles[id]) {
          baseColumns[id as ColumnId].title = customColumnTitles[id];
        }
      });
    }

    return baseColumns;
  }, [customColumnTitles, isLoading]);

  // Função para atualizar o título de uma coluna
  const handleUpdateTitle = async (columnId: string, newTitle: string) => {
    try {
      // Verificar se a coluna existe e obter o status original
      const column = columns[columnId as ColumnId] || dynamicColumns[columnId];
      
      if (!column) {
        devLog.error(`Coluna não encontrada: ${columnId}`);
        toast({
          title: "Erro ao atualizar",
          description: "Coluna não encontrada. Por favor, recarregue a página e tente novamente.",
          variant: "destructive"
        });
        return;
      }
      
      const originalStatus = column.status;
      
      // Atualizar no Firestore
      await updateKanbanColumnTitle(columnId, newTitle, originalStatus);
      
      // Atualizar o estado local
      setCustomColumnTitles((prev) => ({
        ...prev,
        [columnId]: newTitle,
      }));
      
      toast({
        title: "Coluna atualizada",
        description: `O título da coluna foi atualizado com sucesso para "${newTitle}".`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      devLog.error('Erro ao atualizar título da coluna:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o título da coluna. Tente novamente mais tarde.",
        variant: "destructive"
      });
      throw error; // Re-throw para que o componente filho possa lidar com o erro
    }
  };

  const getColumnProjects = (columnId: ColumnId) => {
    devLog.log(`[Kanban] Getting projects for column: ${columnId}`);
    devLog.log(`[Kanban] Total projects: ${localProjects.length}`);
    
    // Normalize status for comparison
    const normalizeStatus = (status: string) => {
      // Convert to lowercase and remove accents and spaces
      return status.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");
    };
    
    // Map of expected statuses to their normalized versions
    const statusMap: Record<string, string[]> = {
      "nao-iniciados": ["não iniciado", "nao iniciado", "não-iniciado", "nao-iniciado"],
      "em-desenvolvimento": ["em desenvolvimento", "em-desenvolvimento"],
      "aguardando-assinaturas": ["aguardando assinaturas", "aguardando-assinaturas"],
      "em-homologacao": ["em homologação", "em-homologacao", "em homologacao", "em-homologação"],
      "projeto-aprovado": ["projeto aprovado", "projeto-aprovado"],
      "aguardando-solicitar-vistoria": ["aguardando solicitar vistoria", "aguardando-solicitar-vistoria"],
      "projeto-pausado": ["projeto pausado", "projeto-pausado"],
      "em-vistoria": ["em vistoria", "em-vistoria"],
      "finalizado": ["finalizado"],
      "cancelado": ["cancelado"]
    };
    
    // Get the expected statuses for this column
    const expectedStatuses = statusMap[columnId] || [];
    
    if (columnId === "nao-iniciados") {
      devLog.log(`[Kanban] Looking for projects with statuses: ${expectedStatuses.join(", ")}`);
      
      // Log all project statuses to debug
      const statusCounts: Record<string, number> = {};
      localProjects.forEach(project => {
        const status = project.status || "";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      devLog.log("[Kanban] Project status counts:", statusCounts);
    }
    
    return localProjects.filter(project => {
      const projectStatus = (project.status || "").toLowerCase();
      const normalizedProjectStatus = normalizeStatus(projectStatus);
      
      // Check if the project status matches any of the expected statuses for this column
      const isMatch = expectedStatuses.some(status => 
        normalizedProjectStatus === normalizeStatus(status)
      );
      
      if (columnId === "nao-iniciados" && isMatch) {
        devLog.log(`[Kanban] Found "Não Iniciado" project:`, {
          id: project.id,
          name: project.name,
          status: project.status,
          normalizedStatus: normalizedProjectStatus
        });
      }
      
      return isMatch;
    });
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || 
        (destination.droppableId === source.droppableId && 
         destination.index === source.index)) {
      return;
    }

    const project = filteredProjects.find(p => p.id === draggableId);
    if (!project) return;

    const newStatus = columns[destination.droppableId as ColumnId].status;
    const oldStatus = project.status;

    // Verifica se houve mudança real de status
    if (oldStatus === newStatus) return;

    // Usar o user que já foi obtido no nível superior do componente
    // Priorizar user.profile.full_name, depois user.email, e por fim "Sistema"
    const userName = user?.profile?.full_name || user?.email || 'Sistema';
    const userId = user?.id || 'system';
    const userRole = user?.role || 'admin';

    // Log the project update
    devLog.log(`[Kanban] Updating project status:`, {
      id: project.id,
      oldStatus: project.status,
      newStatus: newStatus,
      user: userName // Usar userName aqui também para o log
    });

    // Obter os títulos personalizados para criar o evento de timeline
    const oldDisplayStatus = columns[Object.keys(columns).find(key => 
      columns[key as ColumnId].status === oldStatus
    ) as ColumnId]?.title || oldStatus;
    
    const newDisplayStatus = columns[destination.droppableId as ColumnId].title;

    // Criar o evento de timeline para a mudança de status
    const timelineEvent: TimelineEvent = {
      type: 'status',
      timestamp: new Date().toISOString(),
      // Adicionar userName ao content
      content: `Status alterado de ${oldDisplayStatus} para ${newDisplayStatus}`,
      user: userName, // Usar userName
      userId: userId,
      id: crypto.randomUUID(),
      userType: userRole,
      data: {
        oldStatus,
        newStatus,
        updatedBy: userName, // Usar userName
        updatedByEmail: user?.email || 'unknown', // Manter o email se disponível
        updatedByRole: userRole
      }
    };

    // Cria o projeto atualizado com informações de quem fez a atualização
    const updatedProject: Project = {
      ...project,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      timelineEvents: [
        timelineEvent,
        ...(project.timelineEvents || [])
      ],
      lastUpdateBy: {
        uid: userId,
        email: user?.email || 'unknown', // Manter o email se disponível
        role: userRole,
        timestamp: new Date().toISOString()
      }
    };

    // Atualiza o estado local para refletir a mudança imediatamente
    setLocalProjects(localProjects.map(p => 
      p.id === updatedProject.id ? updatedProject : p
    ));

    // Usar o callback fornecido para atualizar o projeto
    if (onProjectUpdate) {
      onProjectUpdate(updatedProject)
        .then(result => {
          devLog.log(`[Kanban] Project updated successfully:`, result);
        })
        .catch(error => {
          devLog.error(`[Kanban] Error updating project:`, error);
          // Reverter para o estado anterior em caso de erro
          setLocalProjects(localProjects.map(p => 
            p.id === project.id ? project : p
          ));
          toast({
            title: "Erro ao atualizar projeto",
            description: "Não foi possível atualizar o status do projeto.",
            variant: "destructive"
          });
        });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full overflow-x-auto pb-6">
        <div className="inline-flex gap-4 p-1 min-w-full">
          {/* Renderizar primeiro as colunas padrão */}
          {Object.entries(columns).map(([columnId, column]) => (
            <div 
              key={columnId} 
              className={cn(
                "flex-shrink-0 w-[280px] rounded-xl",
                "border border-gray-200 dark:border-gray-700",
                "bg-white dark:bg-gray-800",
                "hover:shadow-md transition-all duration-300",
                "shadow-sm",
              )}
            >
              <div className={cn(
                "px-4 py-3 border-b border-gray-100 dark:border-gray-700 rounded-t-xl",
                "bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750",
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      columnId === 'nao-iniciados' && 'bg-blue-500',
                      columnId === 'em-desenvolvimento' && 'bg-yellow-500',
                      columnId === 'aguardando-assinaturas' && 'bg-orange-500',
                      columnId === 'em-homologacao' && 'bg-purple-500',
                      columnId === 'projeto-aprovado' && 'bg-green-500',
                      columnId === 'aguardando-solicitar-vistoria' && 'bg-amber-500',
                      columnId === 'projeto-pausado' && 'bg-yellow-500',
                      columnId === 'em-vistoria' && 'bg-cyan-500',
                      columnId === 'finalizado' && 'bg-emerald-500',
                      columnId === 'cancelado' && 'bg-red-500'
                    )} />
                    <EditableColumnTitle
                      columnId={columnId}
                      title={column.title}
                      originalStatus={column.status}
                      onUpdateTitle={handleUpdateTitle}
                    />
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {getColumnProjects(columnId as ColumnId).length}
                  </span>
                  </div>
                  <div 
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center",
                      "bg-gray-100 dark:bg-gray-700",
                      "text-gray-500 dark:text-gray-400",
                      "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    )}
                    onClick={(e) => handleDeleteClick(columnId, column.title, true, e)}
                  >
                    <X className="h-4 w-4 text-red-500 hover:text-red-700" />
                  </div>
                </div>
              </div>

              <Droppable droppableId={columnId}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  >
                    {getColumnProjects(columnId as ColumnId).map((project, index) => (
                      <Draggable
                        key={project.id}
                        draggableId={project.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => router.push(`/projetos/${project.id}`)}
                            className={cn(
                              "cursor-pointer transform transition-all duration-150",
                              snapshot.isDragging && "rotate-[1deg] z-50"
                            )}
                          >
                            <Card className={cn(
                              "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow transition-all duration-200 p-3 space-y-2 overflow-hidden",
                              snapshot.isDragging && "shadow-lg ring-2 ring-blue-500/20"
                            )}>
                              {/* Header with Project Number and Priority */}
                              <div className="flex justify-between items-start gap-2">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {project.number}
                                </div>
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                                  project.prioridade === 'Alta' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                  project.prioridade === 'Média' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                )}>
                                  {priorityStyles[project.prioridade || 'Média'].icon}
                                  {project.prioridade}
                                </div>
                              </div>

                              {/* Project Details */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                  </div>
                                  <span className="truncate">{project.empresaIntegradora}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                    <Users className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                                  </div>
                                  <span className="truncate">{project.nomeClienteFinal}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                  <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                    <BarChart3 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                                  </div>
                                  <span className="truncate">{project.distribuidora}</span>
                                </div>
                              </div>

                              {/* Footer with Power and Date */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                  <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                                    <BarChart3 className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                  </div>
                                  <span>{project.potencia} kWp</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                  <div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                    <BarChart3 className="h-3 w-3 text-red-500 dark:text-red-400" />
                                  </div>
                                  <span>{new Date(project.dataEntrega).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                          </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          {/* Diálogo de exclusão de coluna */}
          <DeleteColumnDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            columnId={columnToDelete.id}
            columnTitle={columnToDelete.title}
            isDefaultColumn={columnToDelete.isDefault}
            onDeleted={reloadColumnTitles}
          />
        </div>
      </div>
    </DragDropContext>
  );
}); 