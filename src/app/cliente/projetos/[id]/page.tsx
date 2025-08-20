"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProjectAction, updateProjectAction } from "@/lib/actions/project-actions";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { ExpandedProjectView } from "@/app/components/expanded-project-view";
import { getUserDataSupabase } from "@/lib/services/authService.supabase";
import type { Project, UpdatedProject } from "@/types/project";
import { devLog } from "@/lib/utils/productionLogger";
import { subscribeToProject } from "@/lib/services/projectService/supabase";

export default function ClientProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch project data
  const fetchProject = async () => {
    if (!id || !user) return;
    
    try {
      setRefreshing(true);
      setLoading(true);
      
      const timestamp = Date.now();
      devLog.log(`[ClientProjectDetail] Fetching project with cache-busting timestamp: ${timestamp}`);
      
      const result = await getProjectAction(id as string);

      if (result.error || !result.data) {
        devLog.error("[ClientProjectDetail] Project not found or error fetching:", result.error);
        toast({
          title: "Erro",
          description: result.error || "Projeto não encontrado.",
          variant: "destructive",
        });
        router.push("/cliente/projetos");
        return;
      }
      const projectData = result.data;
      
      devLog.log("[ClientProjectDetail] Fetched project data:", {
        id: projectData.id,
        commentsCount: projectData.comments?.length || 0,
        timelineEventsCount: projectData.timelineEvents?.length || 0
      });
      
      if (projectData.userId !== user.id) {
        devLog.error("[ClientProjectDetail] Project does not belong to current user");
        toast({
          title: "Erro",
          description: "Você não tem permissão para acessar este projeto.",
          variant: "destructive",
        });
        router.push("/cliente/projetos");
        return;
      }
      
      try {
        const userDataResult = await getUserDataSupabase(user.id);
        setUserData(userDataResult);
      } catch (error) {
        devLog.error("[ClientProjectDetail] Error fetching user data:", error);
      }
      
      setProject(projectData);
    } catch (error) {
      devLog.error("[ClientProjectDetail] Error fetching project:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do projeto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProject();
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, user]);

  useEffect(() => {
    if (!id || !user?.id) return;
    
    devLog.log("[ClientProjectDetail] Setting up Supabase real-time listener for project:", id);
    
    const unsubscribe = subscribeToProject(
      id as string,
      user.id,
      (updatedProject) => {
        if (updatedProject) {
          devLog.log("[ClientProjectDetail] Supabase real-time update detected:", {
            id: updatedProject.id,
            commentsCount: updatedProject.comments?.length || 0,
            timelineEventsCount: updatedProject.timelineEvents?.length || 0
          });
          
          setProject(updatedProject);
        } else {
          devLog.log("[ClientProjectDetail] Project was deleted or access denied");
          router.push("/cliente/projetos");
        }
      }
    );
    
    return () => {
      unsubscribe();
      devLog.log("[ClientProjectDetail] Supabase real-time listener removed for project:", id);
    };
  }, [id, user?.id, router]);

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && !refreshing) {
      fetchProject();
    }
  };

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

      const result = await updateProjectAction(updatedProjectData, userAuthInfo);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Carregando...</h2>
          <p className="text-gray-600">Aguarde enquanto carregamos os dados do projeto.</p>
        </div>
      </div>
    );
  }

  if (!project || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Erro</h2>
          <p className="text-gray-600">Não foi possível carregar os dados do projeto.</p>
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

  return (
    <ExpandedProjectView
      project={project}
      onClose={handleBack}
      onUpdate={handleUpdate}
      currentUserEmail={user?.email}
    />
  );
} 