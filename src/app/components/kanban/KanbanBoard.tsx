'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { KanbanData, KanbanCard, ProjectStatus, Priority } from '@/types/kanban';
import { TimelineEvent } from '@/types/timeline';
import NewCardModal from './NewCardModal';
import KanbanColumn from './KanbanColumn';
import KanbanItem from './KanbanItem';
import { PlusCircle } from 'lucide-react';
import { updateProject } from '@/lib/services/projectService/';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '@/types/project';
import { useProjects } from '@/lib/hooks/useProjects';
import { UpdatedProject } from '@/types/project';
import { devLog } from "@/lib/utils/productionLogger";
import { Timestamp } from 'firebase/firestore';

// ✅ CORREÇÃO REACT #130: Função utilitária para converter timestamps para string ISO
const toDateString = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  
  // Para Timestamps do Firestore
  if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    return new Date((value as Timestamp).seconds * 1000).toISOString();
  }
  
  // Para strings ISO
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  // Para números (timestamp em ms)
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  
  // Fallback para data atual
  return new Date().toISOString();
};

// Map column IDs to status values
const columnToStatus: Record<string, ProjectStatus> = {
  'nao-iniciados': 'Não Iniciado',
  'em-desenvolvimento': 'Em Desenvolvimento',
  'aguardando-assinaturas': 'Aguardando Assinaturas',
  'em-homologacao': 'Em Homologação',
  'projeto-aprovado': 'Projeto Aprovado',
  'aguardando-vistoria': 'Aguardando Solicitar Vistoria',
  'projeto-pausado': 'Projeto Pausado',
  'em-vistoria': 'Em Vistoria',
  'finalizado': 'Finalizado',
  'cancelado': 'Cancelado'
};

const initialColumns: KanbanData = {
  columns: {
    'nao-iniciados': {
      id: 'nao-iniciados',
      title: 'Não Iniciado',
      cards: [],
    },
    'em-desenvolvimento': {
      id: 'em-desenvolvimento',
      title: 'Em Desenvolvimento',
      cards: [],
    },
    'aguardando-assinaturas': {
      id: 'aguardando-assinaturas',
      title: 'Aguardando',
      cards: [],
    },
    'em-homologacao': {
      id: 'em-homologacao',
      title: 'Homologação',
      cards: [],
    },
    'projeto-aprovado': {
      id: 'projeto-aprovado',
      title: 'Projeto Aprovado',
      cards: [],
    },
    'aguardando-vistoria': {
      id: 'aguardando-vistoria',
      title: 'Aguardando Vistoria',
      cards: [],
    },
    'projeto-pausado': {
      id: 'projeto-pausado',
      title: 'Projeto Pausado',
      cards: [],
    },
    'em-vistoria': {
      id: 'em-vistoria',
      title: 'Em Vistoria',
      cards: [],
    },
    'finalizado': {
      id: 'finalizado',
      title: 'Finalizado',
      cards: [],
    },
    'cancelado': {
      id: 'cancelado',
      title: 'Cancelado',
      cards: [],
    },
  },
  columnOrder: [
    'nao-iniciados',
    'em-desenvolvimento',
    'aguardando-assinaturas',
    'em-homologacao',
    'projeto-aprovado',
    'aguardando-vistoria',
    'projeto-pausado',
    'em-vistoria',
    'finalizado',
    'cancelado',
  ],
};

export default function KanbanBoard({ projects = [], searchQuery = "" }: { 
  projects: Project[]; 
  searchQuery?: string;
}) {
  // Debug the incoming projects
  devLog.log('Incoming projects:', projects.map(p => ({
    id: p.id,
    typeofId: typeof p.id,
    number: p.number,
    status: p.status
  })));

  const { updateProject: updateProjectHook } = useProjects();

  const createKanbanCard = (project: Project): KanbanCard & { projectId: string } => {
    // Ensure project ID is a string
    const projectId = String(project.id).trim();
    if (!projectId) {
      devLog.error('Invalid project ID:', project);
      throw new Error('Valid project ID string is required');
    }

    return {
      id: uuidv4(),  // Generate a unique ID for the card
      projectId,     // Store the actual project ID
      title: project.number,
      clientName: project.nomeClienteFinal,
      description: `Projeto ${project.nomeClienteFinal || 'Cliente Final'}`,
      priority: project.prioridade as Priority,
      status: project.status as ProjectStatus,
      dueDate: project.dataEntrega,
      createdAt: toDateString(project.createdAt),
      updatedAt: toDateString(project.updatedAt)
    };
  };

  const [data, setData] = useState<KanbanData>(() => {
    // Initialize columns with projects
    const initialData = { ...initialColumns };
    
    projects.forEach(project => {
      const columnId = Object.entries(columnToStatus).find(([_, status]) => status === project.status)?.[0];
      if (columnId && initialData.columns[columnId]) {
        initialData.columns[columnId].cards.push(createKanbanCard(project));
      }
    });
    
    return initialData;
  });

  // Update data when projects change
  useEffect(() => {
    setData(currentData => {
      const newData = { ...initialColumns };
      
      projects.forEach(project => {
        const columnId = Object.entries(columnToStatus).find(([_, status]) => status === project.status)?.[0];
        if (columnId && newData.columns[columnId]) {
          newData.columns[columnId].cards.push(createKanbanCard(project));
        }
      });
      
      return newData;
    });
  }, [projects]);

  // Filter projects based on search query
  useEffect(() => {
    if (!searchQuery) {
      // Reset to original data
      setData(currentData => {
        const newData = { ...initialColumns };
        projects.forEach(project => {
          const columnId = Object.entries(columnToStatus).find(([_, status]) => status === project.status)?.[0];
          if (columnId && newData.columns[columnId]) {
            newData.columns[columnId].cards.push(createKanbanCard(project));
          }
        });
        return newData;
      });
      return;
    }

    // Filter cards based on search query
    setData(currentData => {
      const newData = { ...initialColumns };
      projects.filter(project => 
        project.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.empresaIntegradora.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.nomeClienteFinal.toLowerCase().includes(searchQuery.toLowerCase())
      ).forEach(project => {
        const columnId = Object.entries(columnToStatus).find(([_, status]) => status === project.status)?.[0];
        if (columnId && newData.columns[columnId]) {
          newData.columns[columnId].cards.push(createKanbanCard(project));
        }
      });
      return newData;
    });
  }, [searchQuery, projects]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { user } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    devLog.log('Drag Start - Active ID:', event.active.id);
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    devLog.log('🔥 [KANBAN] handleDragEnd INICIADO:', { activeId: active.id, overId: over?.id });
    
    if (!over || !user) {
      devLog.log('🔥 [KANBAN] handleDragEnd ABORTADO:', { hasOver: !!over, hasUser: !!user });
      return;
    }

    // Find the card first
    const card = Object.values(data.columns)
      .flatMap(column => column.cards)
      .find(card => card.id === active.id);

    if (!card) {
      devLog.error('🔥 [KANBAN] Card not found:', active.id);
      return;
    }

    // Get the project using the card's stored project ID
    const project = projects.find(p => String(p.id) === String(card.projectId));
    
    if (!project) {
      devLog.error('🔥 [KANBAN] Project not found:', card.projectId);
      return;
    }

    devLog.log('🔥 [KANBAN] Found project:', {
      id: project.id,
      typeofId: typeof project.id,
      projectId: card.projectId,
      typeofProjectId: typeof card.projectId,
      currentStatus: project.status
    });

    const overColumnId = over.id;
    const newStatus = columnToStatus[overColumnId];
    
    devLog.log('🔥 [KANBAN] Status change details:', {
      overColumnId,
      newStatus,
      oldStatus: project.status,
      willChange: project.status !== newStatus
    });
    
    if (project.status === newStatus) {
      devLog.log('🔥 [KANBAN] Status não mudou, abortando');
      return;
    }

    try {
      // ✅ DEBUGGING: Ver estrutura completa do usuário
      devLog.log('🔥 [KANBAN DEBUG] Estrutura completa do usuário:', {
        user: user,
        hasUser: !!user,
        id: user?.id,
        email: user?.email,
        role: user?.role,
        profile: user?.profile,
        profileKeys: user?.profile ? Object.keys(user.profile) : 'no profile',
        fullName: user?.profile?.full_name,
        profileRole: user?.profile?.role,
        allUserData: JSON.stringify(user, null, 2)
      });

      const timelineEvent: TimelineEvent = {
        type: 'status',
        user: user?.profile?.full_name || user?.email || 'Administrador',
        userId: user?.id || `status-change-${uuidv4()}`,
        timestamp: new Date().toISOString(),
        content: `Status alterado de ${project.status} para ${newStatus}`,
        oldStatus: project.status,
        newStatus: newStatus,
        id: uuidv4(),
        fullName: user?.profile?.full_name || user?.email || 'Administrador',
        userType: user?.profile?.role || user?.role || 'admin',
        data: {
          source: 'kanban',
          preserveAdminName: true,
          updatedBy: user?.profile?.full_name || user?.email || 'Administrador',
          oldStatus: project.status,
          newStatus: newStatus
        }
      };

      devLog.log('🔥 [KANBAN] Timeline event CRIADO:', {
        eventId: timelineEvent.id,
        eventUser: timelineEvent.user,
        eventFullName: timelineEvent.fullName,
        eventUserId: timelineEvent.userId,
        eventContent: timelineEvent.content,
        fullEvent: timelineEvent
      });

      // Ensure we have a clean project ID
      const cleanProjectId = String(project.id).trim();
      if (!cleanProjectId) {
        throw new Error('Invalid project ID');
      }

      // Create the update data
      const updatedData = {
        status: newStatus,
        timelineEvents: [...(project.timelineEvents || []), timelineEvent]
      };

      // Update using the project service
      await updateProjectHook({
        id: cleanProjectId,
        ...updatedData
      });

      // Update the UI
      setData(currentData => {
        const newData = { ...currentData };
        
        // Remove card from old column
        Object.keys(newData.columns).forEach(columnId => {
          newData.columns[columnId].cards = newData.columns[columnId].cards.filter(
            card => card.id !== active.id
          );
        });

        // Add card to new column with updated status
        if (newData.columns[overColumnId]) {
          const updatedCard = createKanbanCard({
            ...project,
            status: newStatus
          });
          newData.columns[overColumnId].cards.push(updatedCard);
        }

        return newData;
      });

      toast({
        title: "Status atualizado",
        description: `Status do projeto atualizado para ${newStatus}`,
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      devLog.error('Error updating project status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do projeto",
        variant: "destructive"
      });
    }

    setActiveId(null);
  };

  const addNewCard = (columnId: string, card: KanbanCard) => {
    setData({
      ...data,
      columns: {
        ...data.columns,
        [columnId]: {
          ...data.columns[columnId],
          cards: [...data.columns[columnId].cards, card],
        },
      },
    });
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-6 py-6 border-b border-gray-200 bg-white">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Projetos</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Criar um Projeto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="inline-flex p-6 gap-6">
            {data.columnOrder.map((columnId) => (
              <div key={columnId} className="flex-none">
                <KanbanColumn
                  column={data.columns[columnId]}
                  cards={data.columns[columnId].cards}
                />
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeId && (
              <KanbanItem
                card={Object.values(data.columns)
                  .flatMap(column => column.cards)
                  .find(card => card.id === activeId)!}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <NewCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addNewCard}
        columns={data.columns}
      />
    </div>
  );
} 