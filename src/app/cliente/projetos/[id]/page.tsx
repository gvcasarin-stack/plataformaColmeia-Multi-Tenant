"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getProjectAction, updateProjectAction, editProjectAction } from "@/lib/actions/project-actions";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { ExpandedProjectView } from "@/app/components/expanded-project-view";
// ✅ CORREÇÃO: Removido import de getUserDataSupabase - agora usa API segura
import type { Project, UpdatedProject } from "@/types/project";
import { devLog } from "@/lib/utils/productionLogger";
import { subscribeToProject } from "@/lib/services/projectService/supabase";

export default function ClientProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstLoadComplete, setFirstLoadComplete] = useState(false);
  
  // ✅ MELHORIA UX: Estados para controlar visualização expandida automática
  const [shouldAutoExpand, setShouldAutoExpand] = useState(false);
  const [focusSection, setFocusSection] = useState<string>('overview');

  // ✅ MELHORIA UX: Detectar parâmetros para abrir visualização expandida
  useEffect(() => {
    const expand = searchParams.get('expand');
    const focus = searchParams.get('focus');
    
    if (expand === 'true') {
      setShouldAutoExpand(true);
      setFocusSection(focus || 'overview');
      
      devLog.log('[ClientProjectDetail] Auto-expand detectado:', {
        expand,
        focus: focus || 'overview'
      });
      
      // Limpar parâmetros da URL após detectar (opcional)
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // Function to fetch project data
  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    devLog.log('[ClientProjectDetail] fetchProject: Iniciando...');

    if (!user) {
      devLog.error('[ClientProjectDetail] fetchProject: Usuário não encontrado. Abortando.');
      setError('Autenticação necessária.');
      setLoading(false);
      return;
    }

    if (!id) {
      devLog.error('[ClientProjectDetail] fetchProject: ProjectID não encontrado. Abortando.');
      setError('ID do projeto não fornecido.');
      setLoading(false);
      return;
    }

    devLog.log(`[ClientProjectDetail] fetchProject: Preparando para chamar getProjectAction para projectId: ${id}`);
    
    try {
      const result = await getProjectAction(id as string);

      devLog.log('[ClientProjectDetail] fetchProject: getProjectAction retornou:', result);

      if (result.error) {
        devLog.error('[ClientProjectDetail] fetchProject: Erro retornado por getProjectAction:', result.error);
        setError(result.error);
        setProject(null);
      } else if (result.data) {
        // Verificar se projeto pertence ao usuário
        if (result.data.userId !== user.id) {
          devLog.error("[ClientProjectDetail] Project does not belong to current user");
          setError("Você não tem permissão para acessar este projeto.");
          setProject(null);
          return;
        }
        
        devLog.log('[ClientProjectDetail] fetchProject: Projeto carregado com sucesso:', result.data);
        setProject(result.data);
        
        // ✅ CORREÇÃO: Substituir chamada direta ao Supabase por API segura
        if (!userData) {
          try {
            const response = await fetch(`/api/user/profile?userId=${user.id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              throw new Error(`Erro na API: ${response.status}`);
            }

            const userDataResult = await response.json();
            setUserData(userDataResult);
          } catch (error) {
            devLog.error("[ClientProjectDetail] Error fetching user data:", error);
          }
        }
      } else {
        devLog.error('[ClientProjectDetail] fetchProject: Nenhum dado e nenhum erro de getProjectAction.');
        setError('Projeto não encontrado.');
        setProject(null);
      }
      setFirstLoadComplete(true);
    } catch (err: any) {
      devLog.error('[ClientProjectDetail] fetchProject: EXCEÇÃO ao chamar getProjectAction.');
      devLog.error('[ClientProjectDetail] fetchProject: Mensagem da Exceção:', err.message);
      devLog.error('[ClientProjectDetail] fetchProject: Nome da Exceção:', err.name);
      devLog.error('[ClientProjectDetail] fetchProject: Stack da Exceção:', err.stack);
      devLog.error('[ClientProjectDetail] fetchProject: Objeto da Exceção Completo:', err);
      
      setError(err.message || 'Erro crítico ao carregar o projeto.');
      setProject(null);
    } finally {
      devLog.log('[ClientProjectDetail] fetchProject: Bloco finally executado.');
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user, userData]);

  useEffect(() => {
    if (user && id) {
      fetchProject();
    }
  }, [id, user, fetchProject]);

  useEffect(() => {
    if (!id || !user) return;
    devLog.log("[ClientProjectDetail] Setting up real-time listener for project:", id);
    
    const unsubscribe = subscribeToProject(
      id as string,
      user.id,
      (updatedProject) => {
        if (updatedProject) {
          devLog.log("[ClientProjectDetail] Real-time update detected:", updatedProject.id);
          if (firstLoadComplete) {
            setProject(updatedProject);
          }
        } else {
          devLog.log("[ClientProjectDetail] Project was deleted or access denied");
          router.push("/cliente/projetos");
        }
      }
    );
    
    return () => {
      unsubscribe();
      devLog.log("[ClientProjectDetail] Real-time listener removed for project:", id);
    };
  }, [id, user, firstLoadComplete, router]);


  const handleBack = () => {
    router.push("/cliente/projetos");
  };

  const handleUpdate = async (updatedProjectData: UpdatedProject): Promise<void> => {
    try {
      if (!user || !updatedProjectData.id) {
        toast({
          title: "Erro de Atualização",
          description: "Usuário ou ID do projeto inválido para atualização.",
          variant: "destructive",
        });
        throw new Error("Usuário ou ID do projeto inválido");
      }
      
      devLog.log("[ClientProjectDetail] Updating project with data:", updatedProjectData);
      
      const userAuthInfo = {
        uid: user.id,
        email: user.email,
        role: userData?.role || 'cliente',
      };

      // 🚨 CORREÇÃO: Usar nova server action que não valida tenant
      const result = await editProjectAction(updatedProjectData, {
        id: user.id,
        email: user.email,
        role: userData?.role || 'cliente'
      });

      if (result.error || !result.data) {
        devLog.error("[ClientProjectDetail] Error updating project via action:", result.error);
        toast({
          title: "Erro",
          description: result.error || "Erro ao atualizar projeto.",
          variant: "destructive",
        });
        throw new Error(result.error || "Erro ao atualizar projeto via action.");
      }
      
      setProject(result.data);
      toast({
        title: "Sucesso",
        description: "Projeto atualizado com sucesso.",
      });
    } catch (error) {
      devLog.error("[ClientProjectDetail] Error updating project:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar projeto.",
        variant: "destructive",
      });
      throw error;
    }
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
            onClick={handleBack}
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
      onClose={handleBack}
      onUpdate={handleUpdate}
      currentUserEmail={user?.email}
      autoExpand={shouldAutoExpand}
      focusSection={focusSection}
    />
  );
} 