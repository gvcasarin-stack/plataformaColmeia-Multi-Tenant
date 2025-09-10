"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { LazyClientCreateProjectModal } from "@/lib/utils/lazy-components";
import { useState, useEffect, useRef } from "react";
import { createProjectClientAction } from "@/lib/actions/project-actions";
import { getUserDataSupabase } from "@/lib/services/authService.supabase";
import { calculateProjectCost } from "@/lib/utils/projectUtils";
import { useAuth } from "@/lib/hooks/useAuth";
import { useProjects } from "@/lib/hooks/useProjects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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

// Adicionar tipo à interface Window
declare global {
  interface Window {
    _isCreatingProject?: boolean;
  }
}

// Function to get status configuration for styling
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'Não Iniciado':
      return { icon: Icons.Clock, color: 'text-gray-500 bg-gray-50 border-gray-200' };
    case 'Em Desenvolvimento':
      return { icon: Icons.Activity, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 'Aguardando':
      return { icon: Icons.Clock, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    case 'Homologação':
      return { icon: Icons.AlertTriangle, color: 'text-purple-600 bg-purple-50 border-purple-200' };
    case 'Projeto Aprovado':
      return { icon: Icons.CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' };
    case 'Aguardando Vistoria':
      return { icon: Icons.Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'Projeto Pausado':
      return { icon: Icons.PauseCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    case 'Em Vistoria':
      return { icon: Icons.Activity, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
    case 'Finalizado':
      return { icon: Icons.CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'Cancelado':
      return { icon: Icons.XCircle, color: 'text-red-600 bg-red-50 border-red-200' };
    default:
      return { icon: Icons.Clock, color: 'text-gray-500 bg-gray-50 border-gray-200' };
  }
};

export default function ClientProjects() {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const { user } = useAuth();
  const { projects: allProjects, loading: projectsLoading } = useProjects();
  const isMobile = useIsMobile();
  
  // Adicionar estado para o modal de diagnóstico
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>("");
  
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
          const data = await getUserDataSupabase(user.id);
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
  
  // Make sure we have a valid user ID before filtering
  const currentUserId = user?.id;
  
  // CRITICAL SECURITY CHECK: Ensure we only show projects belonging to the current user
  // This is a double-safety measure in case the backend filtering fails
  const projects = allProjects.filter(project => project.userId === currentUserId);
  
  // Filter projects based on selected status filter
  const filteredProjects = projects.filter(project => {
    if (filter === "all") return true;
    return project.status === filter;
  });
  
  devLog.log("Filtered projects:", filteredProjects);
  
  const isPendingApproval = user?.pendingApproval || userData?.pendingApproval;
  
  // Adicionando um ref para controlar duplicação de submissão
  const isSubmitting = useRef(false);
  
  const handleCreateProject = async (data: any) => {
    const submitId = data._submitId || `page-${Date.now()}-${Math.random()}`;
    devLog.log(`[${submitId}] handleCreateProject chamado na página de projetos`);
    
    let diagnosticLog = `[DIAGNÓSTICO] Início da criação do projeto\n`;
    diagnosticLog += `- ID da submissão: ${submitId}\n`;
    diagnosticLog += `- Dados: ${JSON.stringify({
      cliente: data.nomeClienteFinal,
      distribuidora: data.distribuidora,
      potencia: data.power, // 'power' vem do formulário do modal
      numero: data.projectNumber 
    })}\n\n`;
    
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
          
          diagnosticLog += `[DIAGNÓSTICO] Bloqueio de duplicação via localStorage\n`;
          diagnosticLog += `- Projeto ${data.projectNumber} foi criado há ${timeDiff/1000} segundos\n\n`;
          
          toast({
            title: "Ação bloqueada",
            description: `Este projeto já foi criado recentemente. Por favor, aguarde um momento.`,
            variant: "destructive",
          });
          
          setDiagnosticInfo(diagnosticLog);
          setIsDiagnosticModalOpen(true);
          return;
        }
      }
      
      // Registrar a criação no localStorage
      localStorage.setItem(storageKey, Date.now().toString());
      
      // Definir expiração após 60 segundos
      setTimeout(() => {
        localStorage.removeItem(storageKey);
      }, 60000);
      
      diagnosticLog += `[DIAGNÓSTICO] Registro temporário criado no localStorage\n`;
    }
    
    // CRÍTICO: Verificar se a submissão já foi processada anteriormente
    // Usar sessionStorage para armazenar IDs de submissão já processados
    const processedSubmissions = sessionStorage.getItem('processedSubmissions') || '[]';
    const processedIds = JSON.parse(processedSubmissions) as string[];
    
    if (processedIds.includes(submitId)) {
      devLog.log(`[${submitId}] Esta submissão já foi processada anteriormente, ignorando duplicação`);
      
      diagnosticLog += `[DIAGNÓSTICO] Submissão já processada anteriormente\n`;
      diagnosticLog += `- ID de submissão ${submitId} encontrado no histórico\n\n`;
      
      setDiagnosticInfo(diagnosticLog);
      setIsDiagnosticModalOpen(true);
      return;
    }
    
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para criar um projeto.",
        variant: "destructive",
      });
      
      diagnosticLog += `[DIAGNÓSTICO] Erro: usuário não está logado\n\n`;
      setDiagnosticInfo(diagnosticLog);
      setIsDiagnosticModalOpen(true);
      return;
    }
    
    // Evitar dupla submissão
    if (isSubmitting.current) {
      devLog.log(`[${submitId}] Submissão em andamento, evitando duplicação`);
      
      diagnosticLog += `[DIAGNÓSTICO] Submissão em andamento, evitando duplicação\n\n`;
      setDiagnosticInfo(diagnosticLog);
      setIsDiagnosticModalOpen(true);
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
          
          diagnosticLog += `[DIAGNÓSTICO] Projeto criado recentemente, bloqueando duplicação\n`;
          diagnosticLog += `- Último projeto criado há ${timeDiff/1000} segundos\n\n`;
          
          toast({
            title: "Ação bloqueada",
            description: "Você criou um projeto recentemente. Aguarde alguns segundos.",
            variant: "destructive",
          });
          
          setDiagnosticInfo(diagnosticLog);
          setIsDiagnosticModalOpen(true);
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
      
      diagnosticLog += `[DIAGNÓSTICO] Submissão registrada como processada\n`;
      
      // Get current date in ISO format
      const currentDate = new Date().toISOString();
      
      // ✅ CORREÇÃO MULTI-TENANT: Calcular valor via API que consulta configurações do tenant
      let valorCalculado = 0;
      let calculationSource = 'unknown';
      
      console.log(`🚀 [${submitId}] INICIANDO CÁLCULO DE VALOR:`, {
        potencia: data.power,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Obter headers com tenant_id
        const headers = await createTenantHeaders(user.id);
        
        console.log(`📋 [${submitId}] HEADERS PREPARADOS:`, { 
          headers, 
          userId: user.id,
          potencia: data.power 
        });
        
        const calcResponse = await fetch('/api/projects/calculate-cost', {
          method: 'POST',
          headers,
          body: JSON.stringify({ potencia: data.power })
        });
        
        console.log(`📡 [${submitId}] RESPOSTA DA API:`, {
          ok: calcResponse.ok,
          status: calcResponse.status,
          statusText: calcResponse.statusText
        });
        
        if (calcResponse.ok) {
          const calcResult = await calcResponse.json();
          valorCalculado = calcResult.valorCalculado || 0;
          calculationSource = calcResult.source || 'api_success';
          
          console.log(`✅ [${submitId}] SUCESSO - VALOR DA API:`, { 
            potencia: data.power, 
            valorCalculado, 
            source: calcResult.source,
            faixasUsadas: calcResult.faixasUsadas,
            tenantId: calcResult.tenantId,
            apiResponse: calcResult
          });
        } else {
          const responseText = await calcResponse.text();
          console.error(`❌ [${submitId}] ERRO NA API:`, {
            status: calcResponse.status,
            statusText: calcResponse.statusText,
            responseText: responseText
          });
          
          // Fallback para valor padrão se a API falhar
          valorCalculado = calculateProjectCost(data.power);
          calculationSource = 'fallback_api_error';
          
          console.log(`🔄 [${submitId}] USANDO FALLBACK LOCAL:`, {
            potencia: data.power,
            valorCalculadoFallback: valorCalculado,
            source: calculationSource
          });
        }
      } catch (calcError) {
        console.error(`💥 [${submitId}] EXCEÇÃO NO CÁLCULO:`, calcError);
        
        // Fallback para valor padrão se houver exceção
        valorCalculado = calculateProjectCost(data.power);
        calculationSource = 'fallback_exception';
        
        console.log(`🔄 [${submitId}] FALLBACK APÓS EXCEÇÃO:`, {
          potencia: data.power,
          valorCalculado,
          source: calculationSource,
          error: calcError
        });
      }
      
      console.log(`🎯 [${submitId}] VALOR FINAL DEFINIDO:`, {
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
      diagnosticLog += `[DIAGNÓSTICO] Chamando Server Action createProjectClientAction\n`;

      const result = await createProjectClientAction(projectDataForAction, clientUserInfo);
      diagnosticLog += `[DIAGNÓSTICO] Resultado da Server Action: ${JSON.stringify(result)}\n`;

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        devLog.log(`[${submitId}] Projeto criado via action: `, result.data);
        diagnosticLog += `[DIAGNÓSTICO] Projeto criado com sucesso: ID ${result.data.id}, Número ${result.data.number}\n`;
        
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
      diagnosticLog += `[DIAGNÓSTICO] Erro ao criar projeto via action\n`;
      diagnosticLog += `- Mensagem: ${error.message || 'Erro desconhecido'}\n`;
      
      toast({ title: "Erro na criação", description: `Erro: ${error.message || 'Falha ao criar o projeto'}`, variant: "destructive", });
      setDiagnosticInfo(diagnosticLog); // Mostrar o log de diagnóstico
      setIsDiagnosticModalOpen(true); // Abrir o modal de diagnóstico
      
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
    <div className="space-y-8 p-6">
      {/* Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2">Meus Projetos</h1>
          <p className="mt-2 text-blue-100 text-sm sm:text-lg">
            Acompanhe o status e progresso dos seus projetos
          </p>
          
          {!isPendingApproval && (
            <Button 
              className="mt-4 bg-blue-600 text-white hover:bg-blue-700 shadow-md font-medium transition-all hover:shadow-lg text-sm sm:text-base"
              onClick={() => {
                devLog.log('Projects header button clicked');
                setIsCreateModalOpen(true);
              }}
            >
              <Icons.PlusCircle className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo Projeto</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          )}
        </div>
        
        {/* Enhanced decorative elements */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/40 to-indigo-500/30 blur-md"></div>
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-indigo-400/40 to-blue-500/30 blur-md"></div>
        <div className="absolute right-1/4 bottom-0 h-24 w-24 rounded-full bg-white/10"></div>
        <div className="absolute left-1/3 top-1/4 h-16 w-16 rounded-full bg-white/10"></div>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-2 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center text-gray-700 dark:text-gray-300 font-medium">
          <Icons.Filter className="h-4 w-4 mr-2" />
          <span className="text-sm sm:text-base">Filtrar por status:</span>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("all")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Todos
          </Button>
          <Button 
            variant={filter === "Não Iniciado" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Não Iniciado")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Não Iniciados
          </Button>
          <Button 
            variant={filter === "Em Desenvolvimento" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Em Desenvolvimento")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Em Desenvolvimento
          </Button>
          <Button 
            variant={filter === "Aguardando" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Aguardando")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Aguardando
          </Button>
          <Button 
            variant={filter === "Homologação" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Homologação")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Homologação
          </Button>
          <Button 
            variant={filter === "Projeto Aprovado" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Projeto Aprovado")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Aprovado
          </Button>
          <Button 
            variant={filter === "Aguardando Vistoria" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Aguardando Vistoria")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Aguardando Vistoria
          </Button>
          <Button 
            variant={filter === "Projeto Pausado" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Projeto Pausado")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Pausado
          </Button>
          <Button 
            variant={filter === "Em Vistoria" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Em Vistoria")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Em Vistoria
          </Button>
          <Button 
            variant={filter === "Finalizado" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Finalizado")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Finalizado
          </Button>
          <Button 
            variant={filter === "Cancelado" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setFilter("Cancelado")}
            className="rounded-full shadow-sm text-xs sm:text-sm"
          >
            Cancelado
          </Button>
        </div>
      </div>

      {/* Projects Table */}
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
        // Layout responsivo: Cards em mobile, tabela em desktop
        isMobile ? (
          // Layout de cards para mobile
          <div className="space-y-4">
            {filteredProjects.map((project, index) => {
              const statusConfig = getStatusConfig(project.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={`${project.id}-${index}`} className="border border-gray-200/60 dark:border-gray-700/60 shadow-md bg-white dark:bg-gray-800 hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Header do card */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center shadow-sm">
                            <Icons.Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{project.number}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Projeto</p>
                          </div>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${statusConfig.color} dark:bg-opacity-20 shadow-sm`}>
                          <StatusIcon className="w-3 h-3" />
                          <span className="text-xs font-medium">{project.status}</span>
                        </div>
                      </div>

                      {/* Informações principais */}
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Cliente Final:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-medium text-right">{project.nomeClienteFinal || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Potência:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-medium">{project.potencia || 0} kWp</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Distribuidora:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-medium text-right truncate max-w-[150px]">{project.distribuidora || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Empresa:</span>
                          <span className="text-gray-900 dark:text-gray-100 font-medium text-right truncate max-w-[150px]">{project.empresaIntegradora || userData?.companyName || userData?.name || 'N/A'}</span>
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
                          <span className="text-sm font-medium">{project.status}</span>
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
      ) : (
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

      {/* Modal de diagnóstico */}
      <Dialog open={isDiagnosticModalOpen} onOpenChange={setIsDiagnosticModalOpen}>
        <DialogContent className="max-w-[80vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Diagnóstico de Criação de Projeto</DialogTitle>
            <DialogDescription>
              Detalhes do processo de criação de projeto e possíveis erros
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-md border p-4">
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {diagnosticInfo}
            </pre>
          </ScrollArea>
          <div className="flex justify-end">
            <Button onClick={() => setIsDiagnosticModalOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Project Creation Modal */}
      <LazyClientCreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  );
} 