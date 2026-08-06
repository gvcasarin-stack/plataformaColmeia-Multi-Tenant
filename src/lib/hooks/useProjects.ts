import { useState, useEffect, useCallback } from 'react';
import { Project, UpdatedProject, CreateProjectClientData } from '@/types/project';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProjectsForUserAction, editProjectAction, deleteProjectAction, createProjectClientAction } from '@/lib/actions/project-actions';
import logger from '@/lib/utils/logger';

// Helper function to ensure consistent date formatting
const formatDate = (date: any): string => {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  if (date instanceof Date) return date.toISOString();
  return new Date().toISOString();
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    logger.debug('useProjects effect - User state:', { 
      id: user?.id,
      email: user?.email,
      isAuthenticated: !!user,
      role: user?.role
    });

    if (!user?.id) {
      logger.debug('No user.id available, skipping fetch');
      setProjects([]);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      logger.debug('Starting to fetch projects for user via action:', user.id);

      let result: any = null;

      // Até 3 tentativas com backoff exponencial (1s, 2s) para lidar com instabilidades de rede
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const fetchPromise = getProjectsForUserAction({ userId: user.id });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Projects fetch timeout')), 20000)
          );
          result = await Promise.race([fetchPromise, timeoutPromise]) as any;
          if (!result?.error) break; // sucesso — sair do loop de retry
        } catch (err: any) {
          result = { error: err.message || 'Erro ao buscar projetos' };
        }

        if (attempt < 3) {
          logger.warn(`[useProjects] Tentativa ${attempt} falhou, aguardando ${attempt}s antes de tentar novamente`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }

      if (result?.projects) {
        logger.debug('Successfully fetched projects via action:', result.projects.length);
        const formattedProjects = result.projects.map((p: any) => ({
          ...p,
          createdAt: formatDate(p.createdAt),
          updatedAt: formatDate(p.updatedAt),
        }));
        setProjects(formattedProjects);
        setError(null);
        const statusCounts = formattedProjects.reduce((acc: Record<string, number>, project: any) => {
          acc[project.status] = (acc[project.status] || 0) + 1;
          return acc;
        }, {});
        logger.debug(`[useProjects] Projects by status:`, statusCounts);
      } else if (result && !result.error && !result.projects) {
        logger.warn('No projects data and no error from getProjectsForUserAction');
        setProjects([]);
        setError(null);
      } else {
        logger.error('[useProjects] Falha ao buscar projetos após 3 tentativas:', result?.error);
        setError(result?.error || 'Falha ao carregar projetos');
        setProjects([]);
      }

      setLoading(false);
    };

    // ✅ CORREÇÃO: Remover debounce que estava causando race condition
    // O debounce atrasava o carregamento inicial e causava badges não aparecerem
    fetchProjects();

    // 🗑️ Listener para remover projeto arquivado da lista
    const handleProjectArchived = (event: CustomEvent) => {
      const { projectId } = event.detail;
      logger.debug('[useProjects] Projeto arquivado, removendo da lista:', projectId);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('project-archived', handleProjectArchived as EventListener);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('project-archived', handleProjectArchived as EventListener);
      }
    };
  }, [user?.id, user?.role]);

  const updateProject = useCallback(async (updatedProjectData: UpdatedProject): Promise<Project | undefined> => {
    try {
      if (!user?.id || !user.email || !user.role) {
        logger.error('[useProjects.updateProject] Cannot update project: User details incomplete', { uid: user?.id, email: user?.email, role: user?.role });
        throw new Error('User not fully authenticated or details missing');
      }

      logger.debug('[useProjects.updateProject] Starting update with project data:', {
        id: updatedProjectData.id,
        status: updatedProjectData.status,
        timelineEventsCount: Array.isArray(updatedProjectData.timelineEvents) ? updatedProjectData.timelineEvents.length : 0,
        updatedProjectKeys: Object.keys(updatedProjectData)
      });
      
      let processedProjectData = { ...updatedProjectData };

      if (processedProjectData.timelineEvents && processedProjectData.timelineEvents.length > 0) {
        processedProjectData.timelineEvents = processedProjectData.timelineEvents.map(event => {
          if (event.data?.preserveAdminName || 
              event.data?.source === 'kanban' || 
              (event.type === 'status' && !event.userType)) {
            return {
              ...event,
              user: 'Administrador',
              data: {
                ...event.data,
                updatedBy: 'Administrador'
              }
            };
          }
          return event;
        });
        logger.debug('[useProjects.updateProject] Timeline events processed for Administrador name preservation');
      }
      
      const userAuthInfo = { 
        uid: user.id, 
        email: user.email, 
        role: user.role,
        name: user.profile?.name || user.email
      };
      // 🚨 CORREÇÃO: Usar nova server action que não valida tenant
      const result = await editProjectAction(processedProjectData, {
        id: user.id,
        email: user.email,
        role: user.role
      });

      if (result.error) {
        logger.error('[useProjects.updateProject] Error from action:', result.error);
        throw new Error(result.error);
      }

      if (!result.data) {
        logger.error('[useProjects.updateProject] Action did not return project data.');
        throw new Error('Update failed to return project data.');
      }
      
      const returnedProject = result.data as Project;
      logger.debug('[useProjects.updateProject] Update result from action:', {
        id: returnedProject.id,
        status: returnedProject.status,
        timelineEventsCount: Array.isArray(returnedProject.timelineEvents) ? returnedProject.timelineEvents.length : 0,
        updatedAt: returnedProject.updatedAt,
        resultKeys: Object.keys(returnedProject)
      });
      
      setProjects(prevProjects => 
        prevProjects.map(p => (p.id === returnedProject.id ? { ...p, ...returnedProject } : p))
      );
      setError(null);
      return returnedProject;

    } catch (err: any) {
      logger.error('[useProjects.updateProject] Error updating project:', err);
      setError(err.message || 'Failed to update project');
      throw err;
    }
  }, [user, setProjects, setError]);

  const addProject = useCallback(async (newProjectData: CreateProjectClientData): Promise<Project | undefined> => {
    try {
      if (!user?.id || !user.email) {
        logger.error('[useProjects.addProject] Cannot add project: User details incomplete', { id: user?.id, email: user?.email });
        throw new Error('User not fully authenticated or details missing');
      }

      logger.debug('[useProjects.addProject] Starting to add project with data:', newProjectData);
      
      const clientUserInfo = {
        id: user.id, // Corrigido: usando 'id' conforme esperado pela action
        name: user.profile?.name || user.email,
        email: user.email
      };

      const result = await createProjectClientAction(newProjectData, clientUserInfo);

      if (result.error) {
        logger.error('[useProjects.addProject] Error from action:', result.error);
        throw new Error(result.error);
      }

      if (!result.data) {
        logger.error('[useProjects.addProject] Action did not return project data.');
        throw new Error('Create project failed to return project data.');
      }
      
      const createdProject = result.data as Project;
      logger.debug('[useProjects.addProject] Project created successfully via action:', createdProject);
      
      const formattedProject = {
        ...createdProject,
        createdAt: formatDate(createdProject.createdAt),
        updatedAt: formatDate(createdProject.updatedAt),
      };
      setProjects(prevProjects => [formattedProject, ...prevProjects]);
      setError(null);
      return formattedProject;

    } catch (err: any) {
      logger.error('[useProjects.addProject] Error adding project:', err);
      setError(err.message || 'Failed to add project');
      throw err;
    }
  }, [user, setProjects, setError]);

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      if (!user?.id) {
        logger.error('[useProjects.deleteProject] Cannot delete project: No user.id available');
        throw new Error('User not authenticated');
      }
      logger.debug('[useProjects.deleteProject] Starting to delete project with ID:', projectId);

      const result = await deleteProjectAction(projectId);

      if (result.error) {
        logger.error('[useProjects.deleteProject] Error from action:', result.error);
        throw new Error(result.error);
      }

      if (result.success) {
        logger.debug('[useProjects.deleteProject] Project deleted successfully via action:', projectId);
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        setError(null);
      } else {
        // Caso a ação não retorne sucesso mas também não dê erro explícito (improvável com a action atual)
        logger.warn('[useProjects.deleteProject] Action did not explicitly succeed or fail.');
        throw new Error(result.message || 'Falha ao excluir o projeto via ação.');
      }

    } catch (err: any) {
      logger.error('[useProjects.deleteProject] Error deleting project:', err);
      setError(err.message || 'Failed to delete project');
      throw err; // Re-throw para que o chamador possa tratar
    }
  }, [user?.id, setProjects, setError]); // Adicionado user.id como dependência

  // Function to manually refresh projects if needed
  const refreshProjects = useCallback(async () => {
    if (!user?.id) {
      logger.debug('No user.id available, skipping refresh');
      return;
    }
    setLoading(true);
    try {
      logger.debug('Refreshing projects for user via action:', user.id);
      const result = await getProjectsForUserAction({ userId: user.id });
      if (result.error) {
        logger.error('Error refreshing projects via action:', result.error);
        setError(result.error);
        setProjects([]);
      } else if (result.projects) {
        logger.debug('Successfully refreshed projects via action:', result.projects.length);
        const formattedProjects = result.projects.map(p => ({
          ...p,
          createdAt: formatDate(p.createdAt),
          updatedAt: formatDate(p.updatedAt),
        }));
        setProjects(formattedProjects);
        setError(null);
      } else {
        logger.warn('No projects data and no error from getProjectsForUserAction during refresh');
        setProjects([]);
      }
    } catch (e: any) {
      logger.error('Failed to refresh projects via action:', e);
      setError(e.message || 'Failed to refresh projects');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, setLoading, setProjects, setError]);


  return { projects, loading, error, updateProject, addProject, deleteProject, refreshProjects, setProjects };
}