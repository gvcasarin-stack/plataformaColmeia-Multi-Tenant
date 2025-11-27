'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { TrialExpiredTabBlocker } from '@/components/security/TrialExpiredTabBlocker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
  ArrowUpDown,
  X,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  FileText,
  CircleDollarSign,
  CalendarCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  X,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
  FileText,
  CircleDollarSign,
  CalendarCheck
};

import {
  getProjectsWithBilling,
  updateProjectPayment
} from '@/lib/services/unifiedProjectService';
import { Project } from '@/types/project';
import { generateInvoiceHTML, downloadHTMLAsPDF, generateConsolidatedInvoiceHTML } from '@/lib/utils/pdfGenerator';
import { getConfiguracaoGeral } from '@/lib/services/configService.supabase';
import { getUserDataAdminSupabase } from '@/lib/services/authService.supabase';

// ✅ Mapa de slugs para nomes legíveis (fallback se status não for encontrado em availableStatuses)
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

const getStatusDisplayName = (slug: string): string => statusSlugToName[slug] || slug;
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// 🆕 CORREÇÃO: Verificar se projeto foi criado no mês atual (para Faturamento Mensal Estimado)
const isProjectFromCurrentMonth = (project: any): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const createdAt = project?.created_at || project?.createdAt;

  if (!project || !createdAt) {
    return false;
  }

  try {
    // Para Firestore (formato com seconds)
    if (createdAt.seconds) {
      const date = new Date(createdAt.seconds * 1000);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }

    // Para Supabase (formato string ISO)
    if (typeof createdAt === 'string') {
      const date = new Date(createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }

    // Para Date object
    if (createdAt instanceof Date) {
      return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
    }
  } catch (e) {
    devLog.error('[isProjectFromCurrentMonth] Erro ao processar data:', e);
    return false;
  }

  return false;
};

// 🆕 CORREÇÃO: Verificar se pagamento foi realizado no mês atual (para Faturamento Mensal Real)
const isPaymentFromCurrentMonth = (project: any): boolean => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const paymentStatus = project.pagamento || 'pendente';

  // Não contabilizar projetos pendentes
  if (paymentStatus === 'pendente') {
    return false;
  }

  // Verificar data do pagamento conforme o status
  let paymentDate = null;

  if (paymentStatus === 'pago' && project.data_pagamento_integral) {
    paymentDate = project.data_pagamento_integral;
  } else if (paymentStatus === 'parcela1' && project.data_pagamento_parcela1) {
    paymentDate = project.data_pagamento_parcela1;
  }

  // Se não tem data de pagamento registrada, não contabilizar
  if (!paymentDate) {
    return false;
  }

  try {
    const date = new Date(paymentDate);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  } catch (e) {
    devLog.error('[isPaymentFromCurrentMonth] Erro ao processar data de pagamento:', e);
    return false;
  }
};

export default function AdminBillingPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ✅ Verificar permissão de acesso
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};
  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
  const canViewFinancials = isFullAdmin || userPermissions.can_view_financials === true;

  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]); // Transações do mês atual
  const [allTransactions, setAllTransactions] = useState<any[]>([]); // Todas as transações históricas
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cobrancas' | 'historico'>('cobrancas');
  const [billingModeTab, setBillingModeTab] = useState<'avulsos' | 'pacotes' | 'assinaturas'>('avulsos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  // ✅ ESTADOS PARA PACOTES E ASSINATURAS
  const [clientePacotes, setClientePacotes] = useState<any[]>([]);
  const [clienteAssinaturas, setClienteAssinaturas] = useState<any[]>([]);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [loadingAssinaturas, setLoadingAssinaturas] = useState(false);

  // ✅ NOVOS FILTROS
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

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

  // Estados para seleção de projetos
  const [isSelectionMode, setIsSelectionMode] = useState<Record<string, boolean>>({});
  const [selectedProjects, setSelectedProjects] = useState<Record<string, Set<string>>>({});

  // Funções para gerenciar seleção de projetos
  const toggleProjectSelection = (clientKey: string, projectId: string) => {
    setSelectedProjects(prev => {
      const clientSelections = prev[clientKey] || new Set();
      const newSelections = new Set(clientSelections);
      
      if (newSelections.has(projectId)) {
        newSelections.delete(projectId);
      } else {
        newSelections.add(projectId);
      }
      
      return {
        ...prev,
        [clientKey]: newSelections
      };
    });
  };

  const getSelectedCount = (clientKey: string): number => {
    return selectedProjects[clientKey]?.size || 0;
  };

  const cancelSelection = (clientKey: string) => {
    setIsSelectionMode(prev => ({
      ...prev,
      [clientKey]: false
    }));
    setSelectedProjects(prev => ({
      ...prev,
      [clientKey]: new Set()
    }));
  };

  // ✅ Buscar pacotes de clientes
  const loadClientePacotes = async () => {
    try {
      setLoadingPacotes(true);
      const response = await fetch('/api/admin/cliente-pacotes');
      const result = await response.json();

      if (result.success) {
        setClientePacotes(result.data || []);
        devLog.log('[AdminFinanceiro] Pacotes carregados:', result.data?.length || 0);
      }
    } catch (error) {
      devLog.error('[AdminFinanceiro] Erro ao carregar pacotes:', error);
      setClientePacotes([]);
    } finally {
      setLoadingPacotes(false);
    }
  };

  // ✅ Buscar assinaturas de clientes
  const loadClienteAssinaturas = async () => {
    try {
      setLoadingAssinaturas(true);
      const response = await fetch('/api/admin/cliente-assinaturas');
      const result = await response.json();

      if (result.success) {
        setClienteAssinaturas(result.data || []);
        devLog.log('[AdminFinanceiro] Assinaturas carregadas:', result.data?.length || 0);
      }
    } catch (error) {
      devLog.error('[AdminFinanceiro] Erro ao carregar assinaturas:', error);
      setClienteAssinaturas([]);
    } finally {
      setLoadingAssinaturas(false);
    }
  };

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setStatusLoading(true);
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[AdminFinanceiro] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[AdminFinanceiro] Erro ao carregar status:', error);
        // Em caso de erro, manter vazio para usar fallback
        setAvailableStatuses([]);
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatuses();
  }, []);

  // ✅ Carregar dados de pacotes/assinaturas quando trocar de tab
  useEffect(() => {
    if (billingModeTab === 'pacotes' && clientePacotes.length === 0) {
      loadClientePacotes();
    } else if (billingModeTab === 'assinaturas' && clienteAssinaturas.length === 0) {
      loadClienteAssinaturas();
    }
  }, [billingModeTab]);

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
      })),
      allTransactionsCount: allTransactions.length,
      transactionsThisMonthCount: transactions.length,
      fixedCostsCount: fixedCosts.length
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

      // 🆕 CORREÇÃO: Faturamento Mensal Estimado baseado em projetos criados este mês
      if (isCurrentMonth) {
        currentMonthCount++;
        monthlyEstimated += price;
      }

      // 🆕 CORREÇÃO: Faturamento Mensal Real baseado em pagamentos realizados este mês
      const isPaymentThisMonth = isPaymentFromCurrentMonth(project);
      if (isPaymentThisMonth) {
        if (paymentStatus === 'pago') {
          paidCurrentMonthCount++;
          monthlyPaid += price;
        } else if (paymentStatus === 'parcela1') {
          monthlyPaid += price / 2;
        }
      }
    });

    // 🆕 ADICIONAR: Receitas de transações históricas ao Histórico de Faturamento
    const historicalTransactionRevenue = allTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    totalPaid += historicalTransactionRevenue;

    // 🆕 ADICIONAR: Receitas de transações do mês atual ao Faturamento Mensal Real
    const monthlyTransactionRevenue = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    monthlyPaid += monthlyTransactionRevenue;

    // 🆕 SUBTRAIR: Despesas variáveis do mês atual do Faturamento Mensal Real
    const monthlyVariableExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    monthlyPaid -= monthlyVariableExpenses;

    // 🆕 SUBTRAIR: Custos fixos do mês atual do Faturamento Mensal Real
    const monthlyFixedExpenses = fixedCosts
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    monthlyPaid -= monthlyFixedExpenses;

    // ✅ LOG: Debug dos resultados finais
    devLog.log('[AdminFinanceiro] Métricas calculadas:', {
      totalPendingAmount: totalPending,
      pendingProjects: pendingCount,
      paidProjects: paidCount,
      parcela1Projects: parcela1Count,
      historicalPaidAmount: totalPaid,
      historicalTransactionRevenue,
      monthlyActualRevenue: monthlyPaid,
      monthlyTransactionRevenue,
      monthlyVariableExpenses,
      monthlyFixedExpenses
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
  }, [projects, transactions, allTransactions, fixedCosts]);

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // ✅ Filtro por modalidade de cobrança (billing mode)
    if (billingModeTab === 'avulsos') {
      // Mostrar apenas projetos avulsos (billing_mode null, undefined ou 'avulso')
      filtered = filtered.filter(project =>
        !project.billing_mode || project.billing_mode === 'avulso'
      );
    } else if (billingModeTab === 'pacotes') {
      // Mostrar apenas projetos de pacotes
      filtered = filtered.filter(project => project.billing_mode === 'pacote');
    } else if (billingModeTab === 'assinaturas') {
      // Mostrar apenas projetos de assinaturas
      filtered = filtered.filter(project => project.billing_mode === 'assinatura');
    }

    // Filtro de busca por texto
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.number?.toString().toLowerCase().includes(term) ||
        project.empresaIntegradora?.toLowerCase().includes(term) ||
        project.nomeClienteFinal?.toLowerCase().includes(term)
      );
    }

    // ✅ Filtro por cliente
    if (selectedClient && selectedClient !== 'all') {
      filtered = filtered.filter(project => {
        const clientKey = project.empresaIntegradora || project.userId || 'sem-cliente';
        return clientKey === selectedClient;
      });
    }

    // ✅ Filtro por situação de pagamento
    if (selectedPaymentStatus && selectedPaymentStatus !== 'all') {
      filtered = filtered.filter(project => {
        const paymentStatus = project.pagamento || 'pendente';
        return paymentStatus === selectedPaymentStatus;
      });
    }

    // ✅ Filtro por status do projeto
    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(project => project.status === selectedStatus);
    }

    return filtered;
  }, [projects, searchTerm, selectedClient, selectedPaymentStatus, selectedStatus, billingModeTab]);

  // ✅ Função para obter nome do cliente (precisa estar antes dos useMemo que a usam)
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

  // ✅ Obter lista única de clientes para o filtro
  const uniqueClients = useMemo(() => {
    const clientMap = new Map<string, string>();

    projects.forEach(project => {
      const clientKey = project.empresaIntegradora || project.userId || 'sem-cliente';
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, getClientName(clientKey));
      }
    });

    return Array.from(clientMap.entries()).map(([key, name]) => ({ key, name }));
  }, [projects]);

  // ✅ Função para limpar todos os filtros
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedClient('');
    setSelectedPaymentStatus('');
    setSelectedStatus('');
  };

  // ✅ Verificar se há algum filtro ativo
  const hasActiveFilters = searchTerm || selectedClient || selectedPaymentStatus || selectedStatus;

  // ✅ Função para exportar dados para Excel
  const exportToExcel = () => {
    try {
      // Obter dados filtrados
      const dataToExport = filteredProjects.map(project => {
        // Buscar o status real
        const projectStatus = availableStatuses.find(s => s.slug === project.status);
        const statusName = projectStatus?.name || getStatusDisplayName(project.status);

        // Normalizar status de pagamento
        const paymentStatus = project.pagamento || 'pendente';
        let situacao = '';
        if (paymentStatus === 'pago') {
          situacao = 'Pago';
        } else if (paymentStatus === 'parcela1') {
          situacao = '1ª Parcela Paga';
        } else {
          situacao = 'Pendente';
        }

        return {
          'Número': safeString(project.number),
          'Empresa Integradora': safeString(project.empresaIntegradora) || 'N/A',
          'Cliente Final': safeString(project.nomeClienteFinal) || 'N/A',
          'Potência (kWp)': safeString(project.potencia),
          'Status': statusName,
          'Valor': formatCurrency(project.valor_projeto || project.valorProjeto || 0),
          'Situação': situacao
        };
      });

      // Criar worksheet
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);

      // Ajustar largura das colunas
      const columnWidths = [
        { wch: 15 }, // Número
        { wch: 30 }, // Empresa Integradora
        { wch: 30 }, // Cliente Final
        { wch: 15 }, // Potência
        { wch: 20 }, // Status
        { wch: 15 }, // Valor
        { wch: 20 }  // Situação
      ];
      worksheet['!cols'] = columnWidths;

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Financeiros');

      // Obter tenant name do usuário
      const tenantName = user?.profile?.company_name || user?.profile?.name || 'tenant';
      const sanitizedTenantName = tenantName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

      // Gerar nome do arquivo com data
      const date = new Date().toISOString().split('T')[0];
      const fileName = `financeiro_${sanitizedTenantName}_${date}.xlsx`;

      // Download do arquivo
      XLSX.writeFile(workbook, fileName);

      toast({
        title: 'Exportação concluída',
        description: `${dataToExport.length} registros exportados com sucesso.`,
        variant: 'default',
      });

    } catch (error) {
      devLog.error('[exportToExcel] Erro:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao exportar os dados para Excel.',
        variant: 'destructive',
      });
    }
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

  // 🆕 FUNÇÕES DE PAGAMENTO PARA PACOTES
  const markPacoteAsPaid = async (pacoteId: string) => {
    try {
      toast({
        title: 'Processando pagamento...',
        description: 'Aguarde enquanto atualizamos o status para Pago (integral).',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-pacotes/${pacoteId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pago' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: 'Pagamento integral registrado',
        description: 'O pacote foi marcado como pago integralmente.',
        variant: 'default',
      });

      await loadClientePacotes();

    } catch (error) {
      devLog.error('[MarkPacoteAsPaid] Error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: 'Ocorreu um erro ao atualizar o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const markPacoteAsParcela1 = async (pacoteId: string) => {
    try {
      toast({
        title: 'Processando parcela...',
        description: 'Aguarde enquanto registramos a primeira parcela.',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-pacotes/${pacoteId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'parcela1' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: '1ª Parcela registrada',
        description: 'A primeira parcela foi marcada como paga.',
        variant: 'default',
      });

      await loadClientePacotes();

    } catch (error) {
      devLog.error('[MarkPacoteAsParcela1] Error:', error);
      toast({
        title: 'Erro ao processar parcela',
        description: 'Ocorreu um erro ao registrar a parcela. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const resetPacotePaymentStatus = async (pacoteId: string) => {
    try {
      toast({
        title: 'Resetando status...',
        description: 'Aguarde enquanto redefinimos o status para pendente.',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-pacotes/${pacoteId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pendente' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: 'Status resetado',
        description: 'O pacote foi marcado como pendente.',
        variant: 'default',
      });

      await loadClientePacotes();

    } catch (error) {
      devLog.error('[ResetPacotePaymentStatus] Error:', error);
      toast({
        title: 'Erro ao resetar status',
        description: 'Ocorreu um erro ao redefinir o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // 🆕 FUNÇÕES DE PAGAMENTO PARA ASSINATURAS
  const markAssinaturaAsPaid = async (assinaturaId: string) => {
    try {
      toast({
        title: 'Processando pagamento...',
        description: 'Aguarde enquanto atualizamos o status para Pago (integral).',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-assinaturas/${assinaturaId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pago' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: 'Pagamento integral registrado',
        description: 'A assinatura foi marcada como paga integralmente.',
        variant: 'default',
      });

      await fetchAssinaturas();

    } catch (error) {
      devLog.error('[MarkAssinaturaAsPaid] Error:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: 'Ocorreu um erro ao atualizar o status. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const markAssinaturaAsParcela1 = async (assinaturaId: string) => {
    try {
      toast({
        title: 'Processando parcela...',
        description: 'Aguarde enquanto registramos a primeira parcela.',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-assinaturas/${assinaturaId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'parcela1' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: '1ª Parcela registrada',
        description: 'A primeira parcela foi marcada como paga.',
        variant: 'default',
      });

      await fetchAssinaturas();

    } catch (error) {
      devLog.error('[MarkAssinaturaAsParcela1] Error:', error);
      toast({
        title: 'Erro ao processar parcela',
        description: 'Ocorreu um erro ao registrar a parcela. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const resetAssinaturaPaymentStatus = async (assinaturaId: string) => {
    try {
      toast({
        title: 'Resetando status...',
        description: 'Aguarde enquanto redefinimos o status para pendente.',
        variant: 'default',
      });

      const response = await fetch(`/api/admin/cliente-assinaturas/${assinaturaId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'pendente' })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');

      toast({
        title: 'Status resetado',
        description: 'A assinatura foi marcada como pendente.',
        variant: 'default',
      });

      await fetchAssinaturas();

    } catch (error) {
      devLog.error('[ResetAssinaturaPaymentStatus] Error:', error);
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

      // Buscar transações e custos fixos via API financial/dashboard
      if (user?.id) {
        try {
          const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
          const headers = await createTenantHeaders(user.id);

          // Buscar dados do mês atual
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1;
          const currentYear = currentDate.getFullYear();

          const response = await fetch(`/api/financial/dashboard?month=${currentMonth}&year=${currentYear}`, {
            headers
          });

          if (response.ok) {
            const financialData = await response.json();
            devLog.log('[fetchData] Dados financeiros do mês atual recebidos:', {
              transactions: financialData.transactions?.length || 0,
              fixedCosts: financialData.fixedCosts?.length || 0
            });

            setTransactions(financialData.transactions || []);
            setFixedCosts(financialData.fixedCosts || []);
          }

          // Buscar TODAS as transações históricas (sem filtro de data) via API direta
          const allTransactionsResponse = await fetch('/api/financial/transactions', {
            headers
          });

          if (allTransactionsResponse.ok) {
            const allTransactionsData = await allTransactionsResponse.json();
            devLog.log('[fetchData] Todas as transações históricas recebidas:', allTransactionsData?.length || 0);
            setAllTransactions(allTransactionsData || []);
          }
        } catch (error) {
          devLog.error('[fetchData] Erro ao buscar dados financeiros:', error);
          // Não bloquear se falhar, apenas não terá dados extras
          setTransactions([]);
          setAllTransactions([]);
          setFixedCosts([]);
        }
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
        // Campos do banco (snake_case)
        is_company: clientProfile?.is_company,
        company_name: clientProfile?.company_name,
        cnpj: clientProfile?.cnpj,
        cpf: clientProfile?.cpf,
        // Campos compatibilidade (camelCase)
        isCompany: clientProfile?.is_company || clientProfile?.isCompany,
        companyName: clientProfile?.company_name || clientProfile?.companyName,
        userData: clientProfile // incluir estrutura completa para o gerador
      };
      
      const formattedPrice = formatCurrency(project.valor_projeto || project.valorProjeto || 0);
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      // ✅ CORREÇÃO: Buscar nome real do status do tenant antes de gerar PDF
      const projectStatus = availableStatuses.find(s => s.slug === project.status);
      const statusName = projectStatus?.name || getStatusDisplayName(project.status);

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
        dadosBancarios,
        statusName // ✅ NOVO: Passar nome real do status
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

  // 🆕 FUNÇÃO DE GERAÇÃO DE FATURA PARA PACOTES
  const handleDownloadPacoteInvoice = async (pacote: any) => {
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

      const cliente = pacote.users;
      const pacoteDefinicao = pacote.pacotes_definicoes;

      const userData = {
        name: cliente?.name || 'Cliente',
        email: cliente?.email || 'N/A',
        phone: cliente?.phone || 'N/A',
        is_company: cliente?.is_company,
        company_name: cliente?.company_name,
        cnpj: cliente?.cnpj,
        cpf: cliente?.cpf,
        isCompany: cliente?.is_company || cliente?.isCompany,
        companyName: cliente?.company_name || cliente?.companyName,
        userData: cliente
      };

      const formattedPrice = formatCurrency(pacoteDefinicao?.valor || 0);
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      // Carregar dados bancários (mesma fonte que projetos avulsos)
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

      // Criar objeto fake de "projeto" para reutilizar o gerador de invoice
      const fakePacoteProject = {
        number: `PACOTE-${pacote.id.substring(0, 8).toUpperCase()}`,
        empresaIntegradora: cliente?.company_name || cliente?.name || 'Cliente',
        nomeClienteFinal: pacoteDefinicao?.nome || 'Pacote de Projetos',
        potenciakWp: `${pacote.projetos_inclusos} projetos inclusos`,
        status: pacote.status,
        valorProjeto: pacoteDefinicao?.valor || 0,
        valor_projeto: pacoteDefinicao?.valor || 0,
      };

      const invoiceHTML = generateInvoiceHTML(
        fakePacoteProject,
        userData,
        formattedPrice,
        pacoteDefinicao?.valor || 0,
        issueDate,
        dueDate,
        dadosBancarios,
        'Pacote de Projetos'
      );

      await downloadHTMLAsPDF(invoiceHTML, `fatura-pacote-${pacote.id.substring(0, 8)}.pdf`);

      toast({
        title: 'Fatura gerada',
        description: 'A fatura do pacote foi baixada com sucesso.',
        variant: 'default',
      });

    } catch (error) {
      devLog.error('[handleDownloadPacoteInvoice] Error:', error);
      toast({
        title: 'Erro ao gerar fatura',
        description: 'Ocorreu um erro ao gerar a fatura do pacote.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // 🆕 FUNÇÃO DE GERAÇÃO DE FATURA PARA ASSINATURAS
  const handleDownloadAssinaturaInvoice = async (assinatura: any) => {
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

      const cliente = assinatura.users;
      const plano = assinatura.planos_assinatura;

      const userData = {
        name: cliente?.name || 'Cliente',
        email: cliente?.email || 'N/A',
        phone: cliente?.phone || 'N/A',
        is_company: cliente?.is_company,
        company_name: cliente?.company_name,
        cnpj: cliente?.cnpj,
        cpf: cliente?.cpf,
        isCompany: cliente?.is_company || cliente?.isCompany,
        companyName: cliente?.company_name || cliente?.companyName,
        userData: cliente
      };

      const formattedPrice = formatCurrency(plano?.valor_mensal || 0);
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

      // Carregar dados bancários (mesma fonte que projetos avulsos)
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

      // Criar objeto fake de "projeto" para reutilizar o gerador de invoice
      const fakeAssinaturaProject = {
        number: `ASSINATURA-${assinatura.id.substring(0, 8).toUpperCase()}`,
        empresaIntegradora: cliente?.company_name || cliente?.name || 'Cliente',
        nomeClienteFinal: plano?.nome || 'Assinatura Mensal',
        potenciakWp: `${assinatura.projetos_mensais} projetos/mês`,
        status: assinatura.status,
        valorProjeto: plano?.valor_mensal || 0,
        valor_projeto: plano?.valor_mensal || 0,
      };

      const invoiceHTML = generateInvoiceHTML(
        fakeAssinaturaProject,
        userData,
        formattedPrice,
        plano?.valor_mensal || 0,
        issueDate,
        dueDate,
        dadosBancarios,
        'Assinatura Mensal'
      );

      await downloadHTMLAsPDF(invoiceHTML, `fatura-assinatura-${assinatura.id.substring(0, 8)}.pdf`);

      toast({
        title: 'Fatura gerada',
        description: 'A fatura da assinatura foi baixada com sucesso.',
        variant: 'default',
      });

    } catch (error) {
      devLog.error('[handleDownloadAssinaturaInvoice] Error:', error);
      toast({
        title: 'Erro ao gerar fatura',
        description: 'Ocorreu um erro ao gerar a fatura da assinatura.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleActivateSelectionMode = (clientId: string) => {
    setIsSelectionMode(prev => ({
      ...prev,
      [clientId]: true
    }));
  };

  const handleDownloadSelectedInvoice = async (clientId: string, allProjects: ProjectWithBilling[]) => {
    try {
      setIsGeneratingInvoice(true);
      
      // Filtrar apenas os projetos selecionados
      const selectedProjectIds = selectedProjects[clientId] || new Set();
      const projects = allProjects.filter(project => selectedProjectIds.has(project.id));
      
      if (projects.length === 0) {
        toast({
          title: 'Nenhum projeto selecionado',
          description: 'Selecione pelo menos um projeto para gerar a fatura.',
          variant: 'destructive',
        });
        return;
      }
      
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
      
      await downloadHTMLAsPDF(invoiceHTML, `fatura-selecionada-${clientName}.pdf`);
      
      toast({
        title: 'Fatura selecionada gerada',
        description: 'A fatura com os projetos selecionados foi baixada com sucesso.',
        variant: 'default',
      });
      
      // Sair do modo seleção após gerar a fatura
      cancelSelection(clientId);
      
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

  // Verificar status do trial
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user?.id) return;

      try {
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
        const headers = await createTenantHeaders(user.id);
        
        const response = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const orgData = result.data;
            const now = new Date();
            const trialEnd = new Date(orgData.trial_end_date);
            const isExpired = orgData.is_trial && now > trialEnd;
            
            setIsTrialExpired(isExpired && orgData.subscription_status !== 'active');
          }
        }
      } catch (error) {
        devLog.error('[FinanceiroPage] Erro ao verificar trial:', error);
      }
    };

    checkTrialStatus();
  }, [user?.id]);

  // ✅ SEGUINDO O PADRÃO DAS OUTRAS PÁGINAS ADMIN: Carregar dados apenas se trial não expirou
  useEffect(() => {
    async function loadData() {
      if (!isTrialExpired) {
        await fetchData();
      }
    }

    loadData();
  }, [isTrialExpired]);

  // ✅ Listener para atualizar dados quando transações/custos forem modificados
  useEffect(() => {
    const handleFinancialDataUpdate = () => {
      devLog.log('[FinanceiroPage] Evento financial-data-updated recebido, atualizando dados...');
      fetchData(true);
    };

    window.addEventListener('financial-data-updated', handleFinancialDataUpdate);

    return () => {
      window.removeEventListener('financial-data-updated', handleFinancialDataUpdate);
    };
  }, []);

  // ✅ Verificar permissão ANTES de verificar trial
  if (!canViewFinancials) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar a página de Financeiro.
            </p>
            <Button
              onClick={() => router.push('/admin/painel')}
              className="mt-4 w-full"
            >
              Voltar ao Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se trial expirado, mostrar bloqueio leve
  if (isTrialExpired) {
    return (
      <TrialExpiredTabBlocker
        tabName="Financeiro"
        description="Os dados financeiros estão bloqueados durante o período de trial expirado"
      />
    );
  }

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

      <div className="mb-8">
        <nav className="flex space-x-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('cobrancas')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'cobrancas'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Cobranças
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'historico'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Histórico Financeiro
          </button>
        </nav>
      </div>

      {activeTab === 'cobrancas' && (
        <div>
          {loading ? (
            <div className="space-y-8">
              {/* Skeleton para cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="border-t-2 border-gray-200 dark:border-gray-700"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <>
          {/* Bloco de Métricas Principais */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-red-500 rounded-full">
                      <Icons.AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Total Pendente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
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

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <Icons.Users className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Clientes com Pendências</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(metrics.pendingClients)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    De um total de {safeString(clients.length || 0)} clientes
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3 whitespace-nowrap">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Icons.CircleDollarSign className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Cobranças Pagas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Icons.FileText className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Histórico de Faturamento</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.historicalPaidAmount)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Total de {safeString(metrics.paidProjects + metrics.parcela1Projects)} projetos com pagamentos ({safeString(metrics.paidProjects)} integrais + {safeString(metrics.parcela1Projects)} parciais)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-orange-500 rounded-full">
                      <Icons.TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Faturamento Mensal Estimado</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.monthlyEstimatedRevenue)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Baseado em {safeString(metrics.projectsThisMonth)} projetos deste mês
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-teal-500 rounded-full">
                      <Icons.Zap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Faturamento Mensal Real</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.monthlyActualRevenue)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(metrics.paidProjectsThisMonth)} projetos com pagamentos neste mês ({safeString(metrics.paidProjectsThisMonth)} integrais + {safeString(metrics.parcela1Projects)} parciais)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabs de Modalidades de Cobrança */}
          <div className="mb-8">
            <nav className="flex space-x-2" aria-label="Billing Mode Tabs">
              <button
                onClick={() => setBillingModeTab('avulsos')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  billingModeTab === 'avulsos'
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Avulsos
              </button>
              <button
                onClick={() => setBillingModeTab('pacotes')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  billingModeTab === 'pacotes'
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Pacotes
              </button>
              <button
                onClick={() => setBillingModeTab('assinaturas')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  billingModeTab === 'assinaturas'
                    ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Assinaturas
              </button>
            </nav>
          </div>

          {/* Bloco de Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col gap-4">
              {/* ✅ Linha 1: Campo de busca */}
              <div className="relative flex-1">
                <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, número do projeto..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* ✅ Linha 2: Filtros de seleção + Botão limpar + Botão Exportar */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Filtro por Cliente */}
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {uniqueClients.map(({ key, name }) => (
                      <SelectItem key={key} value={key}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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

                {/* Botão Exportar para Excel */}
                <Button
                  size="default"
                  onClick={exportToExcel}
                  disabled={loading || filteredProjects.length === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Icons.FileSpreadsheet className="h-4 w-4" />
                  Exportar Excel
                </Button>

                {/* Botão Limpar Filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={clearAllFilters}
                    className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-800/50 transition-all duration-200"
                  >
                    <Icons.X className="h-4 w-4" />
                    Limpar filtros
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Conteúdo baseado na tab de modalidade selecionada */}
          {billingModeTab === 'avulsos' && (
            <>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : Object.keys(projectsByClient).length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
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
            <div className="space-y-6">
              {Object.entries(projectsByClient).map(([clientKey, clientProjects]) => (
                <Card key={clientKey} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20 dark:to-transparent border-b-2 border-gray-200 dark:border-gray-700 p-6">
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
                        {!isSelectionMode[clientKey] ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                            onClick={() => handleActivateSelectionMode(clientKey)}
                            disabled={isGeneratingInvoice}
                          >
                            <Icons.Download className="h-4 w-4" />
                            Baixar fatura completa
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`flex items-center gap-1 transition-all duration-200 ${
                                getSelectedCount(clientKey) === 0 
                                  ? "bg-green-50 text-green-500 border-green-200 hover:bg-green-100 hover:text-green-600 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50 dark:hover:bg-green-900/30"
                                  : "bg-green-500 text-white border-green-500 hover:bg-green-600 hover:border-green-600 dark:bg-green-600 dark:border-green-600 dark:hover:bg-green-700"
                              }`}
                              onClick={() => handleDownloadSelectedInvoice(clientKey, clientProjects)}
                              disabled={isGeneratingInvoice || getSelectedCount(clientKey) === 0}
                            >
                              <Icons.Download className="h-4 w-4" />
                              Gerar Fatura Selecionada ({getSelectedCount(clientKey)})
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                              onClick={() => cancelSelection(clientKey)}
                              disabled={isGeneratingInvoice}
                            >
                              Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:from-gray-100 hover:to-gray-50 dark:hover:from-gray-800 dark:hover:to-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200 w-[100px]">
                              Número
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Empresa Integradora
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Cliente Final
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Potência
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Status
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Valor
                            </TableHead>
                            <TableHead className="font-bold text-gray-800 dark:text-gray-200">
                              Situação
                            </TableHead>
                            <TableHead className="text-right font-bold text-gray-800 dark:text-gray-200">Ações</TableHead>
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
                                {statusLoading ? (
                                  <Badge className="bg-gray-50 text-gray-500 border-gray-200">
                                    Carregando...
                                  </Badge>
                                ) : (() => {
                                  const currentStatus = availableStatuses.find(s => s.slug === project.status);
                                  if (currentStatus) {
                                    return (
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: currentStatus.color }}
                                        />
                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                                          {currentStatus.name}
                                        </Badge>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <Badge className="bg-gray-50 text-gray-700 border-gray-200">
                                        {getStatusDisplayName(safeString(project.status))}
                                      </Badge>
                                    );
                                  }
                                })()}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(project.valor_projeto || project.valorProjeto || 0)}
                              </TableCell>
                              <TableCell>
                                {getPaymentStatusBadge(project)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isSelectionMode[clientKey] && (
                                    <Checkbox
                                      checked={selectedProjects[clientKey]?.has(project.id) || false}
                                      onCheckedChange={() => toggleProjectSelection(clientKey, project.id)}
                                      className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                                    />
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-200"
                                    onClick={() => handleDownloadInvoice(project)}
                                    disabled={isGeneratingInvoice}
                                    title="Baixar fatura individual"
                                  >
                                    <Icons.Printer className="h-4 w-4" />
                                    <span className="text-xs font-medium">Fatura</span>
                                  </Button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 hover:border-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700 transition-all duration-200"
                                      >
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
          </>
          )}

          {/* Tab Pacotes */}
          {billingModeTab === 'pacotes' && (
            <>
              {loadingPacotes ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              ) : clientePacotes.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-6 mt-2">
                      <Icons.FileText className="h-10 w-10 text-gray-400 dark:text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum pacote encontrado
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Não há pacotes de projetos ativos ou históricos para exibir.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {clientePacotes.map((pacote) => {
                    const cliente = pacote.users;
                    const pacoteDefinicao = pacote.pacotes_definicoes;
                    const dataExpiracao = pacote.data_expiracao ? new Date(pacote.data_expiracao) : null;
                    const hoje = new Date();
                    const diasRestantes = dataExpiracao ? Math.ceil((dataExpiracao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const estaExpirado = diasRestantes <= 0;
                    const estaProximoExpirar = diasRestantes > 0 && diasRestantes <= 30;
                    const estaQuaseExpirar = diasRestantes > 0 && diasRestantes <= 7;
                    const percentualUsado = pacote.projetos_inclusos > 0 ? ((pacote.projetos_usados || 0) / pacote.projetos_inclusos) * 100 : 0;
                    const quaseEsgotado = percentualUsado >= 80 && percentualUsado < 100;
                    const esgotado = percentualUsado >= 100;

                    return (
                      <Card key={pacote.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 dark:to-transparent border-b-2 border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                                <Icons.FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                              </div>
                              <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                  {cliente?.company_name || cliente?.name || 'Cliente não identificado'}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {pacoteDefinicao?.nome || 'Pacote'} • {pacote.projetos_usados || 0} de {pacote.projetos_inclusos} projetos utilizados
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {pacote.status === 'ativo' ? (
                                <>
                                  <Badge className={
                                    esgotado ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                    quaseEsgotado ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  }>
                                    {esgotado ? 'Esgotado' : quaseEsgotado ? 'Quase esgotado' : 'Ativo'}
                                  </Badge>
                                  {dataExpiracao && (
                                    <span className={`text-xs ${
                                      estaExpirado ? 'text-red-600 dark:text-red-400 font-semibold' :
                                      estaQuaseExpirar ? 'text-red-600 dark:text-red-400' :
                                      estaProximoExpirar ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      {estaExpirado ? 'Expirado' : `${diasRestantes} dias restantes`}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                  {pacote.status === 'expirado' ? 'Expirado' : pacote.status === 'cancelado' ? 'Cancelado' : 'Inativo'}
                                </Badge>
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatCurrency(pacoteDefinicao?.valor || 0)}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {/* 🆕 BOTÕES DE AÇÃO DO PACOTE */}
                          <div className="flex items-center justify-end gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-200"
                              onClick={() => handleDownloadPacoteInvoice(pacote)}
                              disabled={isGeneratingInvoice}
                              title="Baixar fatura do pacote"
                            >
                              <Icons.Printer className="h-4 w-4" />
                              <span className="text-xs font-medium">Fatura</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 hover:border-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700 transition-all duration-200"
                                >
                                  <Icons.DollarSign className="h-4 w-4 mr-1" />
                                  Pagamento <Icons.ChevronsUpDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {(() => {
                                  const paymentStatus = pacote.payment_status || 'pendente';
                                  return (
                                    <>
                                      {paymentStatus !== 'parcela1' && paymentStatus !== 'pago' && (
                                        <DropdownMenuItem onClick={() => markPacoteAsParcela1(pacote.id)}>
                                          Marcar 1ª Parcela como Paga
                                        </DropdownMenuItem>
                                      )}
                                      {paymentStatus === 'parcela1' && (
                                        <DropdownMenuItem onClick={() => markPacoteAsPaid(pacote.id)}>
                                          Marcar 2ª Parcela como Paga
                                        </DropdownMenuItem>
                                      )}
                                      {paymentStatus !== 'pago' && (
                                        <DropdownMenuItem onClick={() => markPacoteAsPaid(pacote.id)}>
                                          Marcar como Pago (Integral)
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  );
                                })()}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => resetPacotePaymentStatus(pacote.id)}>
                                  Redefinir para Pendente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {(!pacote.projetos || pacote.projetos.length === 0) && (pacote.projetos_usados || 0) === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              Nenhum projeto neste pacote ainda
                            </div>
                          ) : (!pacote.projetos || pacote.projetos.length === 0) && (pacote.projetos_usados || 0) > 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                              {pacote.projetos_usados} {pacote.projetos_usados === 1 ? 'projeto vinculado' : 'projetos vinculados'} a este pacote
                              <div className="text-xs mt-2 text-gray-400">
                                (Detalhes dos projetos temporariamente indisponíveis)
                              </div>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                                    <TableHead className="text-left">Projeto</TableHead>
                                    <TableHead className="text-left">Cliente Final</TableHead>
                                    <TableHead className="text-left">Potência</TableHead>
                                    <TableHead className="text-left">Status</TableHead>
                                    <TableHead className="text-left">Situação de Pagamento</TableHead>
                                    <TableHead className="text-left">Data de Solicitação</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pacote.projetos.map((projeto: any) => (
                                    <TableRow key={projeto.id} className="border-b border-gray-100 dark:border-gray-800">
                                      <TableCell className="font-medium">#{projeto.number}</TableCell>
                                      <TableCell>{projeto.nome_cliente_final || '-'}</TableCell>
                                      <TableCell>{projeto.potencia ? `${projeto.potencia} kWp` : '-'}</TableCell>
                                      <TableCell>
                                        {statusLoading ? (
                                          <Badge className="bg-gray-50 text-gray-500 border-gray-200">...</Badge>
                                        ) : (() => {
                                          const currentStatus = availableStatuses.find(s => s.slug === projeto.status);
                                          if (currentStatus) {
                                            return (
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200">{currentStatus.name}</Badge>
                                              </div>
                                            );
                                          }
                                          return <Badge className="bg-gray-50 text-gray-700 border-gray-200">{getStatusDisplayName(projeto.status)}</Badge>;
                                        })()}
                                      </TableCell>
                                      <TableCell>
                                        {(() => {
                                          const paymentStatus = projeto.pagamento || 'pendente';
                                          if (paymentStatus === 'pago') {
                                            return (
                                              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                                                Pago
                                              </Badge>
                                            );
                                          } else if (paymentStatus === 'parcela1') {
                                            return (
                                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                                1ª Parcela
                                              </Badge>
                                            );
                                          } else {
                                            return (
                                              <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                                Pendente
                                              </Badge>
                                            );
                                          }
                                        })()}
                                      </TableCell>
                                      <TableCell className="text-sm text-gray-500">
                                        {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Tab Assinaturas */}
          {billingModeTab === 'assinaturas' && (
            <>
              {loadingAssinaturas ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : clienteAssinaturas.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg rounded-2xl">
                  <CardContent className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-6 mt-2">
                      <Icons.CalendarCheck className="h-10 w-10 text-gray-400 dark:text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhuma assinatura encontrada
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Não há assinaturas mensais ativas ou históricas para exibir.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {clienteAssinaturas.map((assinatura) => {
                    const cliente = assinatura.users;
                    const plano = assinatura.planos_assinatura;
                    const proximoReset = assinatura.proximo_reset ? new Date(assinatura.proximo_reset) : null;
                    const hoje = new Date();
                    const diasParaRenovacao = proximoReset ? Math.ceil((proximoReset.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                    const proximoRenovar = diasParaRenovacao > 0 && diasParaRenovacao <= 5;
                    const projetosDoMes = assinatura.projetosDoMesAtual?.length || 0;
                    const percentualUsado = assinatura.projetos_mensais > 0 ? (projetosDoMes / assinatura.projetos_mensais) * 100 : 0;
                    const quaseEsgotado = percentualUsado >= 80 && percentualUsado < 100;
                    const esgotado = percentualUsado >= 100;

                    return (
                      <Card key={assinatura.id} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 dark:to-transparent border-b-2 border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                                <Icons.CalendarCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <CardTitle className="text-xl flex items-center gap-2">
                                  {cliente?.company_name || cliente?.name || 'Cliente não identificado'}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {plano?.nome || 'Plano'} • {projetosDoMes} de {assinatura.projetos_mensais} projetos este mês
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {assinatura.status === 'ativa' ? (
                                <>
                                  <Badge className={
                                    esgotado ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                    quaseEsgotado ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  }>
                                    {esgotado ? 'Limite excedido' : quaseEsgotado ? 'Quase no limite' : 'Ativa'}
                                  </Badge>
                                  {proximoReset && (
                                    <span className={`text-xs ${
                                      proximoRenovar ? 'text-purple-600 dark:text-purple-400 font-medium' :
                                      'text-gray-500 dark:text-gray-400'
                                    }`}>
                                      Renova em {diasParaRenovacao} {diasParaRenovacao === 1 ? 'dia' : 'dias'}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                  {assinatura.status === 'cancelada' ? 'Cancelada' : assinatura.status === 'suspensa' ? 'Suspensa' : 'Inativa'}
                                </Badge>
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {formatCurrency(plano?.valor_mensal || 0)}/mês
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          {/* 🆕 BOTÕES DE AÇÃO DA ASSINATURA */}
                          <div className="flex items-center justify-end gap-2 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 px-3 py-1.5 h-8 bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-200"
                              onClick={() => handleDownloadAssinaturaInvoice(assinatura)}
                              disabled={isGeneratingInvoice}
                              title="Baixar fatura da assinatura"
                            >
                              <Icons.Printer className="h-4 w-4" />
                              <span className="text-xs font-medium">Fatura</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 hover:border-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700 transition-all duration-200"
                                >
                                  <Icons.DollarSign className="h-4 w-4 mr-1" />
                                  Pagamento <Icons.ChevronsUpDown className="h-4 w-4 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {(() => {
                                  const paymentStatus = assinatura.payment_status || 'pendente';
                                  return (
                                    <>
                                      {paymentStatus !== 'parcela1' && paymentStatus !== 'pago' && (
                                        <DropdownMenuItem onClick={() => markAssinaturaAsParcela1(assinatura.id)}>
                                          Marcar 1ª Parcela como Paga
                                        </DropdownMenuItem>
                                      )}
                                      {paymentStatus === 'parcela1' && (
                                        <DropdownMenuItem onClick={() => markAssinaturaAsPaid(assinatura.id)}>
                                          Marcar 2ª Parcela como Paga
                                        </DropdownMenuItem>
                                      )}
                                      {paymentStatus !== 'pago' && (
                                        <DropdownMenuItem onClick={() => markAssinaturaAsPaid(assinatura.id)}>
                                          Marcar como Pago (Integral)
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  );
                                })()}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => resetAssinaturaPaymentStatus(assinatura.id)}>
                                  Redefinir para Pendente
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                              Projetos do Mês Atual
                            </h4>
                            {projetosDoMes === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Nenhum projeto criado neste mês ainda
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                                      <TableHead className="text-left">Projeto</TableHead>
                                      <TableHead className="text-left">Cliente Final</TableHead>
                                      <TableHead className="text-left">Potência</TableHead>
                                      <TableHead className="text-left">Status</TableHead>
                                      <TableHead className="text-left">Situação de Pagamento</TableHead>
                                      <TableHead className="text-left">Data de Solicitação</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {assinatura.projetosDoMesAtual?.map((projeto: any) => (
                                      <TableRow key={projeto.id} className="border-b border-gray-100 dark:border-gray-800">
                                        <TableCell className="font-medium">#{projeto.number}</TableCell>
                                        <TableCell>{projeto.nome_cliente_final || '-'}</TableCell>
                                        <TableCell>{projeto.potencia ? `${projeto.potencia} kWp` : '-'}</TableCell>
                                        <TableCell>
                                          {statusLoading ? (
                                            <Badge className="bg-gray-50 text-gray-500 border-gray-200">...</Badge>
                                          ) : (() => {
                                            const currentStatus = availableStatuses.find(s => s.slug === projeto.status);
                                            if (currentStatus) {
                                              return (
                                                <div className="flex items-center gap-2">
                                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200">{currentStatus.name}</Badge>
                                                </div>
                                              );
                                            }
                                            return <Badge className="bg-gray-50 text-gray-700 border-gray-200">{getStatusDisplayName(projeto.status)}</Badge>;
                                          })()}
                                        </TableCell>
                                        <TableCell>
                                          {(() => {
                                            const paymentStatus = projeto.pagamento || 'pendente';
                                            if (paymentStatus === 'pago') {
                                              return (
                                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                                                  Pago
                                                </Badge>
                                              );
                                            } else if (paymentStatus === 'parcela1') {
                                              return (
                                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">
                                                  1ª Parcela
                                                </Badge>
                                              );
                                            } else {
                                              return (
                                                <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                                                  Pendente
                                                </Badge>
                                              );
                                            }
                                          })()}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                          {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                          {assinatura.projetos && assinatura.projetos.length > projetosDoMes && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Histórico Total ({assinatura.projetos.length - projetosDoMes} projetos anteriores)
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Total de {assinatura.projetos.length} projetos desde o início da assinatura
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
          </>
          )}
        </div>
      )}

      {activeTab === 'historico' && (
        <FinancialHistoryPanel
          initialLoading={loading}
          preloadedData={{
            transactions: transactions,
            fixedCosts: fixedCosts,
            projects: projects
          }}
        />
      )}
    </div>
  );
} 