"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Download, 
  Building2, 
  Zap,
  User,
  DollarSign,
  ChevronRight,
  Package,
  CreditCard,
  Search,
  X
} from "lucide-react";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
// import { formatDistanceToNow } from "date-fns";
import { getClientProjectsAction } from "@/lib/actions/project-actions";
import { generateInvoiceHTML, downloadHTMLAsPDF } from "@/lib/utils/pdfGenerator";
// ✅ CORREÇÃO: Removido imports de getUserDataSupabase e getClients - agora usa APIs seguras
import { toSafeDate } from "@/lib/utils/dateHelpers";
import { devLog } from "@/lib/utils/productionLogger";
import type { Project } from "@/types/project";
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService';
// import { ProjectWithBilling } from '@/types/billing';

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

export default function ClientBillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<"avulsos" | "pacotes" | "assinaturas">("avulsos");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([]);
  
  // ✅ Estados para Pacotes e Assinaturas
  const [clientePacotes, setClientePacotes] = useState<any[]>([]);
  const [clienteAssinaturas, setClienteAssinaturas] = useState<any[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [loadingAssinaturas, setLoadingAssinaturas] = useState(false);

  // ✅ CORREÇÃO: useEffect executado apenas UMA vez na montagem inicial
  // Evita recarregamento desnecessário ao trocar de aba do navegador
  useEffect(() => {
    async function fetchProjects() {
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para visualizar suas cobranças.",
          variant: "destructive",
        });
        router.push("/cliente/login");
        return;
      }

      try {
        setLoading(true);
        devLog.log("Fetching projects for user:", user.id);

        // Call the server action
        const result = await getClientProjectsAction(user.id);

        if (result.error) {
          devLog.error("Error fetching projects via action:", result.error);
          toast({
            title: "Erro ao carregar projetos",
            description: result.error,
            variant: "destructive",
          });
          setProjects([]); // Clear projects or handle as appropriate
          return;
        }

        const clientProjects = result.data || [];
        devLog.log("Projects fetched via action:", clientProjects.length);

        // ✅ CORREÇÃO: Server action já filtra por owner_id, não precisa filtrar novamente
        // Filtro client-side removido para usar owner_id do backend
        const userProjects = clientProjects;
        devLog.log("User projects:", userProjects.length);

        const projectsWithInvoiceStatus = userProjects.map((project) => {
          const paymentStatus = project.pagamento || 'pendente';
          let price;
          if (project.valorProjeto !== undefined && project.valorProjeto !== null) {
            price = project.valorProjeto.toString();
          } else {
            // Precificação manual - exibir como R$ 0,00
            price = '0';
          }

          return {
            ...project,
            invoiceStatus: paymentStatus,
            price
          };
        });

        devLog.log("Setting projects with actual payment status:", projectsWithInvoiceStatus.length);
        setProjects(projectsWithInvoiceStatus);
      } catch (error) {
        // This catch block might be for unexpected errors not caught by the action's own try/catch
        devLog.error("Error in fetchProjects function:", error);
        toast({
          title: "Erro Inesperado",
          description: "Ocorreu um erro inesperado ao carregar seus projetos. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    if (user) { // Ensure user is available before fetching
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Array vazio - executa apenas uma vez na montagem

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[ClienteCobranca] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[ClienteCobranca] Erro ao carregar status:', error);
        setAvailableStatuses([]);
      }
    };

    loadStatuses();
  }, []);

  // ✅ Carregar dados de pacotes e assinaturas quando trocar de tab
  useEffect(() => {
    if (mainTab === 'pacotes' && clientePacotes.length === 0) {
      loadClientePacotes();
    } else if (mainTab === 'assinaturas' && clienteAssinaturas.length === 0) {
      loadClienteAssinaturas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainTab]);

  // ✅ Buscar pacotes do cliente
  const loadClientePacotes = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingPacotes(true);
      const response = await fetch(`/api/cliente/pacotes?userId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setClientePacotes(result.data || []);
        devLog.log('[ClienteCobranca] Pacotes carregados:', result.data?.length || 0);
      }
    } catch (error) {
      devLog.error('[ClienteCobranca] Erro ao carregar pacotes:', error);
      setClientePacotes([]);
    } finally {
      setLoadingPacotes(false);
    }
  };

  // ✅ Buscar assinaturas do cliente
  const loadClienteAssinaturas = async () => {
    if (!user?.id) return;
    
    try {
      setLoadingAssinaturas(true);
      const response = await fetch(`/api/cliente/assinaturas?userId=${user.id}`);
      const result = await response.json();

      if (result.success) {
        setClienteAssinaturas(result.data || []);
        devLog.log('[ClienteCobranca] Assinaturas carregadas:', result.data?.length || 0);
      }
    } catch (error) {
      devLog.error('[ClienteCobranca] Erro ao carregar assinaturas:', error);
      setClienteAssinaturas([]);
    } finally {
      setLoadingAssinaturas(false);
    }
  };

  // Function to generate and download invoice
  const handleDownloadInvoice = async (project: any) => {
    if (!project) return;

    // SECURITY CHECK: Ensure the project belongs to the current user
    // Priorizar owner_id (proprietário) sobre userId (criador) para permitir que
    // clientes acessem projetos criados para eles por administradores
    const projectOwnerId = project.owner_id || project.userId;
    if (projectOwnerId !== user?.id) {
      toast({
        title: "Erro de permissão",
        description: "Você não tem permissão para acessar esta fatura.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingInvoice(true);
    try {
      // ✅ CORREÇÃO: Substituir chamada direta ao Supabase por API segura
      const userResponse = await fetch(`/api/user/profile?userId=${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error(`Erro na API do usuário: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      devLog.log("User data for invoice:", userData);

      // ✅ SEGURANÇA: Usar apenas dados do usuário atual (remover getClients que é inseguro)
      const clientData = userData; // Usar dados do próprio usuário em vez de buscar todos os clientes
      
      if (!clientData) {
        devLog.warn("Dados completos do cliente não encontrados, usando dados de autenticação");
      }
      
      // Criar um objeto de usuário completo com os dados do banco de dados
      // Combinar os dados de autenticação com os dados completos do cliente
      const completeUserData = {
        ...(clientData || user),
        userData: userData,
        // Campos do banco (snake_case) - PRIORIDADE
        is_company: userData?.is_company || clientData?.is_company,
        company_name: userData?.company_name || clientData?.company_name || "",
        cpf: userData?.cpf || clientData?.cpf || "",
        cnpj: userData?.cnpj || clientData?.cnpj || "",
        // Campos compatibilidade (camelCase)
        companyName: userData?.company_name || clientData?.companyName || userData?.companyName || "",
        company: clientData?.company || (userData as any)?.company || "",
        isCompany: userData?.is_company || clientData?.is_company || clientData?.isCompany
      };
      
      devLog.log("Complete user data for invoice:", completeUserData);
      
      // Buscar dados bancários via API admin (espelha Preferências do admin)
      const normalizeDadosBancarios = (raw: any) => {
        const src = raw?.dados_bancarios || raw?.dadosBancarios || raw || {};
        return {
          banco: src.banco || src.bank || '',
          agencia: src.agencia || src.agency || '',
          conta: src.conta || src.account || '',
          favorecido: src.favorecido || src.beneficiario || src.titular || '',
          documento: src.documento || src.cnpj || src.cpf || '',
          chavePix: src.chavePix || src.pix || src.pix_key || ''
        } as any;
      };
      let dadosBancarios: any = undefined;
      try {
        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (json?.success && (json?.data?.dados_bancarios || json?.data?.dadosBancarios)) {
          dadosBancarios = normalizeDadosBancarios(json.data);
        }
      } catch {}
      
      // Obter valor como número e também string formatada de forma consistente
      const totalValue = parseFloat(String(project.valorProjeto ?? '0'));
      const formattedPrice = totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      // ✅ CORREÇÃO: Buscar nome real do status do tenant antes de gerar PDF
      const projectStatus = availableStatuses.find(s => s.slug === project.status);
      const statusName = projectStatus?.name || getStatusDisplayName(project.status);

      // Format dates
      const issueDate = new Date().toLocaleDateString('pt-BR');
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days

      // Generate the invoice HTML with complete user data and dados bancários
      const invoiceHTML = generateInvoiceHTML(
        project,
        completeUserData,
        formattedPrice,
        totalValue, // Mantido para compatibilidade da API
        issueDate,
        dueDate,
        dadosBancarios, // Incluir dados bancários
        statusName // ✅ NOVO: Passar nome real do status
      );
      
      // Download the invoice as PDF
      downloadHTMLAsPDF(invoiceHTML, `fatura-${project.number}.pdf`);
      
      toast({
        title: "Fatura gerada com sucesso",
        description: "A fatura em PDF foi gerada e está sendo baixada.",
        variant: "default",
      });
    } catch (error) {
      devLog.error("Error generating invoice:", error);
      toast({
        title: "Erro ao gerar fatura",
        description: "Ocorreu um erro ao gerar a fatura. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    // Use the actual status from the database
    if (status === 'pago') {
      return <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50">Pago</Badge>;
    } else if (status === 'parcela1') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50">1ª Parcela Paga</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50">Pendente</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 bg-white dark:bg-gray-800 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Calculate statistics for AVULSOS (projetos avulsos)
  const avulsosProjects = projects.filter(p => !p.billing_mode || p.billing_mode === 'avulso');
  const totalProjectsCount = avulsosProjects.length;
  const pendingProjectsCount = avulsosProjects.filter(p => (p as any).invoiceStatus !== 'pago').length;
  const paidProjectsCount = avulsosProjects.filter(p => (p as any).invoiceStatus === 'pago').length;
  
  // Calculate total value with consideration for partial payments (apenas avulsos)
  const totalValue = avulsosProjects.reduce((sum, project) => sum + parseFloat(String(project.valorProjeto ?? '0')), 0);
  
  // Calculate paid value, counting full payment for 'pago' status and half payment for 'parcela1'
  const paidValue = avulsosProjects.reduce((sum, project) => {
    const price = parseFloat(String(project.valorProjeto ?? '0'));
    if ((project as any).invoiceStatus === 'pago') {
      return sum + price; // Full payment
    } else if ((project as any).invoiceStatus === 'parcela1') {
      return sum + (price / 2); // Half payment - first installment
    }
    return sum;
  }, 0);
  
  // Pending value is now the difference between total and calculated paid value
  const pendingValue = totalValue - paidValue;

  // ✅ Calculate statistics for PACOTES
  const pacotesAtivos = clientePacotes.filter(p => p.status === 'ativo').length;
  const projetosDisponiveis = clientePacotes.reduce((sum, pacote) => {
    if (pacote.status === 'ativo') {
      const usados = pacote.projetos_utilizados || 0;
      const inclusos = pacote.projetos_inclusos || 0;
      return sum + (inclusos - usados);
    }
    return sum;
  }, 0);
  const valorTotalInvestido = clientePacotes.reduce((sum, pacote) => {
    const valor = parseFloat(pacote.pacotes_definicoes?.valor || pacote.valor || 0);
    return sum + valor;
  }, 0);

  // ✅ Calculate statistics for ASSINATURAS
  const assinaturasAtivas = clienteAssinaturas.filter(a => a.status === 'ativa').length;
  const valorMensal = clienteAssinaturas
    .filter(a => a.status === 'ativa')
    .reduce((sum, assinatura) => {
      const valor = parseFloat(assinatura.planos_assinatura?.valor_mensal || 0);
      return sum + valor;
    }, 0);
  
  // Calcular projetos disponíveis nas assinaturas
  const assinaturasAtivasData = clienteAssinaturas.filter(a => a.status === 'ativa');
  const projetosPermitidosAssinaturas = assinaturasAtivasData.reduce((sum, assinatura) => {
    return sum + (parseInt(assinatura.projetos_mensais) || 0);
  }, 0);
  const projetosUsadosAssinaturas = assinaturasAtivasData.reduce((sum, assinatura) => {
    return sum + (parseInt(assinatura.projetos_usados_mes_atual) || 0);
  }, 0);
  const projetosDisponiveisAssinaturas = projetosPermitidosAssinaturas - projetosUsadosAssinaturas;

  // ✅ Nova lógica de filtragem combinada (busca + situação + status + billing_mode)
  const filteredProjects = projects.filter(project => {
    // ✅ CRÍTICO: Filtro por modalidade de cobrança (billing mode)
    let billingModeMatch = true;
    if (mainTab === 'avulsos') {
      // Mostrar apenas projetos avulsos (billing_mode null, undefined ou 'avulso')
      billingModeMatch = !project.billing_mode || project.billing_mode === 'avulso';
    } else if (mainTab === 'pacotes') {
      // Mostrar apenas projetos de pacotes
      billingModeMatch = project.billing_mode === 'pacote';
    } else if (mainTab === 'assinaturas') {
      // Mostrar apenas projetos de assinaturas
      billingModeMatch = project.billing_mode === 'assinatura';
    }

    // Filtro de busca
    const searchMatch = searchTerm.trim() === '' || (
      project.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.nomeClienteFinal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.empresaIntegradora?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.distribuidora?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtro de situação de pagamento
    const paymentMatch = selectedPaymentStatus === 'all' || (project as any).invoiceStatus === selectedPaymentStatus;

    // Filtro de status do projeto
    const statusMatch = selectedStatus === 'all' || project.status === selectedStatus;

    return billingModeMatch && searchMatch && paymentMatch && statusMatch;
  });

  // Verificar se há filtros ativos
  const hasActiveFilters = searchTerm.trim() !== '' || selectedPaymentStatus !== 'all' || selectedStatus !== 'all';

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedPaymentStatus('all');
    setSelectedStatus('all');
  };

  return (
    <div>
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg mb-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Cobranças
          </h1>
          <p className="mt-2 text-blue-100">
            Visualize e gerencie suas faturas
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30"></div>
      </div>

      {/* Abas Principais: Avulsos, Pacotes, Assinaturas */}
      <div className="mb-8">
        <nav className="flex space-x-2" aria-label="Tabs">
          <button
            onClick={() => setMainTab("avulsos")}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              mainTab === "avulsos"
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Avulsos
          </button>
          <button
            onClick={() => setMainTab("pacotes")}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              mainTab === "pacotes"
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Pacotes
          </button>
          <button
            onClick={() => setMainTab("assinaturas")}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              mainTab === "assinaturas"
                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Assinaturas
          </button>
        </nav>
      </div>

      {/* KPIs Dinâmicos baseados na aba selecionada */}
      {mainTab === "avulsos" && (
        <>
          {/* KPIs para Avulsos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-full">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Total Pendente</span>
            </CardTitle>
          </CardHeader>
              <CardContent className="pt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {`R$ ${pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pendingProjectsCount} {pendingProjectsCount === 1 ? 'cobrança pendente' : 'cobranças pendentes'}
            </p>
          </CardContent>
        </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-full">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Total Pago</span>
            </CardTitle>
          </CardHeader>
              <CardContent className="pt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {`R$ ${paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {paidProjectsCount} {paidProjectsCount === 1 ? 'cobrança paga' : 'cobranças pagas'}
            </p>
          </CardContent>
        </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <Download className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Total de Projetos</span>
            </CardTitle>
          </CardHeader>
              <CardContent className="pt-2">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalProjectsCount}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} em valor total
            </p>
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {mainTab === "pacotes" && (
        <>
          {/* KPIs para Pacotes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-purple-500 rounded-full">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Pacotes Ativos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {pacotesAtivos}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {pacotesAtivos === 0 ? 'Nenhum pacote contratado' : `${pacotesAtivos} ${pacotesAtivos === 1 ? 'pacote contratado' : 'pacotes contratados'}`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-full">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Projetos Disponíveis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {projetosDisponiveis}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {projetosDisponiveis === 1 ? 'projeto restante' : 'projetos restantes'}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Valor Total Investido</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {`R$ ${valorTotalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  em pacotes contratados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Detalhados dos Pacotes */}
          {clientePacotes.length > 0 && (
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Meus Pacotes
              </h3>
              {clientePacotes.map((pacote) => {
                const definicaoPacote = pacote.pacotes_definicoes;
                const isAtivo = pacote.status === 'ativo';
                const statusPagamento = pacote.status_pagamento || 'em_dia'; // Assumir 'em_dia' se não houver
                const projetosDisponiveis = (pacote.projetos_inclusos || 0) - (pacote.projetos_usados || 0);
                
                // Calcular validade/expiração
                const dataExpiracao = pacote.data_expiracao 
                  ? new Date(pacote.data_expiracao)
                  : null;
                
                const diasParaExpirar = dataExpiracao
                  ? Math.ceil((dataExpiracao.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                // Badge de status
                let statusBadgeClass = '';
                let statusText = '';
                
                switch(pacote.status) {
                  case 'ativo':
                    statusBadgeClass = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50';
                    statusText = 'Ativo';
                    break;
                  case 'expirado':
                    statusBadgeClass = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50';
                    statusText = 'Expirado';
                    break;
                  case 'esgotado':
                    statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50';
                    statusText = 'Esgotado';
                    break;
                  case 'cancelado':
                    statusBadgeClass = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800/50';
                    statusText = 'Cancelado';
                    break;
                  default:
                    statusBadgeClass = 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800/50';
                    statusText = pacote.status;
                }

                return (
                  <Card 
                    key={pacote.id} 
                    className="overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                        
                        {/* Coluna 1: Informações do Pacote */}
                        <div className="p-5 md:col-span-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 flex items-center justify-center flex-shrink-0">
                              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {definicaoPacote?.nome || pacote.nome || 'Pacote de Projetos'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`text-xs ${statusBadgeClass}`}>
                                  {statusText}
                                </Badge>
                                <Badge 
                                  className={`text-xs ${
                                    statusPagamento === 'em_dia' || statusPagamento === 'pago'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50' 
                                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50'
                                  }`}
                                >
                                  {statusPagamento === 'em_dia' || statusPagamento === 'pago' ? 'Pagamento em dia' : 'Pagamento pendente'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Coluna 2: Projetos */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Projetos do Pacote</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {projetosDisponiveis}/{pacote.projetos_inclusos || 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {pacote.projetos_usados || 0} {(pacote.projetos_usados || 0) === 1 ? 'usado' : 'usados'}
                          </div>
                        </div>

                        {/* Coluna 3: Valor do Pacote */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor do Pacote</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            R$ {parseFloat(definicaoPacote?.valor || pacote.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            valor total
                          </div>
                        </div>

                        {/* Coluna 4: Validade */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Validade</div>
                          {dataExpiracao ? (
                            <>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {dataExpiracao.toLocaleDateString('pt-BR')}
                              </div>
                              <div className={`text-xs mt-1 ${
                                diasParaExpirar !== null && diasParaExpirar <= 7 
                                  ? 'text-red-600 dark:text-red-400 font-medium' 
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {diasParaExpirar !== null && (
                                  diasParaExpirar > 0 
                                    ? `expira em ${diasParaExpirar} ${diasParaExpirar === 1 ? 'dia' : 'dias'}` 
                                    : diasParaExpirar === 0
                                    ? 'expira hoje'
                                    : 'expirado'
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">--</div>
                          )}
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {mainTab === "assinaturas" && (
        <>
          {/* KPIs para Assinaturas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-green-500 rounded-full">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Assinaturas Ativas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {assinaturasAtivas}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {assinaturasAtivas === 0 ? 'Nenhuma assinatura ativa' : `${assinaturasAtivas} ${assinaturasAtivas === 1 ? 'assinatura ativa' : 'assinaturas ativas'}`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Valor Mensal</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {`R$ ${valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  por mês
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-3">
                  <div className="p-3 bg-amber-500 rounded-full">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-gray-700 dark:text-gray-200">Projetos Disponíveis</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {projetosDisponiveisAssinaturas}
                  <span className="text-lg text-gray-500 dark:text-gray-400">/{projetosPermitidosAssinaturas}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {projetosDisponiveisAssinaturas === 0 && projetosPermitidosAssinaturas === 0 
                    ? 'Nenhuma assinatura ativa' 
                    : `${projetosUsadosAssinaturas} ${projetosUsadosAssinaturas === 1 ? 'projeto solicitado' : 'projetos solicitados'} este mês`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Detalhados das Assinaturas */}
          {clienteAssinaturas.length > 0 && (
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Minhas Assinaturas
              </h3>
              {clienteAssinaturas.map((assinatura) => {
                const plano = assinatura.planos_assinatura;
                const isAtiva = assinatura.status === 'ativa';
                const statusPagamento = assinatura.status_pagamento || 'em_dia'; // Assumir 'em_dia' se não houver
                const projetosDisponiveis = (assinatura.projetos_mensais || 0) - (assinatura.projetos_usados_mes_atual || 0);
                
                // Calcular próxima renovação
                const proximaRenovacao = assinatura.proximo_reset 
                  ? new Date(assinatura.proximo_reset)
                  : null;
                
                const diasParaRenovacao = proximaRenovacao
                  ? Math.ceil((proximaRenovacao.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <Card 
                    key={assinatura.id} 
                    className="overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                        
                        {/* Coluna 1: Informações do Plano */}
                        <div className="p-5 md:col-span-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center justify-center flex-shrink-0">
                              <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {plano?.nome || 'Plano de Assinatura'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  className={`text-xs ${
                                    isAtiva 
                                      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50' 
                                      : 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800/50'
                                  }`}
                                >
                                  {isAtiva ? 'Ativa' : assinatura.status}
                                </Badge>
                                <Badge 
                                  className={`text-xs ${
                                    statusPagamento === 'em_dia' || statusPagamento === 'pago'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50' 
                                      : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50'
                                  }`}
                                >
                                  {statusPagamento === 'em_dia' || statusPagamento === 'pago' ? 'Pagamento em dia' : 'Pagamento pendente'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Coluna 2: Projetos */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Projetos Este Mês</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {projetosDisponiveis}/{assinatura.projetos_mensais || 0}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {assinatura.projetos_usados_mes_atual || 0} {(assinatura.projetos_usados_mes_atual || 0) === 1 ? 'usado' : 'usados'}
                          </div>
                        </div>

                        {/* Coluna 3: Valor Mensal */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Valor Mensal</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            R$ {parseFloat(plano?.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            por mês
                          </div>
                        </div>

                        {/* Coluna 4: Renovação */}
                        <div className="p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Próxima Renovação</div>
                          {proximaRenovacao ? (
                            <>
                              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                {proximaRenovacao.toLocaleDateString('pt-BR')}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {diasParaRenovacao !== null && (
                                  diasParaRenovacao > 0 
                                    ? `em ${diasParaRenovacao} ${diasParaRenovacao === 1 ? 'dia' : 'dias'}` 
                                    : 'hoje'
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-lg font-semibold text-gray-500 dark:text-gray-400">--</div>
                          )}
                        </div>

                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Bloco de Filtros (apenas para Avulsos) */}
      {mainTab === "avulsos" && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col gap-4">
              {/* Linha 1: Campo de busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, número do projeto..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Linha 2: Filtros de seleção */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filtro por Situação de Pagamento */}
                <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as situações</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcela1">1ª Parcela Paga</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro por Status */}
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status.slug} value={status.slug}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Botão Limpar Filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800/50 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6 animate-in fade-in-50 duration-300">
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredProjects.map((project) => {
                // Buscar o status real do tenant ao invés de usar o mapa estático
                const projectStatus = availableStatuses.find(s => s.slug === project.status);
                const statusName = projectStatus?.name || getStatusDisplayName(project.status);

                return (
                <Card key={project.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                      {/* Project Info */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <Download className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projeto {project.nomeClienteFinal || 'Cliente Final'}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Nº {project.number}</p>
                            </div>
                          </div>
                          {getInvoiceStatusBadge((project as any).invoiceStatus)}
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600 dark:text-gray-300">{project.empresaIntegradora}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600 dark:text-gray-300">{project.nomeClienteFinal}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {toSafeDate(project.createdAt)?.toLocaleDateString('pt-BR') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Invoice Details */}
                      <div className="p-6">
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Detalhes da Fatura</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Potência:</span>
                            <div className="flex items-center">
                              <Zap className="h-4 w-4 text-amber-500 mr-1" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{project.potencia} kWp</span>
                            </div>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Distribuidora:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{project.distribuidora}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{statusName}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total:</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {project.valorProjeto !== null && project.valorProjeto !== undefined ? `R$ ${parseFloat(project.valorProjeto.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="p-6 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Ações</h4>
                          <div className="space-y-3">
                            <Button 
                              onClick={() => handleDownloadInvoice(project)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              disabled={isGeneratingInvoice}
                            >
                              {isGeneratingInvoice ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Gerando...
                                </>
                              ) : (
                                <>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar Fatura
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <Link href={`/cliente/projetos/${project.id}`} className="mt-4">
                          <Button variant="link" className="w-full text-blue-600 dark:text-blue-400 p-0 h-auto">
                            Ver Detalhes do Projeto
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                  <DollarSign className="h-8 w-8 text-gray-400 dark:text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Nenhuma fatura encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                    Não encontramos faturas com os filtros aplicados. Tente ajustar os filtros ou limpar para ver todas as faturas.
                </p>
                  {hasActiveFilters && (
                    <Button onClick={clearAllFilters} className="bg-blue-600 hover:bg-blue-700 text-white">
                      Limpar Filtros
                </Button>
                  )}
              </CardContent>
            </Card>
          )}
          </div>
        </>
      )}

      {/* Conteúdo para Pacotes */}
      {mainTab === "pacotes" && (
        <>
          {loadingPacotes ? (
            <div className="flex justify-center items-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 bg-white dark:bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
          ) : filteredProjects.length === 0 && clientePacotes.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                  <Package className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Nenhum pacote contratado
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Você ainda não possui pacotes de projetos contratados. Entre em contato com nosso time para conhecer os pacotes disponíveis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredProjects.map((project) => {
                    const projectStatus = availableStatuses.find(s => s.slug === project.status);
                    const statusName = projectStatus?.name || getStatusDisplayName(project.status);

                    return (
                      <Card key={project.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                            {/* Project Info */}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <Package className="h-5 w-5 text-purple-500 dark:text-purple-400" />
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projeto {project.nomeClienteFinal || 'Cliente Final'}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nº {project.number}</p>
                                  </div>
                                </div>
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800/50">
                                  Pacote
                                </Badge>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center text-sm">
                                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600 dark:text-gray-300">{project.empresaIntegradora}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                  <User className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600 dark:text-gray-300">{project.nomeClienteFinal}</span>
                                </div>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="p-6">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Detalhes da Fatura</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Potência:</span>
                                  <div className="flex items-center">
                                    <Zap className="h-4 w-4 text-amber-500 mr-1" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{project.potencia} kWp</span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Distribuidora:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{project.distribuidora}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{statusName}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total:</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                      {project.valorProjeto !== null && project.valorProjeto !== undefined ? `R$ ${parseFloat(project.valorProjeto.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Incluso no Pacote'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="p-6 flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Ações</h4>
                                <div className="space-y-3">
                                  <Button 
                                    onClick={() => handleDownloadInvoice(project)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                    disabled={isGeneratingInvoice}
                                  >
                                    {isGeneratingInvoice ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Gerando...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar Fatura
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              <Link href={`/cliente/projetos/${project.id}`} className="mt-4">
                                <Button variant="link" className="w-full text-blue-600 dark:text-blue-400 p-0 h-auto">
                                  Ver Detalhes do Projeto
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
                  <CardContent className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                      <Package className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      Nenhum projeto de pacote encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Você ainda não solicitou projetos utilizando seus pacotes contratados.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Conteúdo para Assinaturas */}
      {mainTab === "assinaturas" && (
        <>
          {loadingAssinaturas ? (
            <div className="flex justify-center items-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 bg-white dark:bg-gray-800 rounded-full"></div>
                </div>
              </div>
            </div>
          ) : filteredProjects.length === 0 && clienteAssinaturas.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                  Nenhuma assinatura ativa
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Você ainda não possui assinaturas ativas. Entre em contato com nosso time para conhecer os planos de assinatura disponíveis.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {filteredProjects.map((project) => {
                    const projectStatus = availableStatuses.find(s => s.slug === project.status);
                    const statusName = projectStatus?.name || getStatusDisplayName(project.status);

                    return (
                      <Card key={project.id} className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow">
                        <CardContent className="p-0">
                          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                            {/* Project Info */}
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-100 dark:border-green-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <CreditCard className="h-5 w-5 text-green-500 dark:text-green-400" />
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Projeto {project.nomeClienteFinal || 'Cliente Final'}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Nº {project.number}</p>
                                  </div>
                                </div>
                                <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800/50">
                                  Assinatura
                                </Badge>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center text-sm">
                                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600 dark:text-gray-300">{project.empresaIntegradora}</span>
                                </div>
                                <div className="flex items-center text-sm">
                                  <User className="h-4 w-4 text-gray-400 mr-2" />
                                  <span className="text-gray-600 dark:text-gray-300">{project.nomeClienteFinal}</span>
                                </div>
                              </div>
                            </div>

                            {/* Invoice Details */}
                            <div className="p-6">
                              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Detalhes da Fatura</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Potência:</span>
                                  <div className="flex items-center">
                                    <Zap className="h-4 w-4 text-amber-500 mr-1" />
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{project.potencia} kWp</span>
                                  </div>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Distribuidora:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{project.distribuidora}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Status:</span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{statusName}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total:</span>
                                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                                      Incluso na Assinatura
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="p-6 flex flex-col justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Ações</h4>
                                <div className="space-y-3">
                                  <Button 
                                    onClick={() => handleDownloadInvoice(project)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                    disabled={isGeneratingInvoice}
                                  >
                                    {isGeneratingInvoice ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Gerando...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="h-4 w-4 mr-2" />
                                        Baixar Fatura
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              <Link href={`/cliente/projetos/${project.id}`} className="mt-4">
                                <Button variant="link" className="w-full text-blue-600 dark:text-blue-400 p-0 h-auto">
                                  Ver Detalhes do Projeto
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
                  <CardContent className="p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                      <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      Nenhum projeto de assinatura encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Você ainda não solicitou projetos utilizando suas assinaturas.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 