"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Project } from "@/types/project";
import { UserData } from "@/lib/services/authService.supabase";
import { createProjectClientAction } from "@/lib/actions/project-actions";
import { LazyClientCreateProjectModal } from "@/lib/utils/lazy-components";
import { calculateProjectCost } from "@/lib/utils/projectUtils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import * as Icons from "lucide-react";
import { useProjects } from "@/lib/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { devLog } from "@/lib/utils/productionLogger";
import React from "react";
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService';
import { format } from 'date-fns/format';
import { subMonths } from 'date-fns/subMonths';
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval';
import { ptBR } from 'date-fns/locale/pt-BR';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

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

export default function ClientDashboard() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalAlert, setShowApprovalAlert] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([]);
  const { projects, addProject } = useProjects();
  // Adicionando um ref para controlar duplicação de submissão
  const isSubmitting = React.useRef(false);

  // Estados para os gráficos
  const [monthlyProjectsData, setMonthlyProjectsData] = useState<any[]>([]);
  const [projectsByStatusData, setProjectsByStatusData] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#AF19FF', '#FF5733'];

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

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[ClientePainel] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[ClientePainel] Erro ao carregar status:', error);
        setAvailableStatuses([]);
      }
    };

    loadStatuses();
  }, []);

  // Processar dados para os gráficos
  useEffect(() => {
    if (projects && projects.length > 0 && availableStatuses.length > 0) {
      // Helper para filtrar projetos por mês
      const filterProjectsByMonth = (projects: Project[], month: Date) => {
        return projects.filter(p => {
          if (!p.createdAt) return false;
          const projectDate = typeof p.createdAt === 'string' ? new Date(p.createdAt) : p.createdAt;
          return projectDate.getMonth() === month.getMonth() && 
                 projectDate.getFullYear() === month.getFullYear();
        });
      };

      // Dados para gráfico de barras (Projetos por Mês)
      const endDate = new Date();
      const startDate = subMonths(endDate, 5);
      const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

      const monthlyProjectsChartData = monthsInterval.map(month => ({
        name: format(month, 'MMM', { locale: ptBR }),
        projetos: filterProjectsByMonth(projects, month).length,
      }));
      setMonthlyProjectsData(monthlyProjectsChartData);

      // Dados para gráfico de pizza (Distribuição por Status)
      const statusCounts: { [key: string]: number } = {};
      projects.forEach(p => {
        const statusSlug = p.status || 'indefinido';
        statusCounts[statusSlug] = (statusCounts[statusSlug] || 0) + 1;
      });

      const projectsByStatusChartData = Object.entries(statusCounts)
        .map(([statusSlug, value]) => {
          // Encontrar o status correspondente para obter o nome correto
          const statusInfo = availableStatuses.find(s => s.slug === statusSlug);
          return {
            name: statusInfo?.name || statusSlug,
            value,
            color: statusInfo?.color || '#8884d8'
          };
        })
        .sort((a, b) => b.value - a.value);
      setProjectsByStatusData(projectsByStatusChartData);
    } else {
      setMonthlyProjectsData([]);
      setProjectsByStatusData([]);
    }
  }, [projects, availableStatuses]);

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
        nome_cliente_final: data.nomeClienteFinal,
        number: data.projectNumber, // Será gerado pela action/service se undefined
        empresaIntegradora: data.empresaIntegradora, // Vem do formulário do modal
        nomeClienteFinal: data.nomeClienteFinal,
        cpf_cnpj_cliente_final: data.cpf_cnpj_cliente_final, // ✅ NOVO CAMPO
        endereco_local: data.endereco_local, // ✅ NOVO CAMPO
        havera_beneficiarias: data.havera_beneficiarias, // ✅ NOVO CAMPO: Compensação de créditos
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
        addProject(result.data); // Atualizar a lista de projetos localmente via useProjects hook
        
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use either the full userData or the basic user info from auth context
  const displayData: DisplayUserData = userData || user || {};
  const isPendingApproval = user?.profile?.status === 'pending' || userData?.status === 'pending';

  return (
    <div className="space-y-6 p-4">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Bem-vindo, {displayData?.name || 'Cliente'}
          </h1>
          <p className="mt-2 text-orange-100">
            Acompanhe seus projetos e notificações em um só lugar
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-orange-400/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-500/30"></div>
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
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Icon in circle */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Icons.Layers className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projetos Ativos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {projects.filter(p => p.status !== 'Finalizado' && p.status !== 'Cancelado').length}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                  Em andamento
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Cobrança Card */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Icon in circle */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Icons.DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Cobrança</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
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
                      const price = project.valorProjeto ?? 0;
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
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  Pendente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projetos Concluídos Card */}
        <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {/* Icon in circle */}
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                <Icons.CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projetos Concluídos</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {projects.filter(p => p.status === 'Finalizado').length}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                  Finalizados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Ações Rápidas */}
      <div className="flex items-center justify-end gap-4">
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={isPendingApproval}
          className="bg-orange-600 text-white hover:bg-orange-700 shadow-md font-medium transition-all duration-200 px-6 py-2.5"
        >
          <Icons.PlusCircle className="h-5 w-5 mr-2" />
          Novo Projeto
        </Button>
        <Button 
          onClick={() => window.location.href = '/cliente/projetos'}
          variant="outline"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 shadow-sm font-medium transition-all duration-200 px-6 py-2.5"
        >
          <Icons.FolderOpen className="h-5 w-5 mr-2" />
          Ver Todos os Projetos
        </Button>
      </div>

      {/* Gráficos de Análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras - Projetos por Mês */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Projetos por Mês</CardTitle>
            <CardDescription>Evolução dos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyProjectsData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                <YAxis fontSize={12} tickLine={false} axisLine={true} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(200, 200, 200, 0.2)'}}
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    padding: '8px',
                    fontSize: '12px',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="projetos" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza - Distribuição por Status */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Projetos por estágio</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                <Pie
                  data={projectsByStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={false}
                >
                  {projectsByStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="bg-background border border-border p-2 rounded shadow-lg">
                          <p className="font-semibold">{data.payload.name}</p>
                          <p style={{ color: data.color }}>
                            Projetos: {data.value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap gap-3 justify-center mt-4">
                      {payload?.map((entry, index) => {
                        const words = entry.value.split(' ');
                        const shouldBreak = words.length > 3;

                        // Calcular percentual baseado nos dados do gráfico
                        const totalValue = projectsByStatusData.reduce((sum, item) => sum + item.value, 0);
                        const currentData = projectsByStatusData.find(item => item.name === entry.value);
                        const percentage = currentData ? Math.round((currentData.value / totalValue) * 100) : 0;

                        return (
                          <div key={`legend-${index}`} className="flex items-center gap-1 text-xs">
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: projectsByStatusData.find(item => item.name === entry.value)?.color || entry.color }}
                            ></div>
                            <span className={shouldBreak ? "text-center leading-tight" : ""}>
                              {shouldBreak ? (
                                <span>
                                  {words.slice(0, Math.ceil(words.length / 2)).join(' ')}<br/>
                                  {words.slice(Math.ceil(words.length / 2)).join(' ')} ({percentage}%)
                                </span>
                              ) : `${entry.value} (${percentage}%)`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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