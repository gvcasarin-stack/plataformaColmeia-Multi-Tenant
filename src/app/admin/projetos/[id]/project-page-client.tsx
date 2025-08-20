'use client'

// Force cache bust: 2024-07-30 10:00 AM
import { ExpandedProjectView } from "@/app/components/expanded-project-view";
import { Project, UpdatedProject } from "@/types/project";
import { useRouter } from "next/navigation";
import { updateProjectAction, getProjectAction } from "@/lib/actions/project-actions";
import { useCallback, useTransition, useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from "@/lib/hooks/useAuth";
// ✅ SUPABASE - REMOVIDO: Firebase imports que causavam erros de API
// import { db } from "@/lib/firebase";
// import { doc, onSnapshot } from "firebase/firestore";

interface ProjectPageClientProps {
  projectId: string;
}

export function ProjectPageClient({ projectId }: ProjectPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstLoadComplete, setFirstLoadComplete] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('refresh') || 
          url.searchParams.has('t') || 
          url.searchParams.has('timestamp')) {
        devLog.log('[AdminProjectPage] Removendo parâmetros de refresh da URL');
        url.searchParams.delete('refresh');
        url.searchParams.delete('t');
        url.searchParams.delete('timestamp');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, []);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    devLog.log('[AdminProjectPage] fetchProject: Iniciando...');

    if (!user) {
      devLog.error('[AdminProjectPage] fetchProject: Usuário não encontrado. Abortando.');
      setError('Autenticação necessária.');
      setLoading(false);
      return;
    }

    if (!projectId) {
      devLog.error('[AdminProjectPage] fetchProject: ProjectID não encontrado. Abortando.');
      setError('ID do projeto não fornecido.');
      setLoading(false);
      return;
    }

    devLog.log(`[AdminProjectPage] fetchProject: Preparando para chamar getProjectAction para projectId: ${projectId}`);

    try {
      const result = await getProjectAction(projectId);
      
      devLog.log('[AdminProjectPage] fetchProject: getProjectAction retornou:', result);

      if (result.error) {
        devLog.error('[AdminProjectPage] fetchProject: Erro retornado por getProjectAction:', result.error);
        setError(result.error);
        setProject(null);
      } else if (result.data) {
        devLog.log('[AdminProjectPage] fetchProject: Projeto carregado com sucesso:', result.data);
        setProject(result.data);
      } else {
        devLog.error('[AdminProjectPage] fetchProject: Nenhum dado e nenhum erro de getProjectAction.');
        setError('Projeto não encontrado.');
        setProject(null);
      }
      setFirstLoadComplete(true);
    } catch (err: any) {
      devLog.error('[AdminProjectPage] fetchProject: EXCEÇÃO ao chamar getProjectAction.');
      devLog.error('[AdminProjectPage] fetchProject: Mensagem da Exceção:', err.message);
      devLog.error('[AdminProjectPage] fetchProject: Nome da Exceção:', err.name);
      devLog.error('[AdminProjectPage] fetchProject: Stack da Exceção:', err.stack);
      devLog.error('[AdminProjectPage] fetchProject: Objeto da Exceção Completo:', err);
      
      setError(err.message || 'Erro crítico ao carregar o projeto.');
      setProject(null);
    } finally {
      devLog.log('[AdminProjectPage] fetchProject: Bloco finally executado.');
      setLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    if (user && projectId) {
      fetchProject();
    }
  }, [projectId, user, fetchProject]);

  useEffect(() => {
    if (!projectId || !user) return;
    devLog.log("[Admin] Setting up real-time listener for project:", projectId);
    // const projectRef = doc(db, "projects", projectId);
    // const unsubscribe = onSnapshot(
    //   projectRef,
    //   (docSnapshot) => {
    //     if (docSnapshot.exists()) {
    //       const updatedProject = {
    //         id: docSnapshot.id,
    //         ...docSnapshot.data()
    //       } as Project;
    //       devLog.log("[Admin] Real-time update detected:", updatedProject.id);
    //       if (firstLoadComplete) {
    //         setProject(updatedProject);
    //       }
    //     }
    //   },
    //   (err) => {
    //     devLog.error("[Admin] Error in real-time listener:", err);
    //   }
    // );
    // return () => {
    //   unsubscribe();
    //   devLog.log("[Admin] Real-time listener removed for project:", projectId);
    // };
  }, [projectId, user, firstLoadComplete]);

  useEffect(() => {
    const preventReload = (event: BeforeUnloadEvent) => {
      const url = new URL(window.location.href);
      if (url.searchParams.has('refresh') || url.searchParams.has('t')) {
        devLog.log('[AdminProjectPage] Prevenindo reload automático');
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', preventReload);
    return () => {
      window.removeEventListener('beforeunload', preventReload);
    };
  }, []);

  const handleClose = () => {
    router.push('/admin/projetos');
  };

  const handleUpdate = async (updatedProjectData: UpdatedProject): Promise<void> => {
    if (!project || !user) {
      toast({
        title: "Erro de Atualização",
        description: "Projeto ou usuário inválido.",
        variant: "destructive",
      });
      throw new Error('Projeto ou usuário inválido para atualização.');
    }

    devLog.log('[AdminProjectPage] Attempting to call updateProjectAction with data:', updatedProjectData);
    
    startTransition(async () => {
      try {
        devLog.log(`[AdminProjectPage] updateProjectAction will be called by user: { uid: ${user.id}, email: ${user.email}, role: ${user.role} }`);

        const result = await updateProjectAction(
          updatedProjectData,
          {
            uid: user.id,
            email: user.email || '',
            role: user.role || 'admin'
          }
        );

        devLog.log('[AdminProjectPage] Result from updateProjectAction:', result);

        if (result.error) {
          devLog.error('[AdminProjectPage] Error from updateProjectAction:', result.error);
          toast({
            title: 'Erro na Ação',
            description: result.error,
            variant: 'destructive',
          });
          throw new Error(result.error);
        } else {
          toast({
            title: 'Sucesso',
            description: result.message || 'Projeto atualizado com sucesso',
          });
        }
      } catch (actionError) {
        devLog.error('[AdminProjectPage] Error during updateProjectAction call:', actionError);
        toast({
          title: 'Erro na Transição',
          description: actionError instanceof Error ? actionError.message : 'Falha ao atualizar o projeto durante a transição',
          variant: 'destructive',
        });
        throw actionError;
      }
    });
  };

  if (loading && !firstLoadComplete) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Carregando Projeto...</h2>
          <p className="text-gray-600">Aguarde enquanto carregamos os dados.</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Erro ao Carregar Projeto</h2>
          <p className="text-gray-600">{error || 'Não foi possível carregar os dados do projeto. Verifique o ID ou tente novamente.'}</p>
          <button 
            onClick={() => router.push('/admin/projetos')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            Voltar para Projetos
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Autenticação Necessária</h2>
          <p className="text-gray-600">Por favor, faça login para ver os detalhes do projeto.</p>
        </div>
      </div>
    );
  }

  return (
    <ExpandedProjectView
      project={project}
      onClose={handleClose}
      onUpdate={handleUpdate}
      currentUserEmail={user?.email}
    />
  );
} 