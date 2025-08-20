"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Building2, 
  Zap,
  User,
  DollarSign,
  ChevronRight
} from "lucide-react";
import Link from "next/link";
import { ptBR } from "date-fns/locale";
// import { formatDistanceToNow } from "date-fns";
import { getClientProjectsAction } from "@/lib/actions/project-actions";
import { generateInvoiceHTML, downloadHTMLAsPDF } from "@/lib/utils/pdfGenerator";
import { getUserDataSupabase } from "@/lib/services/authService.supabase";
import { getClients } from "@/lib/services/clientService.supabase";
import { toSafeDate } from "@/lib/utils/dateHelpers";
import { getConfig } from "@/lib/services/configService";
import { devLog } from "@/lib/utils/productionLogger";
import type { Project } from "@/types/project";
// import { ProjectWithBilling } from '@/types/billing';

export default function ClientBillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("todos");
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

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
        
        // The server action should ideally handle filtering by userId if it's a generic getProjects call internally.
        // If getClientProjectsAction is specific to a client, this client-side filter might be redundant but safe.
        const userProjects = clientProjects.filter(project => project.userId === user.id);
        devLog.log("Filtered to user projects (client-side check):", userProjects.length);
        
        const projectsWithInvoiceStatus = userProjects.map((project) => {
          const paymentStatus = project.pagamento || 'pendente';
          let price;
          if (project.valorProjeto !== undefined && project.valorProjeto !== null) {
            price = project.valorProjeto.toString();
          } else {
            // Fallback to calculated value based on potencia
            price = '4000';
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
  }, [user, router]);

  // Function to generate and download invoice
  const handleDownloadInvoice = async (project: any) => {
    if (!project) return;
    
    // SECURITY CHECK: Ensure the project belongs to the current user
    if (project.userId !== user?.id) {
      toast({
        title: "Erro de permissão",
        description: "Você não tem permissão para acessar esta fatura.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingInvoice(true);
    try {
      // Obter dados completos do usuário, incluindo telefone
                const userData = await getUserDataSupabase(user.id);
      devLog.log("User data for invoice:", userData);
      
      // Buscar todos os clientes para obter dados completos da empresa
      const allClients = await getClients();
      const clientData = allClients.find(c => c.id === user.id);
      
      if (!clientData) {
        devLog.warn("Dados completos do cliente não encontrados, usando dados de autenticação");
      }
      
      // Criar um objeto de usuário completo com os dados do banco de dados
      // Combinar os dados de autenticação com os dados completos do cliente
      const completeUserData = {
        ...(clientData || user),
        userData: userData,
        // Manter campos esperados pelo gerador com base nas fontes confiáveis
        companyName: clientData?.companyName || userData?.companyName || "",
        company: clientData?.company || (userData as any)?.company || "",
        cnpj: clientData?.cnpj || userData?.cnpj || ""
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
      const totalValue = parseFloat(project.valorProjeto || '4000');
      const formattedPrice = totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      
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
        dadosBancarios // Incluir dados bancários
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

  // Calculate statistics for summary cards
  const totalProjectsCount = projects.length;
  const pendingProjectsCount = projects.filter(p => (p as any).invoiceStatus !== 'pago').length;
  const paidProjectsCount = projects.filter(p => (p as any).invoiceStatus === 'pago').length;
  
  // Calculate total value with consideration for partial payments
      const totalValue = projects.reduce((sum, project) => sum + parseFloat(String(project.valorProjeto ?? '0')), 0);
  
  // Calculate paid value, counting full payment for 'pago' status and half payment for 'parcela1'
  const paidValue = projects.reduce((sum, project) => {
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

  // Filter projects based on active tab, adding support for 'parcela1' status
  const filteredProjects = activeTab === 'todos' 
    ? projects 
    : activeTab === 'parcela1'
      ? projects.filter(project => (project as any).invoiceStatus === 'parcela1')
      : projects.filter(project => (project as any).invoiceStatus === activeTab);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Pendente Card */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-amber-500 dark:text-amber-400" />
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {`R$ ${pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pendingProjectsCount} {pendingProjectsCount === 1 ? 'cobrança pendente' : 'cobranças pendentes'}
            </p>
          </CardContent>
        </Card>

        {/* Total Pago Card */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
                              <DollarSign className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {`R$ ${paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {paidProjectsCount} {paidProjectsCount === 1 ? 'cobrança paga' : 'cobranças pagas'}
            </p>
          </CardContent>
        </Card>

        {/* Total de Projetos Card */}
        <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
                              <Download className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
              Total de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalProjectsCount}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {`R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} em valor total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="todos" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-full max-w-md">
          <TabsTrigger 
            value="todos" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
          >
            Todos
          </TabsTrigger>
          <TabsTrigger 
            value="pendente" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
          >
            Pendentes
          </TabsTrigger>
          <TabsTrigger 
            value="parcela1" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
          >
            1ª Parcela
          </TabsTrigger>
          <TabsTrigger 
            value="pago" 
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm rounded-lg transition-all duration-200"
          >
            Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 animate-in fade-in-50 duration-300">
          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {filteredProjects.map((project) => (
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
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{project.status}</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Total:</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">
                                {project.valorProjeto ? `R$ ${parseFloat(project.valorProjeto.toString()).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sob consulta'}
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
              ))}
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
                  {activeTab === 'pago' 
                    ? "Faturas com status 'Pago' só podem ser alteradas por administradores do sistema."
                    : `Não encontramos faturas ${activeTab !== 'todos' ? `com status "${activeTab}"` : ''} para seus projetos.`
                  }
                </p>
                <Button onClick={() => setActiveTab('todos')} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Ver Todas as Faturas
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 