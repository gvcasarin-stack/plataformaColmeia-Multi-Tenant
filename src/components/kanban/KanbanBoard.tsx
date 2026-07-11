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
  Clock,
  MoreVertical,
  Eye,
  UserPlus,
  Target,
  ArrowRightLeft,
  Link2,
  Archive,
  CheckCircle2,
  GripVertical
} from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Project, TimelineEvent } from "@/types/project"
import { ProjectStatus } from "@/types/kanban"
import { cn } from "@/lib/utils"
import { useRouter } from 'next/navigation'
import { EditableColumnTitle } from '@/components/kanban'
import { getKanbanColumnTitles, updateKanbanColumnTitle, getKanbanColumnColors, getProjectStatuses, updateStatusConclusion, reorderKanbanColumns, ProjectStatusInfo } from '@/lib/services/kanbanService'
import { toast } from '@/components/ui/use-toast'
import { DeleteColumnDialog } from '@/components/kanban'
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth'
import { calculateSLAStatus, calculateSLAExpiration } from '@/lib/utils/sla-calculator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  isConclusion?: boolean;
}

/**
 * Props do componente KanbanBoard
 */
interface KanbanBoardProps {
  projects: Project[];
  searchQuery?: string;
  sortBy?: string;
  onProjectUpdate?: (updatedProject: any) => Promise<any>;
  teamMembers?: Array<{ id: string, name: string, email: string }>;
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
>(function KanbanBoard({ projects, searchQuery = '', sortBy = 'manual', onProjectUpdate, teamMembers = [] }, ref) {
  const router = useRouter()
  const { user } = useAuth();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});  // slug -> name
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<{ id: string, title: string, isDefault: boolean }>({ id: '', title: '', isDefault: false });

  // 🆕 Estados para modal de arquivar
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToArchive, setProjectToArchive] = useState<Project | null>(null);

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
        slaExcludeWeekends: status.slaExcludeWeekends,
        isConclusion: status.isConclusion
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
        project.empresaIntegradora?.toLowerCase().includes(query) ||
        project.numero_uc?.toLowerCase().includes(query)
      );
    });
  }, [localProjects, searchQuery]);

  // 🆕 Funções de ação rápida
  const handleViewProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/projetos/${project.id}`);
  };

  const handleCopyLink = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/projetos/${project.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link copiado!",
        description: "O link do projeto foi copiado para a área de transferência.",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    }
  };

  const handleAssignResponsible = async (project: Project, memberId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const member = teamMembers.find(m => m.id === memberId);
    if (!member) return;

    try {
      // ✅ CORREÇÃO: Obter headers corretos usando tenant-helper
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // ✅ CORREÇÃO: Usar nomes de campos snake_case (como no banco)
          admin_responsible_id: memberId,
          admin_responsible_name: member.name,
          admin_responsible_email: member.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atribuir responsável');
      }

      // Atualizar localmente
      setLocalProjects(prev => prev.map(p =>
        p.id === project.id
          ? { ...p, adminResponsibleId: memberId, adminResponsibleName: member.name, adminResponsibleEmail: member.email }
          : p
      ));

      toast({
        title: "Responsável atribuído",
        description: `${member.name} agora é responsável pelo projeto ${project.number}.`,
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      devLog.error('[KanbanBoard] Erro ao atribuir responsável:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atribuir o responsável.",
        variant: "destructive"
      });
    }
  };

  const handleChangePriority = async (project: Project, newPriority: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // 🆕 CORREÇÃO: Obter headers corretos usando tenant-helper
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT', // ✅ CORREÇÃO: Usar PUT ao invés de PATCH
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prioridade: newPriority })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao alterar prioridade');
      }

      // Atualizar localmente
      setLocalProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, prioridade: newPriority as any } : p
      ));

      toast({
        title: "Prioridade alterada",
        description: `Prioridade do projeto ${project.number} alterada para ${newPriority}.`,
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      devLog.error('[KanbanBoard] Erro ao alterar prioridade:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar a prioridade.",
        variant: "destructive"
      });
    }
  };

  const handleChangeStatus = async (project: Project, newStatusSlug: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const newStatus = columns.find(col => col.slug === newStatusSlug);
    if (!newStatus) return;

    try {
      // 🆕 CORREÇÃO: Obter headers corretos usando tenant-helper
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT', // ✅ CORREÇÃO: Usar PUT ao invés de PATCH
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatusSlug })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao mudar status');
      }

      // Atualizar localmente
      setLocalProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: newStatusSlug as any } : p
      ));

      toast({
        title: "Status alterado",
        description: `Status do projeto ${project.number} alterado para ${newStatus.title}.`,
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      devLog.error('[KanbanBoard] Erro ao mudar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível mudar o status.",
        variant: "destructive"
      });
    }
  };

  const handleArchiveProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    // ✅ CORREÇÃO: Usar modal customizado ao invés de confirm()
    setProjectToArchive(project);
    setArchiveDialogOpen(true);
  };

  const confirmArchiveProject = async () => {
    if (!projectToArchive) return;

    try {
      // ✅ CORREÇÃO: Obter headers corretos usando tenant-helper
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id);

      const response = await fetch(`/api/projects/${projectToArchive.id}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao arquivar projeto');
      }

      // Remover localmente
      setLocalProjects(prev => prev.filter(p => p.id !== projectToArchive.id));

      toast({
        title: "Projeto arquivado",
        description: `Projeto ${projectToArchive.number} foi arquivado com sucesso.`,
        className: "bg-green-500 text-white"
      });

      // Fechar modal
      setArchiveDialogOpen(false);
      setProjectToArchive(null);
    } catch (error: any) {
      devLog.error('[KanbanBoard] Erro ao arquivar projeto:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível arquivar o projeto.",
        variant: "destructive"
      });
    }
  };

  // Alternar flag "representa conclusão" de uma coluna
  const handleToggleConclusion = async (columnId: string, current: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !current;
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, isConclusion: next } : c));
    try {
      await updateStatusConclusion(columnId, next);
      toast({
        title: next ? 'Status marcado como conclusão' : 'Status desmarcado',
        description: next
          ? 'Este status agora representa projetos concluídos nas métricas.'
          : 'Este status não representa mais conclusão.',
      });
    } catch {
      setColumns(prev => prev.map(c => c.id === columnId ? { ...c, isConclusion: current } : c));
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

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

    // Aplicar ordenação
    return sortProjects(filteredProjects);
  };

  /**
   * Função para ordenar projetos de acordo com o critério selecionado
   */
  const sortProjects = (projects: Project[]): Project[] => {
    const sorted = [...projects];

    switch (sortBy) {
      case 'manual':
        // Ordenação manual baseada no campo kanban_position
        return sorted.sort((a, b) => {
          const posA = a.kanban_position ?? Number.MAX_SAFE_INTEGER;
          const posB = b.kanban_position ?? Number.MAX_SAFE_INTEGER;
          return posA - posB;
        });

      case 'delivery-date-asc':
        // Data de entrega mais próxima primeiro
        return sorted.sort((a, b) =>
          new Date(a.dataEntrega).getTime() - new Date(b.dataEntrega).getTime()
        );

      case 'delivery-date-desc':
        // Data de entrega mais distante primeiro
        return sorted.sort((a, b) =>
          new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime()
        );

      case 'priority-desc':
        // Prioridade maior primeiro (Urgente > Alta > Média > Baixa)
        const priorityOrder = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        return sorted.sort((a, b) => {
          const priorityA = priorityOrder[a.prioridade] || 0;
          const priorityB = priorityOrder[b.prioridade] || 0;
          return priorityB - priorityA;
        });

      case 'priority-asc':
        // Prioridade menor primeiro (Baixa > Média > Alta > Urgente)
        const priorityOrderAsc = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        return sorted.sort((a, b) => {
          const priorityA = priorityOrderAsc[a.prioridade] || 0;
          const priorityB = priorityOrderAsc[b.prioridade] || 0;
          return priorityA - priorityB;
        });

      case 'sla-asc':
        // SLA expira primeiro
        return sorted.sort((a, b) => {
          // Projetos sem SLA vão para o final
          if (!a.sla_expires_at) return 1;
          if (!b.sla_expires_at) return -1;
          return new Date(a.sla_expires_at).getTime() - new Date(b.sla_expires_at).getTime();
        });

      case 'sla-desc':
        // SLA expira depois
        return sorted.sort((a, b) => {
          // Projetos sem SLA vão para o final
          if (!a.sla_expires_at) return 1;
          if (!b.sla_expires_at) return -1;
          return new Date(b.sla_expires_at).getTime() - new Date(a.sla_expires_at).getTime();
        });

      case 'created-asc':
        // Mais antigos primeiro
        return sorted.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

      case 'created-desc':
        // Mais recentes primeiro
        return sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      case 'updated-desc':
        // Última atualização mais recente primeiro
        return sorted.sort((a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

      case 'updated-asc':
        // Última atualização mais antiga primeiro
        return sorted.sort((a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );

      case 'value-desc':
        // Valor maior primeiro
        return sorted.sort((a, b) => {
          const valueA = a.valorProjeto ?? 0;
          const valueB = b.valorProjeto ?? 0;
          return valueB - valueA;
        });

      case 'value-asc':
        // Valor menor primeiro
        return sorted.sort((a, b) => {
          const valueA = a.valorProjeto ?? 0;
          const valueB = b.valorProjeto ?? 0;
          return valueA - valueB;
        });

      case 'client-asc':
        // Cliente A-Z
        return sorted.sort((a, b) =>
          (a.nomeClienteFinal || '').localeCompare(b.nomeClienteFinal || '')
        );

      case 'client-desc':
        // Cliente Z-A
        return sorted.sort((a, b) =>
          (b.nomeClienteFinal || '').localeCompare(a.nomeClienteFinal || '')
        );

      case 'time-in-status-desc':
        // Mais tempo na etapa atual primeiro
        return sorted.sort((a, b) => {
          const timeA = a.status_changed_at ?
            Date.now() - new Date(a.status_changed_at).getTime() : 0;
          const timeB = b.status_changed_at ?
            Date.now() - new Date(b.status_changed_at).getTime() : 0;
          return timeB - timeA;
        });

      case 'time-in-status-asc':
        // Menos tempo na etapa atual primeiro
        return sorted.sort((a, b) => {
          const timeA = a.status_changed_at ?
            Date.now() - new Date(a.status_changed_at).getTime() : 0;
          const timeB = b.status_changed_at ?
            Date.now() - new Date(b.status_changed_at).getTime() : 0;
          return timeA - timeB;
        });

      default:
        return sorted;
    }
  };

  /**
   * Função para lidar com reordenação manual dentro da mesma coluna
   */
  const handleManualReorder = async (
    projectId: string,
    columnSlug: string,
    oldIndex: number,
    newIndex: number
  ) => {
    devLog.log('[Kanban] Manual reorder:', { projectId, columnSlug, oldIndex, newIndex });

    // Obter todos os projetos da coluna filtrados (sem aplicar sort ainda)
    const columnProjects = filteredProjects
      .filter(p => p.status === columnSlug)
      .sort((a, b) => {
        const posA = a.kanban_position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.kanban_position ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });

    // Encontrar o projeto movido
    const movedProject = columnProjects[oldIndex];
    if (!movedProject || movedProject.id !== projectId) {
      devLog.error('[Kanban] Projeto não encontrado na posição esperada', {
        expected: projectId,
        found: movedProject?.id,
        oldIndex,
        columnProjects: columnProjects.map(p => p.id)
      });
      return;
    }

    // Remover da posição antiga e inserir na nova
    const reordered = [...columnProjects];
    reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, movedProject);

    // Atualizar kanban_position para todos os projetos da coluna
    const updates: Array<{ id: string; kanban_position: number }> = [];
    reordered.forEach((proj, index) => {
      // Sempre atualizar para garantir sequência correta
      updates.push({ id: proj.id, kanban_position: index + 1 });
    });

    devLog.log('[Kanban] Projects to update:', updates);

    // Atualizar localmente primeiro (optimistic update)
    setLocalProjects(prev =>
      prev.map(p => {
        const update = updates.find(u => u.id === p.id);
        return update ? { ...p, kanban_position: update.kanban_position } : p;
      })
    );

    // Salvar no backend
    try {
      devLog.log('[Kanban] Enviando request para /api/projects/reorder');
      devLog.log('[Kanban] Payload:', { updates });

      const response = await fetch('/api/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      devLog.log('[Kanban] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        devLog.error('[Kanban] Error response:', errorData);
        throw new Error(errorData.error || 'Erro ao salvar ordenação');
      }

      const result = await response.json();
      devLog.log('[Kanban] Reorder saved successfully:', result);

      toast({
        title: "Ordenação salva",
        description: `${result.updated || updates.length} projeto(s) reordenado(s) com sucesso.`,
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      devLog.error('[Kanban] Error saving reorder:', error);
      console.error('[KANBAN REORDER ERROR]', {
        error,
        message: error.message,
        stack: error.stack
      });

      // Reverter em caso de erro
      setLocalProjects(projects);

      toast({
        title: "Erro ao reordenar",
        description: error.message || "Não foi possível salvar a nova ordenação. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  /**
   * Reordenar as colunas do quadro (arrastar pelo cabeçalho da coluna)
   */
  const handleColumnReorder = async (sourceIndex: number, destinationIndex: number) => {
    const previousColumns = columns;

    const reordered = [...columns];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, moved);

    // Atualização otimista
    setColumns(reordered);

    try {
      await reorderKanbanColumns(reordered.map(c => c.id));
      toast({
        title: "Colunas reordenadas",
        description: "A nova ordem das colunas foi salva.",
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      devLog.error('[Kanban] Erro ao reordenar colunas:', error);
      // Reverter em caso de erro
      setColumns(previousColumns);
      toast({
        title: "Erro ao reordenar colunas",
        description: error.message || "Não foi possível salvar a nova ordem.",
        variant: "destructive"
      });
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination ||
        (destination.droppableId === source.droppableId &&
         destination.index === source.index)) {
      return;
    }

    // 🆕 Arraste de coluna (cabeçalho) — reordena as colunas, não afeta os cards
    if (type === 'COLUMN') {
      handleColumnReorder(source.index, destination.index);
      return;
    }

    const project = filteredProjects.find(p => p.id === draggableId);
    if (!project) return;

    const newStatusSlug = destination.droppableId;
    const oldStatusSlug = project.status;
    const isSameColumn = oldStatusSlug === newStatusSlug;

    devLog.log('[KANBAN DEBUG] Drag details:', {
      draggableId,
      sourceColumn: source.droppableId,
      destinationColumn: destination.droppableId,
      sourceIndex: source.index,
      destinationIndex: destination.index,
      oldStatus: oldStatusSlug,
      newStatus: newStatusSlug,
      isSameColumn,
      sortMode: sortBy
    });

    // ✅ Se for mesma coluna E o modo for ordenação manual, atualizar posições
    if (isSameColumn && sortBy === 'manual') {
      handleManualReorder(draggableId, oldStatusSlug, source.index, destination.index);
      return;
    }

    // Verifica se houve mudança real de status
    if (isSameColumn) return;

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
        <Droppable droppableId="kanban-columns-board" direction="horizontal" type="COLUMN">
          {(providedBoard) => (
            <div
              ref={providedBoard.innerRef}
              {...providedBoard.droppableProps}
              className="inline-flex gap-4 p-1 min-w-full"
            >
              {/* Renderizar colunas dinâmicas do tenant */}
              {columns.map((column, columnIndex) => (
                <Draggable key={column.id} draggableId={`column-${column.id}`} index={columnIndex}>
                  {(providedCol, snapshotCol) => (
            <div
              ref={providedCol.innerRef}
              {...providedCol.draggableProps}
              className={cn(
                "flex-shrink-0 w-[280px] rounded-xl",
                "border border-gray-200 dark:border-gray-700",
                "bg-white dark:bg-gray-800",
                "hover:shadow-md transition-all duration-300",
                "shadow-sm",
                snapshotCol.isDragging && "shadow-xl ring-2 ring-blue-400/40"
              )}
            >
              <div className={cn(
                "px-4 py-3 border-b border-gray-100 dark:border-gray-700 rounded-t-xl",
                "bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750",
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      {...providedCol.dragHandleProps}
                      className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                      title="Arrastar para reordenar coluna"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
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
                  <div className="flex items-center gap-1">
                    <div
                      title={column.isConclusion ? 'Representa conclusão (clique para desmarcar)' : 'Marcar como conclusão de projeto'}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center",
                        "cursor-pointer transition-colors",
                        column.isConclusion
                          ? "bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60"
                          : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 opacity-40 hover:opacity-70"
                      )}
                      onClick={(e) => handleToggleConclusion(column.id, column.isConclusion ?? false, e)}
                    >
                      <CheckCircle2 className={cn("h-4 w-4", column.isConclusion ? "text-green-600 dark:text-green-400" : "text-gray-400")} />
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
              </div>

              <Droppable droppableId={column.slug} type="CARD">
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
                                <div className="flex items-center gap-1.5">
                                  <div className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                                    project.prioridade === 'Alta' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                    project.prioridade === 'Média' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  )}>
                                    {priorityStyles[project.prioridade || 'Média'].icon}
                                    {project.prioridade}
                                  </div>

                                  {/* 🆕 Botão de Ações Rápidas */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md opacity-70 hover:opacity-100 transition-opacity"
                                      >
                                        <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuLabel className="font-semibold">Ações Rápidas</DropdownMenuLabel>
                                      <DropdownMenuSeparator />

                                      {/* Ver Detalhes */}
                                      <DropdownMenuItem onClick={(e) => handleViewProject(project, e)} className="font-medium">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver Detalhes
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      {/* Atribuir Responsável */}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <UserPlus className="mr-2 h-4 w-4" />
                                          Atribuir Responsável
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {teamMembers.length === 0 ? (
                                            <DropdownMenuItem disabled>Nenhum membro disponível</DropdownMenuItem>
                                          ) : (
                                            teamMembers.map((member) => (
                                              <DropdownMenuItem
                                                key={member.id}
                                                onClick={(e) => handleAssignResponsible(project, member.id, e)}
                                              >
                                                <User className="mr-2 h-4 w-4" />
                                                {member.name}
                                              </DropdownMenuItem>
                                            ))
                                          )}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

                                      {/* Alterar Prioridade */}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <Target className="mr-2 h-4 w-4" />
                                          Alterar Prioridade
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={(e) => handleChangePriority(project, 'Urgente', e)}>
                                            <AlertTriangle className="mr-2 h-4 w-4 text-purple-600" />
                                            Urgente
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => handleChangePriority(project, 'Alta', e)}>
                                            <AlertTriangle className="mr-2 h-4 w-4 text-red-600" />
                                            Alta
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => handleChangePriority(project, 'Média', e)}>
                                            <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                                            Média
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => handleChangePriority(project, 'Baixa', e)}>
                                            <AlertTriangle className="mr-2 h-4 w-4 text-green-600" />
                                            Baixa
                                          </DropdownMenuItem>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

                                      {/* Mudar Status */}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                                          Mudar Status
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          {columns.map((col) => (
                                            <DropdownMenuItem
                                              key={col.id}
                                              onClick={(e) => handleChangeStatus(project, col.slug, e)}
                                              disabled={project.status === col.slug}
                                            >
                                              <div
                                                className="mr-2 h-3 w-3 rounded-full"
                                                style={{ backgroundColor: col.color }}
                                              />
                                              {col.title}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>

                                      <DropdownMenuSeparator />

                                      {/* Copiar Link */}
                                      <DropdownMenuItem onClick={(e) => handleCopyLink(project, e)}>
                                        <Link2 className="mr-2 h-4 w-4" />
                                        Copiar Link
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      {/* Arquivar Projeto */}
                                      <DropdownMenuItem
                                        onClick={(e) => handleArchiveProject(project, e)}
                                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                                      >
                                        <Archive className="mr-2 h-4 w-4" />
                                        Arquivar Projeto
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                              {(() => {
                                // ✅ CORREÇÃO: Priorizar user.profile.role sobre user.role
                                const actualRole = user?.profile?.role || user?.role;
                                const isInternalTeam = actualRole === 'admin' || actualRole === 'superadmin' || actualRole === 'colaborador';

                                if (!isInternalTeam) return null;

                                return (
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
                                );
                              })()}

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
                  )}
                </Draggable>
              ))}
              {providedBoard.placeholder}
            </div>
          )}
        </Droppable>

        {/* Diálogo de exclusão de coluna */}
        <DeleteColumnDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            columnId={columnToDelete.id}
            columnTitle={columnToDelete.title}
            isDefaultColumn={columnToDelete.isDefault}
            onDeleted={reloadColumnTitles}
          />

          {/* 🆕 Modal de Arquivar Projeto */}
          <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Arquivar Projeto</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja arquivar o projeto <strong>{projectToArchive?.number}</strong>?
                  <br /><br />
                  O projeto será movido para a área de projetos arquivados e poderá ser restaurado posteriormente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmArchiveProject}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Arquivar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
    </DragDropContext>
  );
});