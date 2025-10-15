"use client"

import React, { useState, useEffect, useMemo, ReactNode, forwardRef, useImperativeHandle } from "react"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card } from "@/components/ui/card"
import {
  Building2,
  Users,
  BarChart3,
  X,
  Zap,
  Calendar,
  User,
  AlertCircle,
  Factory,
  AlertTriangle,
  Clock
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Project, TimelineEvent } from "@/types/project"
import { ProjectStatus } from "@/types/kanban"
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { EditableColumnTitle } from '@/components/kanban'
import { getKanbanColumnTitles, updateKanbanColumnTitle, getKanbanColumnColors, getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService'
import { toast } from '@/components/ui/use-toast'
import { DeleteColumnDialog } from '@/components/kanban'
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth'
import { calculateSLAStatus, calculateSLAExpiration } from '@/lib/utils/sla-calculator'

/**
 * Interface que define a estrutura de uma coluna do quadro Kanban
 * Agora dinâmica baseada nos status do tenant
 */
interface Column {
  id: string;
  title: string;
  slug: string;
  color: string;
  order: number;
  isDefault: boolean;
  projectCount: number;
  slaDays?: number | null;
  slaExcludeWeekends?: boolean;
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
  'Alta': { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20', icon: <AlertTriangle className="w-3 h-3 text-red-600" /> },
  'Média': { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-600/20', icon: <AlertTriangle className="w-3 h-3 text-yellow-600" /> },
  'Baixa': { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20', icon: <AlertTriangle className="w-3 h-3 text-green-600" /> },
  'Urgente': { bg: 'bg-purple-50', text: 'text-purple-700', ring: 'ring-purple-600/20', icon: <AlertTriangle className="w-3 h-3 text-purple-600" /> }
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
  const [isLoading, setIsLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});  // slug -> name
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string, title: string, isDefault: boolean }>({ id: '', title: '', isDefault: false });

  // Expor o método reloadColumnTitles através da ref
  useImperativeHandle(ref, () => ({
    reloadColumnTitles: async () => {
      return await reloadColumnTitles();
    }
  }));

  // Função para recarregar as colunas dinamicamente do tenant atual
  const reloadColumnTitles = async () => {
    try {
      devLog.log('[KanbanBoard] ========== INICIANDO RELOAD DE COLUNAS ==========');
      setIsLoading(true);

      devLog.log('[KanbanBoard] Buscando status via getProjectStatuses...');
      const statuses = await getProjectStatuses();

      devLog.log('[KanbanBoard] Status recebidos:', {
        count: statuses?.length || 0,
        statuses: statuses?.map(s => ({ id: s.id, name: s.name, slug: s.slug })) || []
      });

      // ✅ CORREÇÃO: Mapear ProjectStatusInfo para Column interface
      const mappedColumns: Column[] = statuses.map(status => ({
        id: status.id,
        title: status.name, // ✅ Mapear name -> title
        slug: status.slug,
        color: status.color,
        order: status.order,
        isDefault: status.isDefault,
        projectCount: status.projectCount,
        slaDays: status.slaDays,
        slaExcludeWeekends: status.slaExcludeWeekends
      }));

      devLog.log('[KanbanBoard] Mapeando columns:', {
        originalCount: statuses.length,
        mappedCount: mappedColumns.length
      });

      setColumns(mappedColumns);

      // Criar mapa slug -> name para conversões rápidas
      const map: Record<string, string> = {};
      statuses.forEach(status => {
        map[status.slug] = status.name;
      });
      setStatusMap(map);

      devLog.log('[KanbanBoard] ✅ COLUNAS ATUALIZADAS COM SUCESSO:', {
        count: statuses.length,
        newColumnsState: mappedColumns.map(c => ({ id: c.id, title: c.title, slug: c.slug }))
      });

      return true;
    } catch (error) {
      devLog.error('Erro ao recarregar colunas:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível recarregar as colunas.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar colunas na inicialização
  useEffect(() => {
    reloadColumnTitles();
  }, []);

  useEffect(() => {
    setLocalProjects(projects);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return localProjects;
    
    const query = searchQuery.toLowerCase();
    return localProjects.filter(project => {
      return (
        project.nome_cliente_final?.toLowerCase().includes(query) ||
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


  // Função para atualizar o título de uma coluna
  const handleUpdateTitle = async (columnId: string, newTitle: string) => {
    try {
      const column = columns.find(col => col.id === columnId);

      if (!column) {
        devLog.error(`Coluna não encontrada: ${columnId}`);
        toast({
          title: "Erro ao atualizar",
          description: "Coluna não encontrada. Por favor, recarregue a página e tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar via API
      await updateKanbanColumnTitle(columnId, newTitle, column.slug);

      // Atualizar o estado local
      setColumns(prev => prev.map(col =>
        col.id === columnId ? { ...col, title: newTitle } : col
      ));

      // Atualizar mapa slug -> name
      setStatusMap(prev => ({
        ...prev,
        [column.slug]: newTitle
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
      throw error;
    }
  };

  const getColumnProjects = (columnSlug: string) => {
    devLog.log(`[Kanban] Getting projects for column slug: ${columnSlug}`);
    devLog.log(`[Kanban] Total projects: ${localProjects.length}`);

    const filteredProjects = localProjects.filter(project => {
      // Usar slug diretamente para comparação
      return project.status === columnSlug;
    });

    devLog.log(`[Kanban] Found ${filteredProjects.length} projects for ${columnSlug}`);
    return filteredProjects;
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

    const newStatusSlug = destination.droppableId;
    const oldStatusSlug = project.status;

    devLog.log('[KANBAN DEBUG] Status change details:', {
      draggableId,
      sourceColumn: source.droppableId,
      destinationColumn: destination.droppableId,
      oldStatus: oldStatusSlug,
      newStatus: newStatusSlug,
      project: {
        id: project.id,
        currentStatus: project.status
      }
    });

    // Verifica se houve mudança real de status
    if (oldStatusSlug === newStatusSlug) return;

    // Validar se o status de destino existe nas colunas atuais
    const targetColumn = columns.find(col => col.slug === newStatusSlug);
    if (!targetColumn) {
      devLog.error('[KANBAN ERROR] Status de destino não encontrado:', newStatusSlug);
      toast({
        title: "Erro de Status",
        description: `Status de destino não é válido. Recarregue a página.`,
        variant: "destructive"
      });
      return;
    }

    const userName = user?.profile?.name || user?.email || 'Sistema';
    const userId = user?.id || 'system';
    const userRole = user?.role || 'admin';

    devLog.log(`[Kanban] Updating project status:`, {
      id: project.id,
      oldStatus: oldStatusSlug,
      newStatus: newStatusSlug,
      user: userName
    });

    // Obter nomes para display
    const oldColumn = columns.find(col => col.slug === oldStatusSlug);
    const newColumn = columns.find(col => col.slug === newStatusSlug);

    const oldDisplayStatus = oldColumn?.title || statusMap[oldStatusSlug] || oldStatusSlug;
    const newDisplayStatus = newColumn?.title || statusMap[newStatusSlug] || newStatusSlug;

    // ✅ Calcular SLA para o novo status
    const now = new Date();
    let slaExpiresAt: string | null = null;
    let slaExpired = false;

    if (targetColumn.slaDays && targetColumn.slaDays > 0) {
      const expirationDate = calculateSLAExpiration(
        now,
        targetColumn.slaDays,
        targetColumn.slaExcludeWeekends !== undefined ? targetColumn.slaExcludeWeekends : true
      );
      slaExpiresAt = expirationDate.toISOString();
      slaExpired = false; // Resetar flag ao mudar de status

      devLog.log('[Kanban] SLA calculado para novo status:', {
        status: newStatusSlug,
        slaDays: targetColumn.slaDays,
        excludeWeekends: targetColumn.slaExcludeWeekends,
        statusChangedAt: now.toISOString(),
        slaExpiresAt
      });
    } else {
      devLog.log('[Kanban] Sem SLA configurado para status:', newStatusSlug);
    }

    // Criar o evento de timeline para a mudança de status
    const timelineEvent: TimelineEvent = {
      type: 'status',
      timestamp: new Date().toISOString(),
      content: `Status alterado de ${oldDisplayStatus} para ${newDisplayStatus}${slaExpiresAt ? ` (Prazo: ${targetColumn.slaDays} dia${targetColumn.slaDays !== 1 ? 's' : ''})` : ''}`,
      user: userName,
      userId: userId,
      id: crypto.randomUUID(),
      userType: userRole,
      data: {
        oldStatus: oldStatusSlug,
        newStatus: newStatusSlug,
        updatedBy: userName,
        updatedByEmail: user?.email || 'unknown',
        updatedByRole: userRole
      }
    };

    // Cria o projeto atualizado usando slugs + campos SLA
    const updatedProject: Project = {
      ...project,
      status: newStatusSlug,  // Usar slug para o status
      updatedAt: new Date().toISOString(),
      status_changed_at: now.toISOString(), // ✅ Registrar quando mudou
      sla_expires_at: slaExpiresAt, // ✅ Quando expira o prazo
      sla_expired: slaExpired, // ✅ Flag de expirado
      timelineEvents: [
        timelineEvent,
        ...(project.timelineEvents || [])
      ],
      lastUpdateBy: {
        uid: userId,
        email: user?.email || 'unknown',
        role: userRole,
        timestamp: new Date().toISOString()
      }
    };

    // Atualiza o estado local
    setLocalProjects(localProjects.map(p =>
      p.id === updatedProject.id ? updatedProject : p
    ));

    // Usar o callback para atualizar via API
    if (onProjectUpdate) {
      onProjectUpdate(updatedProject)
        .then(result => {
          devLog.log(`[Kanban] Project updated successfully:`, result);
        })
        .catch(error => {
          devLog.error(`[Kanban] Error updating project:`, error);

          // Reverter para o estado anterior
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
          {/* Renderizar colunas dinâmicas do tenant */}
          {columns.map((column) => (
            <div
              key={column.id}
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
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: column.color }}
                    />
                    <EditableColumnTitle
                      columnId={column.id}
                      title={column.title}
                      originalStatus={column.slug}
                      onUpdateTitle={handleUpdateTitle}
                    />
                    <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {getColumnProjects(column.slug).length}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center",
                      "bg-gray-100 dark:bg-gray-700",
                      "text-gray-500 dark:text-gray-400",
                      "cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    )}
                    onClick={(e) => handleDeleteClick(column.id, column.title, column.isDefault, e)}
                  >
                    <X className="h-4 w-4 text-red-500 hover:text-red-700" />
                  </div>
                </div>
              </div>

              <Droppable droppableId={column.slug}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
                  >
                    {getColumnProjects(column.slug).map((project, index) => (
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
                                    <Factory className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                                  </div>
                                  <span className="truncate">{project.distribuidora}</span>
                                </div>
                              </div>

                              {/* Footer with Power and Date */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                  <div className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Zap className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                                  </div>
                                  <span>{project.potencia} kWp</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                  <div className="w-5 h-5 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                                    <Calendar className="h-3 w-3 text-red-500 dark:text-red-400" />
                                  </div>
                                  <span>{new Date(project.dataEntrega).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>

                              {/* ✅ Responsável pelo Projeto */}
                              {user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'colaborador') && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                  {project.adminResponsibleName ? (
                                    <Badge variant="secondary" className="w-full justify-center bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 text-xs py-1">
                                      <User className="h-3 w-3 mr-1" />
                                      {project.adminResponsibleName}
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="w-full justify-center bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 text-xs py-1">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Atribuir Responsável
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {/* ✅ Badge de SLA - Prazo da Etapa */}
                              {(() => {
                                const slaStatus = calculateSLAStatus(
                                  project.status_changed_at,
                                  project.sla_expires_at,
                                  column.slaDays,
                                  column.slaExcludeWeekends
                                );

                                // Não mostrar se não tem SLA configurado
                                if (slaStatus.status === 'no-sla') return null;

                                // Badge vermelho - ATRASADO
                                if (slaStatus.status === 'expired') {
                                  return (
                                    <div className="mt-2">
                                      <Badge className="w-full justify-center bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 text-xs py-1 font-medium">
                                        <Clock className="h-3 w-3 mr-1" />
                                        ATRASADO {slaStatus.hoursOverdue}h
                                      </Badge>
                                    </div>
                                  );
                                }

                                // Badge amarelo - ALERTA
                                if (slaStatus.status === 'warning') {
                                  return (
                                    <div className="mt-2">
                                      <Badge className="w-full justify-center bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800 text-xs py-1 font-medium">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        {slaStatus.message}
                                      </Badge>
                                    </div>
                                  );
                                }

                                // Badge verde - PRAZO OK
                                return (
                                  <div className="mt-2">
                                    <Badge className="w-full justify-center bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs py-1 font-medium">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {slaStatus.message}
                                    </Badge>
                                  </div>
                                );
                              })()}
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