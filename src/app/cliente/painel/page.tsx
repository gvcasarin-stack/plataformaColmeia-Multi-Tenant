"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Project } from "@/types/project";
import { getUserDataSupabase, UserData } from "@/lib/services/authService.supabase";
import { createProjectClientAction } from "@/lib/actions/project-actions";
import { LazyClientCreateProjectModal } from "@/lib/utils/lazy-components";
import { calculateProjectCost } from "@/lib/utils/projectUtils";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import * as Icons from "lucide-react";
import { useProjects } from "@/lib/hooks/useProjects";
import { Card, CardContent } from "@/components/ui/card";
import { devLog } from "@/lib/utils/productionLogger";
import React from "react";

// Adicionar tipo à interface Window
declare global {
  interface Window {
    _isCreatingProject?: boolean;
  }
}

// Define a combined type for user data
type DisplayUserData = {
  name?: string;
  email?: string | null;
  phone?: string;
  isCompany?: boolean;
  companyName?: string;
  cnpj?: string;
  cpf?: string;
  pendingApproval?: boolean;
  uid?: string;
};

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
      return { icon: Icons.CheckCheck, color: 'text-green-600 bg-green-50 border-green-200' };
    case 'Aguardando Vistoria':
      return { icon: Icons.Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'Projeto Pausado':
      return { icon: Icons.PauseCircle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    case 'Em Vistoria':
      return { icon: Icons.Activity, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
    case 'Finalizado':
      return { icon: Icons.CheckCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'Cancelado':
      return { icon: Icons.XCircle, color: 'text-red-600 bg-red-50 border-red-200' };
    default:
      return { icon: Icons.Clock, color: 'text-gray-500 bg-gray-50 border-gray-200' };
  }
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalAlert, setShowApprovalAlert] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { projects, loading: projectsLoading, addProject } = useProjects();
  // Adicionando um ref para controlar duplicação de submissão
  const isSubmitting = React.useRef(false);

  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          const data = await getUserDataSupabase(user.id);
          setUserData(data);
        } catch (error: any) {
          devLog.error("Error fetching user data:", error);
          // If we get a permission error, we'll use the basic user data from auth context
          if (error.code === 'permission-denied') {
            setError("Não foi possível carregar todos os dados do usuário. Algumas informações podem estar indisponíveis.");
          }
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }

    fetchUserData();
    
    // Check if the approval alert has been dismissed before
    if (typeof window !== 'undefined') {
      const alertDismissed = localStorage.getItem('approvalAlertDismissed');
      if (alertDismissed === 'true') {
        setShowApprovalAlert(false);
      }
    }
  }, [user]);

  const handleCreateProject = async (data: any) => {
    const submitId = data._submitId || `painel-${Date.now()}-${Math.random()}`;
    devLog.log(`[${submitId}] handleCreateProject chamado no painel do cliente`);
    
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
    
    // Evitar dupla submissão
    if (isSubmitting.current) {
      devLog.log(`[${submitId}] Submissão em andamento, evitando duplicação`);
      return;
    }
    
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para criar um projeto.", variant: "destructive", });
      return;
    }

    if (!user.email) {
      toast({ title: "Erro", description: "Email do usuário não encontrado. Faça login novamente.", variant: "destructive", });
      return;
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
      
      // Calcular o valor do projeto com base na potência usando a função calculateProjectCost
      const valorCalculado = calculateProjectCost(data.power);
      
      // Preparar dados para a action
      const projectDataForAction = {
        name: `Projeto ${data.nomeClienteFinal}`,
        number: data.projectNumber, // Será gerado pela action/service se undefined
        empresaIntegradora: data.empresaIntegradora, // Vem do formulário do modal
        nomeClienteFinal: data.nomeClienteFinal,
        distribuidora: data.distribuidora,
        potencia: data.power, // 'power' é o campo do formulário
        listaMateriais: data.listaMateriais, // ADICIONADO: Lista de materiais
        disjuntorPadraoEntrada: data.disjuntorPadraoEntrada, // ADICIONADO: Disjuntor do padrão de entrada
        valorProjeto: valorCalculado, // Adicionado
        dataEntrega: currentDate,
        // status e prioridade serão definidos pela action
        // userId será pego do clientUser na action
      };

      const clientUserInfo = {
        id: user.id, // ✅ SUPABASE: Usando 'id' para compatibilidade com Supabase
        name: userData?.name || user.displayName || user.email,
        companyName: userData?.companyName,
        email: user.email,
      };

      devLog.log(`[${submitId}] Chamando createProjectClientAction com:`, { projectDataForAction, clientUserInfo });
      
      const result = await createProjectClientAction(projectDataForAction, clientUserInfo);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        devLog.log(`[${submitId}] Projeto criado via action: `, result.data);
        // addProject(result.data); // Atualizar a lista de projetos localmente via useProjects hook
        
        toast({
          title: "Projeto criado com sucesso!",
          description: "Seu projeto foi criado com o status 'Não Iniciado'.",
        });
        window.location.href = `/cliente/projetos/${result.data.id}`; // Redirecionar
      } else {
        throw new Error("A action de criação de projeto não retornou dados do projeto.");
      }
    } catch (error: any) {
      devLog.error(`[${submitId}] Erro ao criar projeto via action:`, error);
      toast({
        title: "Erro ao Criar Projeto",
        description: error.message || "Ocorreu uma falha ao tentar criar o projeto.",
        variant: "destructive",
      });
      
      // Remover este ID dos processados em caso de erro para permitir nova tentativa
      const errorIndex = processedIds.indexOf(submitId);
      if (errorIndex !== -1) {
        processedIds.splice(errorIndex, 1);
        sessionStorage.setItem('processedSubmissions', JSON.stringify(processedIds));
      }
    } finally {
      setLoading(false); // Usar setLoading do estado do componente
      setIsCreateModalOpen(false);
      isSubmitting.current = false;
      // if (typeof window !== 'undefined' && window._isCreatingProject) {
      //   delete window._isCreatingProject;
      // }
    }
  };

  // Function to handle closing the approval alert
  const handleCloseApprovalAlert = () => {
    setShowApprovalAlert(false);
    // Save the preference in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('approvalAlertDismissed', 'true');
    }
  };

  // Function to navigate to project details
  const handleViewProject = (project: Project) => {
    window.location.href = `/cliente/projetos/${project.id}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use either the full userData or the basic user info from auth context
  const displayData: DisplayUserData = userData || user || {};
  const isPendingApproval = user?.pendingApproval || userData?.pendingApproval;

  return (
    <div className="space-y-8 p-6">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Bem-vindo, {displayData?.name || 'Cliente'}
          </h1>
          <p className="mt-2 text-orange-100">
            Acompanhe seus projetos e notificações em um só lugar
          </p>
          
          {!isPendingApproval && (
            <Button 
              variant="default"
              className="mt-4 !bg-blue-600 !text-white hover:!bg-blue-700 transition-colors duration-200 shadow-md font-medium"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Icons.PlusCircle className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          )}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/30"></div>
      </div>

      {/* Status Alerts */}
      <div className="space-y-4">
        {error && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex">
              <Icons.AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" />
              <div>
                <h5 className="text-blue-800 dark:text-blue-300 font-medium mb-1">Informação</h5>
                <div className="text-blue-700 dark:text-blue-400 text-sm">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {isPendingApproval && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex">
              <Icons.AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
              <div>
                <h5 className="text-amber-800 dark:text-amber-300 font-medium mb-1">Conta aguardando aprovação</h5>
                <div className="text-amber-700 dark:text-amber-400 text-sm">
                  Sua conta foi criada com sucesso, mas você precisa da aprovação de um administrador para poder abrir projetos. 
                  Você receberá uma notificação quando sua conta for aprovada.
                </div>
              </div>
            </div>
          </div>
        )}

        {!isPendingApproval && userData?.pendingApproval === false && showApprovalAlert && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-sm transition-all hover:shadow-md relative">
            <div className="flex">
              <Icons.CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
              <div>
                <h5 className="text-green-800 dark:text-green-300 font-medium mb-1">Conta aprovada</h5>
                <div className="text-green-700 dark:text-green-400 text-sm">
                  Sua conta foi aprovada! Agora você pode criar projetos e acessar todas as funcionalidades.
                </div>
              </div>
            </div>
            <button 
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-800 hover:bg-green-200 dark:hover:bg-green-700 transition-colors"
              onClick={handleCloseApprovalAlert}
              aria-label="Fechar"
            >
              <Icons.X className="h-4 w-4 text-green-700 dark:text-green-300" />
            </button>
          </div>
        )}
      </div>

      {/* Stats Overview - Enhanced Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Projetos Ativos Card */}
        <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            <div className="flex items-stretch h-full">
              {/* Left side icon area */}
              <div className="w-20 bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Icons.BarChart3 className="h-8 w-8 text-white" />
              </div>
              
              {/* Right side content */}
              <div className="flex-1 p-5">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Projetos Ativos</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => p.status !== 'Finalizado' && p.status !== 'Cancelado').length}
                  </p>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    Em andamento
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Cobrança Card */}
        <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            <div className="flex items-stretch h-full">
              {/* Left side icon area */}
              <div className="w-20 bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Icons.DollarSign className="h-8 w-8 text-white" />
              </div>
              
              {/* Right side content */}
              <div className="flex-1 p-5">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total de Cobrança</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {`R$ ${(() => {
                      // Processar projetos para obter preços
                      const projectsWithPrices = projects
                        // Filtrar apenas projetos que têm pagamentos pendentes ou parciais
                        .filter(p => {
                          // Se o campo pagamento existir
                          if ((p as any).pagamento) {
                            return (p as any).pagamento === 'pendente' || (p as any).pagamento === 'parcela1';
                          }
                          // Se não tiver o campo pagamento, considerar como pendente
                          return true;
                        })
                        .map(project => {
                          // Determine the price: prioritize valorProjeto if available
                          let price;
                          if (project.valorProjeto !== undefined && project.valorProjeto !== null) {
                            // Use the stored value from database
                            price = Number(project.valorProjeto);
                          } else {
                            // Default fallback only if no price is available
                            price = 4000; // Using 4000 as the default
                          }
                          
                          // NÃO ajustar o preço aqui para pagamentos parciais
                          // Vamos considerar o valor total do projeto e ajustar apenas no cálculo final
                          
                          return {
                            ...project,
                            price
                          };
                        });
                      
                      // Calcular valor total e valor pendente em uma única operação
                      const pendingValue = projectsWithPrices.reduce((sum, project) => {
                        const price = project.valorProjeto || 4000;
                        // Se for parcela1, apenas metade do valor está pendente
                        if ((project as any).pagamento === 'parcela1') {
                          return sum + (price / 2);
                        }
                        // Se for pendente ou não tiver pagamento definido, todo o valor está pendente
                        return sum + price;
                      }, 0);
                      
                      return pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    })()}`}
                  </p>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    Pendente
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projetos Concluídos Card */}
        <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative bg-white dark:bg-gray-800">
          <CardContent className="p-0">
            <div className="flex items-stretch h-full">
              {/* Left side icon area */}
              <div className="w-20 bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Icons.TrendingUp className="h-8 w-8 text-white" />
              </div>
              
              {/* Right side content */}
              <div className="flex-1 p-5">
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Projetos Concluídos</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {projects.filter(p => p.status === 'Finalizado').length}
                  </p>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    Finalizados
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Projetos</h2>
          {!isPendingApproval && (
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md font-medium transition-all duration-200"
            >
              <Icons.PlusCircle className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          )}
        </div>

        {isPendingApproval ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-6 text-amber-600 dark:text-amber-400 text-sm">
            <p className="font-medium">Conta pendente de aprovação</p>
            <p className="mt-1">Você poderá criar projetos após a aprovação da sua conta.</p>
          </div>
        ) : projectsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Você ainda não possui projetos.</p>
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-md font-medium"
            >
              <Icons.PlusCircle className="h-4 w-4 mr-2" />
              Criar Novo Projeto
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200/60 shadow-sm overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
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
                {projects.map((project, index) => {
                  const statusConfig = getStatusConfig(project.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow
                      key={`${project.id}-${index}`}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40 cursor-pointer group"
                    >
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {project.number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                            <Icons.Building2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.empresaIntegradora || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0">
                            <Icons.Users className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.nomeClienteFinal || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 dark:text-gray-300">{project.distribuidora || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 flex items-center justify-center flex-shrink-0">
                            <Icons.Zap className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{project.potencia} kWp</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${statusConfig.color} dark:bg-opacity-20`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="text-sm font-medium">{project.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-gray-600 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleViewProject(project)}
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
        )}
      </div>

      {/* Project Creation Modal */}
      <LazyClientCreateProjectModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateProject}
      />
    </div>
  );
} 