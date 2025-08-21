'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, 
  Building2, 
  Users, 
  CheckCircle, 
  Printer,
  Download,
  Search,
  Zap,
  ChevronsUpDown,
  ArrowUpDown
} from 'lucide-react';

const Icons = {
  DollarSign,
  Building2, 
  Users,
  CheckCircle,
  Printer,
  Download,
  Search,
  Zap,
  ChevronsUpDown,
  ArrowUpDown,
  TrendingUp: ArrowUpDown,
  BarChart3: ArrowUpDown,
  Calendar: ArrowUpDown
};

import { 
  getProjectsWithBilling, 
  updateProjectPayment
} from '@/lib/services/unifiedProjectService';
import { Project } from '@/types/project';
import { generateInvoiceHTML, downloadHTMLAsPDF, generateConsolidatedInvoiceHTML } from '@/lib/utils/pdfGenerator';
import { getConfiguracaoGeral } from '@/lib/services/configService.supabase';
import { getUserDataAdminSupabase } from '@/lib/services/authService.supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import FinancialHistoryPanel from '@/components/financial/FinancialHistoryPanel';

interface ProjectWithBilling extends Project {
  pagamento: 'pendente' | 'parcela1' | 'pago';
  price: number;
  client_name?: string;
  client_id?: string;
  valor_projeto?: number;
  users?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

// Função segura para garantir que apenas strings sejam renderizadas
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Função segura para garantir que apenas números sejam usados em cálculos
const safeNumber = (value: any): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Função segura para formatar moeda
const formatCurrency = (value: any): string => {
  const numValue = safeNumber(value);
  return numValue.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const isProjectFromCurrentMonth = (project: any): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // ✅ CORREÇÃO: Usar created_at (snake_case) ao invés de createdAt (camelCase)
  const createdAt = project?.created_at || project?.createdAt;
  
  if (!project || !createdAt) {
    devLog.log('[isProjectFromCurrentMonth] Projeto sem data:', { 
      id: project?.id, 
      created_at: project?.created_at, 
      createdAt: project?.createdAt 
    });
    return false;
  }
  
  try {
    // Para Firestore (formato com seconds)
    if (createdAt.seconds) {
      const date = new Date(createdAt.seconds * 1000);
      const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      devLog.log('[isProjectFromCurrentMonth] Firestore format:', { 
        projectId: project.id, 
        date: date.toISOString(), 
        isCurrentMonth 
      });
      return isCurrentMonth;
    }
    
    // Para Supabase (formato string ISO)
    if (typeof createdAt === 'string') {
      const date = new Date(createdAt);
      const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      devLog.log('[isProjectFromCurrentMonth] String format:', { 
        projectId: project.id, 
        date: date.toISOString(), 
        isCurrentMonth,
        currentMonth: currentMonth + 1, // +1 porque getMonth() retorna 0-11
        projectMonth: date.getMonth() + 1
      });
      return isCurrentMonth;
    }
    
    // Para Date object
    if (createdAt instanceof Date) {
      const isCurrentMonth = createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
      devLog.log('[isProjectFromCurrentMonth] Date object:', { 
        projectId: project.id, 
        date: createdAt.toISOString(), 
        isCurrentMonth 
      });
      return isCurrentMonth;
    }
  } catch (e) {
    devLog.error('[isProjectFromCurrentMonth] Erro ao processar data:', e, { 
      projectId: project?.id, 
      createdAt 
    });
    return false;
  }
  
  devLog.log('[isProjectFromCurrentMonth] Formato de data não reconhecido:', { 
    projectId: project?.id, 
    createdAt, 
    type: typeof createdAt 
  });
  return false;
};

export default function AdminBillingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cobrancas' | 'historico'>('cobrancas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const [metrics, setMetrics] = useState({
    totalPendingAmount: 0,
    historicalPaidAmount: 0,
    monthlyEstimatedRevenue: 0,
    monthlyActualRevenue: 0,
    pendingProjects: 0,
    pendingClients: 0,
    paidProjects: 0,
    parcela1Projects: 0,
    projectsThisMonth: 0,
    paidProjectsThisMonth: 0
  });
  
  useEffect(() => {
    if (projects.length === 0) return;
    
    // ✅ LOG: Debug para verificar status de pagamento
    devLog.log('[AdminFinanceiro] Calculando métricas - Projetos recebidos:', {
      total: projects.length,
      samplePayments: projects.slice(0, 3).map(p => ({ 
        id: p.id, 
        number: p.number, 
        pagamento: p.pagamento,
        valorProjeto: p.valor_projeto || p.valorProjeto || 0 
      }))
    });
    
    let totalPending = 0;
    let totalPaid = 0;
    let monthlyEstimated = 0;
    let monthlyPaid = 0;
    let pendingCount = 0;
    const pendingClientIds = new Set<string>();
    let paidCount = 0;
    let parcela1Count = 0;
    let currentMonthCount = 0;
    let paidCurrentMonthCount = 0;
    
    projects.forEach(project => {
              const price = project.valor_projeto || project.valorProjeto || 0;
      const isCurrentMonth = isProjectFromCurrentMonth(project);
      
      // ✅ CORREÇÃO: Considerar null/undefined como pendente
      const paymentStatus = project.pagamento || 'pendente';
      
      if (paymentStatus === 'pendente') {
        pendingCount++;
        totalPending += price;
        const clientKey = project.client_id || project.created_by || project.userId || project.empresaIntegradora || 'sem-cliente';
        pendingClientIds.add(String(clientKey));
      } else if (paymentStatus === 'parcela1') {
        parcela1Count++;
        totalPending += price / 2;
        totalPaid += price / 2;
        const clientKey = project.client_id || project.created_by || project.userId || project.empresaIntegradora || 'sem-cliente';
        pendingClientIds.add(String(clientKey));
      } else if (paymentStatus === 'pago') {
        paidCount++;
        totalPaid += price;
      }
      
      if (isCurrentMonth) {
        currentMonthCount++;
        monthlyEstimated += price;
        
        if (paymentStatus === 'pago') {
          paidCurrentMonthCount++;
          monthlyPaid += price;
        } else if (paymentStatus === 'parcela1') {
          monthlyPaid += price / 2;
        }
      }
    });
    
    // ✅ LOG: Debug dos resultados finais
    devLog.log('[AdminFinanceiro] Métricas calculadas:', {
      totalPendingAmount: totalPending,
      pendingProjects: pendingCount,
      paidProjects: paidCount,
      parcela1Projects: parcela1Count
    });
    
    setMetrics({
      totalPendingAmount: totalPending,
      historicalPaidAmount: totalPaid,
      monthlyEstimatedRevenue: monthlyEstimated, 
      monthlyActualRevenue: monthlyPaid,
      pendingProjects: pendingCount,
      pendingClients: pendingClientIds.size,
      paidProjects: paidCount,
      parcela1Projects: parcela1Count,
      projectsThisMonth: currentMonthCount,
      paidProjectsThisMonth: paidCurrentMonthCount
    });
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project => 
        project.number?.toString().toLowerCase().includes(term) ||
        project.empresaIntegradora?.toLowerCase().includes(term) ||
        project.nomeClienteFinal?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [projects, searchTerm]);

  const projectsByClient = useMemo(() => {
    const grouped: Record<string, ProjectWithBilling[]> = {};
    
    filteredProjects.forEach(project => {
      const clientKey = project.empresaIntegradora || project.userId || 'sem-cliente';
      if (!grouped[clientKey]) {
        grouped[clientKey] = [];
      }
      grouped[clientKey].push(project);
    });
    
    return grouped;
  }, [filteredProjects]);

  const getClientName = (clientKey: string): string => {
    // ✅ CORREÇÃO: Garantir que sempre retorne uma string
    if (!clientKey || clientKey === 'undefined' || clientKey === 'sem-cliente') {
      return 'Cliente Não Identificado';
    }
    
    // Se o clientKey já é o nome da empresa integradora, retorna diretamente
    if (clientKey !== 'sem-cliente' && !clientKey.includes('-') && clientKey.length > 8) {
      return safeString(clientKey);
    }
    
    const client = clients.find(c => c.id === clientKey);
    
    if (client) {
      if (client.name && client.name.trim() !== '' && !client.name.includes('@')) {
        return safeString(client.name);
      }
      if (client.companyName && client.companyName.trim() !== '') {
        return safeString(client.companyName);
      }
    }
    
    const projectsForClient = projects.filter(p => p.userId === clientKey);
    
    if (projectsForClient.length > 0) {
      const empresaIntegradora = projectsForClient[0].empresaIntegradora;
      if (empresaIntegradora && empresaIntegradora.trim() !== '') {
        return safeString(empresaIntegradora);
      }
    }
    
    return 'Cliente #' + safeString(clientKey).slice(0, 8);
  };

  const markAsPaid = async (projectId: string) => {
    try {
      toast({
        title: 'Processando pagamento...',
        description: 'Aguarde enquanto atualizamos o status para Pago (integral).',
        variant: 'default',
      });
      
      await updateProjectPayment(projectId, 'pago');
      
      toast({
        title: 'Pagamento integral registrado',
        description: 'O projeto foi marcado como pago integralmente.',
        variant: 'default',
      });
      
      await fetchData(true);
      
      // ✅ CORREÇÃO: Notificar painel sobre atualização de billing
      window.dispatchEvent(new CustomEvent('billing-updated', {
        detail: { action: 'paid', projectId }
      }));
      
    } catch (error) {
      devLog.error('[MarkAsPaid] Error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: 'Ocorreu um erro ao atualizar o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const markAsParcela1 = async (projectId: string) => {
    try {
      toast({
        title: 'Processando parcela...',
        description: 'Aguarde enquanto registramos a primeira parcela.',
        variant: 'default',
      });
      
      await updateProjectPayment(projectId, 'parcela1');
      
      toast({
        title: '1ª Parcela registrada',
        description: 'A primeira parcela foi marcada como paga.',
        variant: 'default',
      });
      
      await fetchData(true);
      
      // ✅ CORREÇÃO: Notificar painel sobre atualização de billing
      window.dispatchEvent(new CustomEvent('billing-updated', {
        detail: { action: 'parcela1', projectId }
      }));
      
    } catch (error) {
      devLog.error('[MarkAsParcela1] Error:', error);
      toast({
        title: 'Erro ao processar parcela',
        description: 'Ocorreu um erro ao registrar a parcela. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const resetPaymentStatus = async (projectId: string) => {
    try {
      toast({
        title: 'Resetando status...',
        description: 'Aguarde enquanto redefinimos o status para pendente.',
        variant: 'default',
      });
      
      await updateProjectPayment(projectId, 'pendente');
      
      toast({
        title: 'Status resetado',
        description: 'O projeto foi marcado como pendente.',
        variant: 'default',
      });
      
      await fetchData(true);
      
      // ✅ CORREÇÃO: Notificar painel sobre atualização de billing
      window.dispatchEvent(new CustomEvent('billing-updated', {
        detail: { action: 'reset', projectId }
      }));
      
    } catch (error) {
      devLog.error('[ResetPaymentStatus] Error:', error);
      toast({
        title: 'Erro ao resetar status',
        description: 'Ocorreu um erro ao redefinir o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const getPaymentStatusBadge = (project: ProjectWithBilling) => {
    // ✅ CORREÇÃO: Considerar null/undefined como pendente
    const paymentStatus = project.pagamento || 'pendente';
    
    if (paymentStatus === 'pago') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          Pago
        </Badge>
      );
    } else if (paymentStatus === 'parcela1') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          1ª Parcela Paga
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
          Pendente
        </Badge>
      );
    }
  };

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      devLog.log('[fetchData] Iniciando busca de dados financeiros...');
      
      // Buscar projetos
      const projectsData = await getProjectsWithBilling();
      devLog.log('[fetchData] Projetos recebidos:', projectsData?.length || 0);
      
      if (projectsData) {
        setProjects(projectsData);
        
        // Extrair clientes únicos dos projetos
        const uniqueClients = projectsData.reduce((acc: any[], project) => {
          if (project.client_id && !acc.find(c => c.id === project.client_id)) {
            acc.push({
              id: project.client_id,
              name: project.client_name || 'Cliente sem nome',
              email: project.client_email || 'N/A'
            });
          }
          return acc;
        }, []);
        
        devLog.log('[fetchData] Clientes únicos extraídos:', uniqueClients.length);
        setClients(uniqueClients);
      }
      
    } catch (error) {
      devLog.error('[fetchData] Error:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Ocorreu um erro ao carregar os dados financeiros.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (project: any) => {
    try {
      setIsGeneratingInvoice(true);
      
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

      // Buscar perfil completo do cliente (empresa integradora) para dados corretos
      const clientId = project.client_id || project.userId || project.owner_id || project.user_id;
      // Buscar via API (evita falha em ambientes sem Service Role durante build)
      let clientProfile = null as any;
      if (clientId) {
        try {
          const res = await fetch(`/api/admin/users/${clientId}`);
          const json = await res.json();
          if (json?.success) clientProfile = json.data;
        } catch {}
        if (!clientProfile) {
          clientProfile = await getUserDataAdminSupabase(clientId).catch(() => null);
        }
      }
      
      const userData = {
        name: clientProfile?.name || project.client_name || 'Cliente',
        email: clientProfile?.email || project.client_email || 'N/A',
        phone: clientProfile?.phone || project.client_phone || 'N/A',
        isCompany: clientProfile?.isCompany,
        companyName: clientProfile?.companyName,
        cnpj: clientProfile?.cnpj,
        cpf: clientProfile?.cpf,
        userData: clientProfile // incluir estrutura completa para o gerador
      };
      
      const formattedPrice = formatCurrency(project.valor_projeto || project.valorProjeto || 0);
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
      // Carregar dados bancários via API admin (espelha preferências)
      let dadosBancarios: any = undefined;
      try {
        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (json?.success && (json?.data?.dados_bancarios || json?.data?.dadosBancarios)) {
          dadosBancarios = normalizeDadosBancarios(json.data);
        }
      } catch {}
      if (!dadosBancarios) {
        const adminConfig = await getConfiguracaoGeral();
        dadosBancarios = normalizeDadosBancarios(adminConfig);
      }

      const invoiceHTML = generateInvoiceHTML(
        project,
        userData,
        formattedPrice,
        project.valor_projeto || project.valorProjeto || 0,
        issueDate,
        dueDate,
        dadosBancarios
      );
      
      await downloadHTMLAsPDF(invoiceHTML, `fatura-${project.number}.pdf`);
      
      toast({
        title: 'Fatura gerada',
        description: 'A fatura foi baixada com sucesso.',
        variant: 'default',
      });
      
    } catch (error) {
      devLog.error('[handleDownloadInvoice] Error:', error);
      toast({
        title: 'Erro ao gerar fatura',
        description: 'Ocorreu um erro ao gerar a fatura.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleDownloadCompleteBillingInvoice = async (clientId: string, projects: ProjectWithBilling[]) => {
    try {
      setIsGeneratingInvoice(true);
      
      const clientName = getClientName(clientId);

      // Descobrir o ID real do cliente a partir da lista de projetos (evita passar nome da empresa)
      const inferredClientId = (projects[0] as any)?.client_id || (projects[0] as any)?.userId || (projects[0] as any)?.users?.id || clientId;
      let clientProfile = null as any;
      if (inferredClientId) {
        try {
          const res = await fetch(`/api/admin/users/${inferredClientId}`);
          const json = await res.json();
          if (json?.success) clientProfile = json.data;
        } catch {}
        if (!clientProfile) {
          clientProfile = await getUserDataAdminSupabase(inferredClientId).catch(() => null);
        }
      }
      const userData = {
        name: clientProfile?.companyName || clientProfile?.name || clientName,
        email: clientProfile?.email || 'N/A',
        phone: clientProfile?.phone || 'N/A',
        isCompany: clientProfile?.isCompany,
        companyName: clientProfile?.companyName,
        cnpj: clientProfile?.cnpj,
        cpf: clientProfile?.cpf,
        userData: clientProfile
      };
      
      // Mapear projetos para incluir valor pendente por projeto
      const projectsWithPending = projects.map((p) => {
        const raw = (p as any).valor_projeto ?? (p as any).valorProjeto ?? 0;
        const paymentStatus = (p as any).pagamento || (p as any).invoiceStatus || 'pendente';
        const valueNum = typeof raw === 'number' ? raw : parseFloat(String(raw));
        const pending = paymentStatus === 'pago' ? 0 : paymentStatus === 'parcela1' ? valueNum / 2 : valueNum;
        const pendingAmountFormatted = pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        return { ...p, pendingAmountFormatted } as any;
      });

      // Total consolidado (somatório do valor pendente dos projetos)
      const totalPending = projectsWithPending.reduce((sum, p: any) => {
        const formatted = p.pendingAmountFormatted?.replace(/\./g, '').replace(',', '.') || '0';
        return sum + parseFloat(formatted);
      }, 0);
      const formattedPrice = totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date().toISOString().split('T')[0];
      
      // Função utilitária também acessível aqui
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

      // Dados bancários para fatura consolidada
      let dadosBancarios2: any = undefined;
      try {
        const res = await fetch('/api/admin/config');
        const json = await res.json();
        if (json?.success && (json?.data?.dados_bancarios || json?.data?.dadosBancarios)) {
          dadosBancarios2 = normalizeDadosBancarios(json.data);
        }
      } catch {}
      if (!dadosBancarios2) {
        const adminConfig2 = await getConfiguracaoGeral();
        dadosBancarios2 = normalizeDadosBancarios(adminConfig2);
      }

      const invoiceHTML = generateConsolidatedInvoiceHTML(
        projectsWithPending,
        userData,
        formattedPrice,
        totalPending,
        issueDate,
        dueDate,
        dadosBancarios2
      );
      
      await downloadHTMLAsPDF(invoiceHTML, `fatura-completa-${clientName}.pdf`);
      
      toast({
        title: 'Fatura completa gerada',
        description: 'A fatura consolidada foi baixada com sucesso.',
        variant: 'default',
      });
      
    } catch (error) {
      devLog.error('[handleDownloadCompleteBillingInvoice] Error:', error);
      toast({
        title: 'Erro ao gerar fatura completa',
        description: 'Ocorreu um erro ao gerar a fatura consolidada.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // ✅ SEGUINDO O PADRÃO DAS OUTRAS PÁGINAS ADMIN: Sem verificação desnecessária
  useEffect(() => {
    async function loadData() {
      await fetchData();
    }
    
    loadData();
  }, []);

  return (
    <div className="">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg mb-8">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            Financeiro
          </h1>
          <p className="mt-1 text-blue-100 opacity-90">
            Gerenciamento Financeiro
          </p>
        </div>
        
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30"></div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('cobrancas')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'cobrancas'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Cobranças
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'historico'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Histórico Financeiro
          </button>
        </nav>
      </div>

      {activeTab === 'cobrancas' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
                  Total Pendente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.totalPendingAmount)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {safeString(metrics.pendingProjects)} cobranças pendentes
                  {metrics.parcela1Projects > 0 && 
                    ` + ${safeString(metrics.parcela1Projects)} com 1ª parcela paga`}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                  Clientes com Pendências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {safeString(metrics.pendingClients)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  De um total de {safeString(clients.length || 0)} clientes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center whitespace-nowrap">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-teal-500 dark:text-teal-400" />
                  Cobranças Pagas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {safeString(metrics.paidProjects + metrics.parcela1Projects)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatCurrency(
                    projects
                    .filter(p => {
                      const paymentStatus = p.pagamento || 'pendente';
                      return paymentStatus === 'pago';
                    })
                      .reduce((total, project) => total + (project.valor_projeto || project.valorProjeto || 0), 0) +
                    projects
                      .filter(p => {
                        const paymentStatus = p.pagamento || 'pendente';
                        return paymentStatus === 'parcela1';
                      })
                      .reduce((total, project) => total + (project.valor_projeto || project.valorProjeto || 0) / 2, 0)
                  )}
                  {metrics.parcela1Projects > 0 && (
                    <span className="block mt-1 text-xs text-blue-500">
                      {safeString(metrics.paidProjects)} projetos integrais + {safeString(metrics.parcela1Projects)} com parcela paga
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-purple-500 dark:text-purple-400" />
                  Histórico de Faturamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.historicalPaidAmount)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total de {safeString(metrics.paidProjects + metrics.parcela1Projects)} projetos com pagamentos ({safeString(metrics.paidProjects)} integrais + {safeString(metrics.parcela1Projects)} parciais)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-blue-500 dark:text-blue-400" />
                  Faturamento Mensal Estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.monthlyEstimatedRevenue)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Baseado em {safeString(metrics.projectsThisMonth)} projetos deste mês
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Icons.DollarSign className="h-5 w-5 mr-2 text-green-500 dark:text-green-400" />
                  Faturamento Mensal Real
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(metrics.monthlyActualRevenue)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {safeString(metrics.paidProjectsThisMonth)} projetos com pagamentos neste mês ({safeString(metrics.paidProjectsThisMonth)} integrais + {safeString(metrics.parcela1Projects)} parciais)
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente, número do projeto..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : Object.keys(projectsByClient).length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-0 shadow-md">
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-6 mt-2">
                  <Icons.DollarSign className="h-10 w-10 text-gray-400 dark:text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Nenhuma cobrança encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Não há cobranças que correspondam aos filtros selecionados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {Object.entries(projectsByClient).map(([clientKey, clientProjects]) => (
                <Card key={clientKey} className="bg-white dark:bg-gray-800 border-0 shadow-md mb-6">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/80 dark:to-transparent border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                          <Icons.Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            {getClientName(clientKey)}
                          </CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {safeString(clientProjects.length)} {clientProjects.length === 1 ? 'projeto' : 'projetos'} • 
                            {formatCurrency(clientProjects
                              .reduce((total, project) => total + (project.valor_projeto || project.valorProjeto || 0), 0))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                          onClick={() => handleDownloadCompleteBillingInvoice(clientKey, clientProjects)}
                          disabled={isGeneratingInvoice}
                        >
                          <Icons.Download className="h-4 w-4" />
                          Baixar fatura completa
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/80 hover:bg-gray-50/80 dark:bg-gray-700/50 dark:hover:bg-gray-700/50">
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300 w-[100px]">
                              Número
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Empresa Integradora
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Cliente Final
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Potência
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Status
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Valor
                            </TableHead>
                            <TableHead className="font-semibold text-gray-700 dark:text-gray-300">
                              Situação
                            </TableHead>
                            <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-300">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {clientProjects.map((project) => (
                            <TableRow key={project.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/40">
                              <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                {safeString(project.number)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 flex items-center justify-center flex-shrink-0">
                                    <Icons.Building2 className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                                  </div>
                                  <span className="text-gray-700 dark:text-gray-300">{safeString(project.empresaIntegradora) || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800 flex items-center justify-center flex-shrink-0">
                                    <Icons.Users className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
                                  </div>
                                  <span className="text-gray-700 dark:text-gray-300">{safeString(project.nomeClienteFinal) || 'N/A'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icons.Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                  <span className="text-gray-700 dark:text-gray-300">{safeString(project.potencia)}kWp</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                  {safeString(project.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(project.valor_projeto || project.valorProjeto || 0)}
                              </TableCell>
                              <TableCell>
                                {getPaymentStatusBadge(project)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="flex items-center gap-1.5 px-3 py-1.5 h-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-800/50 transition-all duration-200"
                                    onClick={() => handleDownloadInvoice(project)}
                                    disabled={isGeneratingInvoice}
                                    title="Baixar fatura individual"
                                  >
                                    <Icons.Printer className="h-4 w-4" />
                                    <span className="text-xs font-medium">Fatura</span>
                                  </Button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm">
                                        <Icons.DollarSign className="h-4 w-4 mr-1" /> 
                                        Pagamento <Icons.ChevronsUpDown className="h-4 w-4 ml-1" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {/* ✅ CORREÇÃO: Usar paymentStatus normalizado */}
                                      {(() => {
                                        const paymentStatus = project.pagamento || 'pendente';
                                        return (
                                          <>
                                            {paymentStatus !== 'parcela1' && paymentStatus !== 'pago' && (
                                              <DropdownMenuItem onClick={() => markAsParcela1(project.id)}>
                                                Marcar 1ª Parcela como Paga
                                              </DropdownMenuItem>
                                            )}
                                            {paymentStatus === 'parcela1' && (
                                              <DropdownMenuItem onClick={() => markAsPaid(project.id)}>
                                                Marcar 2ª Parcela como Paga
                                              </DropdownMenuItem>
                                            )}
                                            {paymentStatus !== 'pago' && (
                                              <DropdownMenuItem onClick={() => markAsPaid(project.id)}>
                                                Marcar como Pago (Integral)
                                              </DropdownMenuItem>
                                            )}
                                          </>
                                        );
                                      })()}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => resetPaymentStatus(project.id)}>
                                        Redefinir para Pendente
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historico' && (
        <FinancialHistoryPanel />
      )}
    </div>
  );
}
