import { useState, useEffect, useCallback } from 'react';
import { Project, UpdatedProject, CreateProjectClientData } from '@/types/project';
import { useAuth } from '@/lib/hooks/useAuth';
import { getProjectsForUserAction, updateProjectAction, createProjectClientAction, deleteProjectAction } from '@/lib/actions/project-actions';
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
      try {
        setLoading(true);
        setError(null);
        logger.debug('Starting to fetch projects for user via action:', user.id);
        
        // ✅ OTIMIZAÇÃO - Timeout de 8 segundos para busca de projetos
        // ✅ SUPABASE - Remover lógica isAdmin, a action verifica o role diretamente
        const fetchPromise = getProjectsForUserAction({ userId: user.id });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Projects fetch timeout')), 8000);
        });

        const result = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (result.error) {
          logger.error('Error fetching projects via action:', result.error);
          setError(result.error);
          setProjects([]);
        } else if (result.projects) {
          logger.debug('Successfully fetched projects via action:', result.projects.length);
          // Ensure dates are consistently formatted if needed, though action should ideally handle this
          const formattedProjects = result.projects.map(p => ({
            ...p,
            createdAt: formatDate(p.createdAt),
            updatedAt: formatDate(p.updatedAt),
          }));
          setProjects(formattedProjects);
          setError(null);

          // Count projects by status
          const statusCounts = formattedProjects.reduce((acc, project) => {
            acc[project.status] = (acc[project.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          logger.debug(`[useProjects] Projects by status:`, statusCounts);

        } else {
          logger.warn('No projects data and no error from getProjectsForUserAction');
          setProjects([]);
          setError(null);
        }

      } catch (finalError: any) {
        if (finalError.message === 'Projects fetch timeout') {
          logger.error('Projects fetch timed out after 8 seconds');
          setError('Timeout ao carregar projetos. Tente novamente.');
        } else {
          logger.error('Failed to fetch projects via action with error:', finalError);
          setError(finalError.message || 'Failed to fetch projects');
        }
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    // ✅ OTIMIZAÇÃO - Debounce para evitar chamadas múltiplas
    const debounceTimeout = setTimeout(() => {
      fetchProjects();
    }, 100);

    return () => clearTimeout(debounceTimeout);
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
        name: user.profile?.full_name || user.email
      };
      const result = await updateProjectAction(processedProjectData, userAuthInfo);

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
        name: user.profile?.full_name || user.email,
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