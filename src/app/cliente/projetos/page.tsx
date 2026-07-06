"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { LazyClientCreateProjectModal } from "@/lib/utils/lazy-components";
import { useState, useEffect, useRef } from "react";
import { createProjectClientAction } from "@/lib/actions/project-actions";
// ✅ CORREÇÃO: Removido import de getUserDataSupabase - agora usa API segura
import { calculateProjectCost } from "@/lib/utils/projectUtils";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProjects } from "@/lib/hooks/useProjects";
import * as Icons from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { devLog } from "@/lib/utils/productionLogger";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { createTenantHeaders } from "@/lib/utils/tenant-helper";
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Adicionar tipo à interface Window
declare global {
  interface Window {
    _isCreatingProject?: boolean;
  }
}

// ✅ Mapa de slugs para nomes legíveis
const statusSlugToName: Record<string, string> = {
  'nao-iniciado': 'Não Iniciado',
  'em-desenvolvimento': 'Em Desenvolvimento',
  'aguardando-assinaturas': 'Aguardando Assinaturas',
  'em-homologacao': 'Em Homologação',
  'projeto-aprovado': 'Projeto Aprovado',
  'aguardando-solicitar-vistoria': 'Aguardando Solicitar Vistoria',
  'projeto-pausado': 'Projeto Pausado',
  'em-vistoria': 'Em Vistoria',
  'finalizado': 'Finalizado',
  'cancelado': 'Cancelado',
};

// ✅ Função para converter slug em nome legível
const getStatusDisplayName = (slug: string): string => {
  return statusSlugToName[slug] || slug;
};

// Function to get status configuration for styling (agora aceita slugs)
const getStatusConfig = (statusSlug: string) => {
  const displayName = getStatusDisplayName(statusSlug);

  switch (statusSlug) {
    case 'nao-iniciado':
      return { icon: Icons.Clock, color: 'text-gray-500 bg-gray-50 border-gray-200', name: displayName };
    case 'em-desenvolvimento':
      return { icon: Icons.Activity, color: 'text-blue-600 bg-blue-50 border-blue-200', name: displayName };
    case 'aguardando-assinaturas':
      return { icon: Icons.Clock, color: 'text-orange-600 bg-orange-50 border-orange-200', name: displayName };
    case 'em-homologacao':
      return { icon: Icons.AlertTriangle, color: 'text-purple-600 bg-purple-50 border-purple-200', name: displayName };
    case 'projeto-aprovado':
      return { icon: Icons.CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200', name: displayName };
    case 'aguardando-solicitar-vistoria':
      return { icon: Icons.Clock, color: 'text-amber-600 bg-amber-50 border-amber-200', name: displayName };
    case 'projeto-pausado':
      return { icon: Icons.PauseCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', name: displayName };
    case 'em-vistoria':
      return { icon: Icons.Activity, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', name: displayName };
    case 'finalizado':
      return { icon: Icons.CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', name: displayName };
    case 'cancelado':
      return { icon: Icons.XCircle, color: 'text-red-600 bg-red-50 border-red-200', name: displayName };
    default:
      return { icon: Icons.Clock, color: 'text-gray-500 bg-gray-50 border-gray-200', name: displayName };
  }
};

export default function ClientProjects() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table'); // Estado para alternar entre tabela e kanban
  const { user } = useAuth();
  const { projects: allProjects, loading: projectsLoading, addProject } = useProjects();
  const isMobile = useIsMobile();
  
  // Add debugging logs
  useEffect(() => {
    if (user) {
      devLog.log("Current user:", { id: user.id, email: user.email });
    }
    devLog.log("All projects from useProjects:", allProjects);
  }, [user, allProjects]);
  
  // Fetch user data to check approval status
  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          // ✅ CORREÇÃO: Substituir chamada direta ao Supabase por API segura
          const response = await fetch(`/api/user/profile?userId=${user.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const data = await response.json();
          setUserData(data);
          // Add debug logs to check user status
          devLog.log("User data:", {
            id: user.id,
            email: user.email,
            role: data.role,
            pendingApproval: data.pendingApproval,
            isApproved: !data.pendingApproval
          });
        } catch (error) {
          devLog.error("Error fetching user data:", error);
        }
      }
    }

    fetchUserData();
  }, [user]);

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setStatusLoading(true);
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[ClienteProjetos] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[ClienteProjetos] Erro ao carregar status:', error);
        setAvailableStatuses([]);
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatuses();
  }, []);

  // Make sure we have a valid user ID before filtering
  const currentUserId = user?.id;

  // ✅ CORREÇÃO: Backend já filtra por owner_id, não precisa filtrar novamente
  // Server action getProjectsForUserAction já retorna apenas projetos do cliente
  const projects = allProjects;
  
  // Filter projects based on selected status filter and search query
  const filteredProjects = projects.filter(project => {
    // Filtro de status
    const statusMatch = (() => {
      if (filter === "all") return true;
      // Se o filtro for um nome de status, encontrar o slug correspondente
      const statusInfo = availableStatuses.find(s => s.name === filter || s.slug === filter);
      return statusInfo ? project.status === statusInfo.slug : project.status === filter;
    })();

    // Filtro de busca
    const searchMatch = (() => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        project.number?.toLowerCase().includes(query) ||
        project.nomeClienteFinal?.toLowerCase().includes(query) ||
        project.distribuidora?.toLowerCase().includes(query) ||
        project.empresaIntegradora?.toLowerCase().includes(query)
      );
    })();

    return statusMatch && searchMatch;
  });
  
  devLog.log("Filtered projects:", filteredProjects);
  
  const isPendingApproval = user?.profile?.status === 'pending' || userData?.status === 'pending';
  
  // Adicionando um ref para controlar duplicação de submissão
  const isSubmitting = useRef(false);
  
  const handleCreateProject = async (data: any) => {
    const submitId = data._submitId || `page-${Date.now()}-${Math.random()}`;
    devLog.log(`[${submitId}] handleCreateProject chamado na página de projetos`, {
      cliente: data.nomeClienteFinal,
      distribuidora: data.distribuidora,
      potencia: data.power,
      numero: data.projectNumber
    });

    // Verificação via localStorage para prevenir duplicação
    if (typeof window !== 'undefined' && data.projectNumber) {
      const storageKey = `project_creation_${data.projectNumber}`;
      const lastCreation = localStorage.getItem(storageKey);
      
      if (lastCreation) {
        const lastTime = parseInt(lastCreation, 10);
        const now = Date.now();
        const timeDiff = now - lastTime;
        
        // Se o projeto foi criado nos últimos 60 segundos, bloquear duplicação
        if (timeDiff < 60000) {
          devLog.error(`[${submitId}] Bloqueando duplicação via localStorage - projeto ${data.projectNumber} foi criado há ${timeDiff/1000} segundos`);

          toast({
            title: "Ação bloqueada",
            description: `Este projeto já foi criado recentemente. Por favor, aguarde um momento.`,
            variant: "destructive",
          });

          return;
        }
      }

      // Registrar a criação no localStorage
      localStorage.setItem(storageKey, Date.now().toString());

      // Definir expiração após 60 segundos
      setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 60000);
    }
    
    // CRÍTICO: Verificar se a submissão já foi processada anteriormente
    // Usar sessionStorage para armazenar IDs de submissão já processados
    const processedSubmissions = sessionStorage.getItem('processedSubmissions') || '[]';
    const processedIds = JSON.parse(processedSubmissions) as string[];
    
    if (processedIds.includes(submitId)) {
      devLog.log(`[${submitId}] Esta submissão já foi processada anteriormente, ignorando duplicação`);
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um projeto.",
        variant: "destructive",
      });
      return;
    }

    // Evitar dupla submissão
    if (isSubmitting.current) {
      devLog.log(`[${submitId}] Submissão em andamento, evitando duplicação`);
      return;
    }
    
    // ✅ PROTEÇÃO ADICIONAL: Verificar se usuário criou projeto recentemente
    if (user?.id) {
      const recentProjectKey = `recent_project_${user.id}`;
      const lastProjectTime = sessionStorage.getItem(recentProjectKey);
      
      if (lastProjectTime) {
        const timeDiff = Date.now() - parseInt(lastProjectTime);
        if (timeDiff < 10000) { // 10 segundos
          devLog.log(`[${submitId}] Usuário criou projeto recentemente, bloqueando duplicação`);

          toast({
            title: "Ação bloqueada",
            description: "Você criou um projeto recentemente. Aguarde alguns segundos.",
            variant: "destructive",
          });

          return;
        }
      }

      // Registrar tentativa atual
      sessionStorage.setItem(recentProjectKey, Date.now().toString());
    }

    try {
      // Marcar início da submissão
      isSubmitting.current = true;
      setLoading(true);

      // Registrar este ID como já processado para evitar duplicação
      processedIds.push(submitId);
      sessionStorage.setItem('processedSubmissions', JSON.stringify(processedIds));

      // Get current date in ISO format
      const currentDate = new Date().toISOString();
      
      // ✅ CORREÇÃO MULTI-TENANT: Calcular valor via API que consulta configurações do tenant
      let valorCalculado = 0;
      let calculationSource = 'unknown';
      
      devLog.log(`🚀 [${submitId}] INICIANDO CÁLCULO DE VALOR:`, {
        potencia: data.power,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Obter headers com tenant_id
        const headers = await createTenantHeaders(user.id);
        
        devLog.log(`📋 [${submitId}] HEADERS PREPARADOS:`, { 
          headers, 
          userId: user.id,
          potencia: data.power 
        });
        
        const calcResponse = await fetch('/api/projects/calculate-cost', {
          method: 'POST',
          headers,
          body: JSON.stringify({ potencia: data.power })
        });
        
        devLog.log(`📡 [${submitId}] RESPOSTA DA API:`, {
          ok: calcResponse.ok,
          status: calcResponse.status,
          statusText: calcResponse.statusText
        });
        
        if (calcResponse.ok) {
          const calcResult = await calcResponse.json();
          valorCalculado = calcResult.valorCalculado || 0;
          calculationSource = calcResult.source || 'api_success';
          
          devLog.log(`✅ [${submitId}] SUCESSO - VALOR DA API:`, { 
            potencia: data.power, 
            valorCalculado, 
            source: calcResult.source,
            faixasUsadas: calcResult.faixasUsadas,
            tenantId: calcResult.tenantId,
            apiResponse: calcResult
          });
        } else {
          const responseText = await calcResponse.text();
          devLog.error(`❌ [${submitId}] ERRO NA API:`, {
            status: calcResponse.status,
            statusText: calcResponse.statusText,
            responseText: responseText
          });
          
          // Fallback para valor padrão se a API falhar
          valorCalculado = calculateProjectCost(data.power);
          calculationSource = 'fallback_api_error';
          
          devLog.log(`🔄 [${submitId}] USANDO FALLBACK LOCAL:`, {
            potencia: data.power,
            valorCalculadoFallback: valorCalculado,
            source: calculationSource
          });
        }
      } catch (calcError) {
        devLog.error(`💥 [${submitId}] EXCEÇÃO NO CÁLCULO:`, calcError);
        
        // Fallback para valor padrão se houver exceção
        valorCalculado = calculateProjectCost(data.power);
        calculationSource = 'fallback_exception';
        
        devLog.log(`🔄 [${submitId}] FALLBACK APÓS EXCEÇÃO:`, {
          potencia: data.power,
          valorCalculado,
          source: calculationSource,
          error: calcError
        });
      }
      
      devLog.log(`🎯 [${submitId}] VALOR FINAL DEFINIDO:`, {
        valorCalculado,
        calculationSource,
        potencia: data.power
      });
      
      // Preparar dados para a action
      const projectDataForAction = {
        nome_cliente_final: data.nomeClienteFinal,
        number: data.projectNumber, // Será gerado pela action/service se undefined
        empresaIntegradora: data.empresaIntegradora || userData?.companyName || userData?.name || "Cliente Individual",
        nomeClienteFinal: data.nomeClienteFinal,
        cpf_cnpj_cliente_final: data.cpf_cnpj_cliente_final, // ✅ NOVO CAMPO
        endereco_local: data.endereco_local, // ✅ NOVO CAMPO
        havera_beneficiarias: data.havera_beneficiarias, // ✅ NOVO CAMPO: Compensação de créditos
        distribuidora: data.distribuidora,
        potencia: data.power, // 'power' é o campo do formulário
        listaMateriais: data.listaMateriais, // ADICIONADO: Lista de materiais
        disjuntorPadraoEntrada: data.disjuntorPadraoEntrada, // ADICIONADO: Disjuntor do padrão de entrada
        valorProjeto: valorCalculado, // ✅ ADICIONADO: Valor calculado automaticamente
        dataEntrega: currentDate,
        // status e prioridade serão definidos pela action
        // userId será pego do clientUser na action
      };

      const clientUserInfo = {
        id: user.id,
        name: userData?.name || user.displayName || user.email,
        companyName: userData?.companyName,
        email: user.email,
      };

      devLog.log(`[${submitId}] Chamando createProjectClientAction com:`, { projectDataForAction, clientUserInfo });

      const result = await createProjectClientAction(projectDataForAction, clientUserInfo);
      devLog.log(`[${submitId}] Resultado da Server Action:`, result);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        devLog.log(`[${submitId}] Projeto criado via action: `, result.data);

        // ✅ PROTEÇÃO: Limpar flags de criação apenas APÓS sucesso
        if (typeof window !== 'undefined') {
          window._isCreatingProject = false;
        }
        
        addProject(result.data); // Atualizar a lista de projetos localmente via useProjects hook
        toast({ title: "Sucesso", description: "Projeto criado com sucesso!", variant: "default", });
        // router.push(`/cliente/projetos/${result.data.id}`); // Redirecionar para a página do projeto
         window.location.href = `/cliente/projetos/${result.data.id}`; // Usar window.location.href para full reload
      } else {
        throw new Error("A action de criação de projeto não retornou dados do projeto.");
      }

    } catch (error: any) {
      devLog.error(`[${submitId}] Erro ao criar projeto via action: `, error);

      toast({ title: "Erro na criação", description: `Erro: ${error.message || 'Falha ao criar o projeto'}`, variant: "destructive", });

      // Remover este ID dos processados em caso de erro para permitir nova tentativa
      const errorIndex = processedIds.indexOf(submitId);
      if (errorIndex !== -1) {
        processedIds.splice(errorIndex, 1);
        sessionStorage.setItem('processedSubmissions', JSON.stringify(processedIds));
      }
    } finally {
      setLoading(false);
      setIsCreateModalOpen(false);
      isSubmitting.current = false;
    }
  };
  
  // Function to navigate to project details
  const handleViewProject = (projectId: string) => {
    router.push(`/cliente/projetos/${projectId}`);
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header with Gradient - Reduzido */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">Meus Projetos</h1>
          <p className="text-blue-100 text-sm">
            Acompanhe o status e progresso dos seus projetos
          </p>
        </div>
        
        {/* Decorative elements simplificados */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
      </div>

      {/* Status Alerts */}
      {isPendingApproval && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 shadow-sm transition-all hover:shadow-md">
          <div className="flex">
            <Icons.AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 mr-4" />
            <div>
              <h5 className="text-amber-800 dark:text-amber-300 font-medium text-lg mb-2">Conta aguardando aprovação</h5>
              <div className="text-amber-700 dark:text-amber-400">
                Sua conta foi criada com sucesso, mas você precisa da aprovação de um administrador para poder abrir projetos. 
                Você receberá uma notificação quando sua conta for aprovada.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Ações: Busca, Filtros e Botões */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
        {/* Linha 1: Busca */}
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por número, cliente, distribuidora ou empresa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10"
          />
        </div>
        
        {/* Linha 2: Filtro de Status e Ações */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            <div className="flex items-center text-gray-700 dark:text-gray-300 font-medium min-w-fit">
              <Icons.Filter className="h-4 w-4 mr-2" />
              <span className="text-sm">Status:</span>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statusLoading ? (
                  <SelectItem value="loading" disabled>Carregando...</SelectItem>
                ) : (
                  availableStatuses
                    .sort((a, b) => a.order - b.order)
                    .map((status) => (
                      <SelectItem key={status.id} value={status.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Toggle de Visualização e Botão Novo Projeto */}
          <div className="flex items-center gap-2">
            {/* Toggle de Visualização */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-8 px-3 ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                title="Visualização em Tabela"
              >
                <Icons.Table className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`h-8 px-3 ${viewMode === 'kanban' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'}`}
                title="Visualização em Kanban"
              >
                <Icons.LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Botão Novo Projeto */}
            {!isPendingApproval && (
              <Button 
                className="bg-blue-600 text-white hover:bg-blue-700 shadow-md font-medium transition-all h-8"
                onClick={() => {
                  devLog.log('Projects header button clicked');
                  setIsCreateModalOpen(true);
                }}
              >
                <Icons.PlusCircle className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Projects Table ou Kanban */}
      {projectsLoading ? (
        <div className="flex justify-center items-center py-16">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-white dark:bg-gray-800 rounded-full"></div>
            </div>
          </div>
        </div>
      ) : filteredProjects.length > 0 ? (
        viewMode === 'kanban' ? (
          // Visualização Kanban (somente visual, sem drag and drop)
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {availableStatuses
                .sort((a, b) => a.order - b.order)
                .map((status) => {
                  const statusProjects = filteredProjects.filter(p => p.status === status.slug);
                  
                  return (
                    <div 
                      key={status.id} 
                      className="flex-shrink-0 w-80 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                    >
                      {/* Header da coluna */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {status.name}
                          </h3>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {statusProjects.length}
                        </span>
                      </div>
                      
                      {/* Cards dos projetos */}
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {statusProjects.length === 0 ? (
                          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
                            Nenhum projeto
                          </p>
                        ) : (
                          statusProjects.map((project, index) => {
                            const statusConfig = getStatusConfig(project.status);
                            const StatusIcon = statusConfig.icon;
                            
                            return (
                              <Card 
                                key={`${project.id}-${index}`}
                                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => handleViewProject(project.id)}
                              >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    {/* Número do projeto */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center">
                                          <Icons.Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                                        </div>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                          {project.number}
                                        </span>
                                      </div>
                                      <StatusIcon className="w-4 h-4" style={{ color: status.color }} />
                                    </div>
                                    
                                    {/* Informações do projeto */}
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-start gap-2">
                                        <Icons.User className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                          {project.nomeClienteFinal || 'N/A'}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <Icons.Zap className="h-4 w-4 text-amber-500" />
                                        <span className="text-gray-700 dark:text-gray-300">
                                          {project.potencia || 0} kWp
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-start gap-2">
                                        <Icons.Building2 className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-600 dark:text-gray-400 text-xs line-clamp-1">
                                          {project.distribuidora || 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Botão de ação */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewProject(project.id);
                                      }}
                                    >
                                      <Icons.Eye className="h-3 w-3 mr-1" />
                                      Ver Detalhes
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
        // Layout responsivo: Cards em mobile, tabela em desktop
        isMobile ? (
          // Layout de cards para mobile
          <div className="space-y-4">
            {filteredProjects.map((project, index) => {
              // Buscar o status real do tenant ao invés de usar o mapa estático
              const projectStatus = availableStatuses.find(s => s.slug === project.status);
              const statusName = projectStatus?.name || getStatusDisplayName(project.status);
              const statusColor = projectStatus?.color || '#6b7280';

              const statusConfig = getStatusConfig(project.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={`${project.id}-${index}`} className="border border-gray-200/60 dark:border-gray-700/60 shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Header do card */}
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.number}</h3>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${statusConfig.color} dark:bg-opacity-20 shadow-sm`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="text-xs font-medium">{statusName}</span>
                        </div>
                      </div>

                      {/* Informações principais */}
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        {/* Empresa Integradora */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.Building2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Empresa Integradora</p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{project.empresaIntegradora || userData?.companyName || userData?.name || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {/* Cliente Final */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.User className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Cliente Final</p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{project.nomeClienteFinal || 'N/A'}</p>
                          </div>
                        </div>
                        
                        {/* Distribuidora - SEM ícone como na tabela */}
                        <div className="flex flex-col">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Distribuidora</p>
                          <p className="text-gray-700 dark:text-gray-300 font-medium truncate">{project.distribuidora || 'N/A'}</p>
                        </div>
                        
                        {/* Potência */}
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Potência</p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">{project.potencia || 0} kWp</p>
                          </div>
                        </div>
                      </div>

                      {/* Botão de ação */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-9 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 shadow-sm transition-all"
                        onClick={() => handleViewProject(project.id)}
                      >
                        <Icons.Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Layout de tabela para desktop
          <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-md overflow-hidden bg-white dark:bg-gray-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-700/50 dark:hover:bg-gray-700/50">
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Número</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Empresa Integradora</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Cliente Final</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Distribuidora</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Potência</TableHead>
                  <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Status</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300 pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project, index) => {
                  // Buscar o status real do tenant ao invés de usar o mapa estático
                  const projectStatus = availableStatuses.find(s => s.slug === project.status);
                  const statusName = projectStatus?.name || getStatusDisplayName(project.status);
                  const statusColor = projectStatus?.color || '#6b7280';

                  const statusConfig = getStatusConfig(project.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow
                      key={`${project.id}-${index}`}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 cursor-pointer group border-b border-gray-100 dark:border-gray-700/50"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {project.number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.Building2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.empresaIntegradora || userData?.companyName || userData?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.User className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.nomeClienteFinal || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{project.distribuidora || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Icons.Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.potencia || 0} kWp</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${statusConfig.color} dark:bg-opacity-20 shadow-sm`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="text-sm font-medium">{statusName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-4 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 shadow-sm transition-all"
                          onClick={() => handleViewProject(project.id)}
                        >
                          <Icons.Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      )) : (
        <div className="col-span-full">
          <Card className="border border-gray-200/60 dark:border-gray-700/60 shadow-lg bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 overflow-hidden">
            <CardContent className="p-16 text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-6 border border-gray-200 dark:border-gray-600 shadow-inner">
                <Icons.PlusCircle className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">
                Nenhum projeto encontrado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {isPendingApproval 
                  ? "Você poderá criar projetos após a aprovação da sua conta."
                  : "Você ainda não possui projetos. Crie um novo projeto para começar."}
              </p>
              {!isPendingApproval && (
                <Button onClick={() => {
                  devLog.log('Empty state button clicked');
                  setIsCreateModalOpen(true);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all hover:shadow-lg"
                >
                  <Icons.PlusCircle className="h-4 w-4 mr-2" />
                  Criar Novo Projeto
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Creation Modal */}
      <LazyClientCreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  );
} 