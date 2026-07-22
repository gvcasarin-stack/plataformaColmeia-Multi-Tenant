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
  FileText,
  AlertCircle,
  TrendingDown,
  Calendar,
  MoreHorizontal,
  ArrowRightLeft
} from 'lucide-react';
// ✅ PERFORMANCE: xlsx é importado sob demanda dentro de exportToExcel (ver abaixo)

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
  FileSpreadsheet: FileText,
  AlertCircle,
  TrendingUp: TrendingDown,
  FileText,
  CircleDollarSign: DollarSign,
  CalendarCheck: Calendar,
  MoreVertical: MoreHorizontal,
  ArrowLeftRight: ArrowRightLeft
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// ✅ PERFORMANCE: FinancialHistoryPanel usa recharts (biblioteca pesada) e só é
// renderizado quando a aba "Histórico" é aberta — carregado sob demanda.
import dynamic from 'next/dynamic';
const FinancialHistoryPanel = dynamic(() => import('@/components/financial/FinancialHistoryPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Carregando histórico financeiro...</p>
      </div>
    </div>
  ),
});

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

  // ✅ ESTADOS PARA CONVERSÃO DE PROJETOS AVULSOS
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [projectToConvert, setProjectToConvert] = useState<any | null>(null);
  const [availableBillingOptions, setAvailableBillingOptions] = useState<any>({ pacotes: [], assinaturas: [] });
  const [loadingBillingOptions, setLoadingBillingOptions] = useState(false);
  const [convertingProject, setConvertingProject] = useState(false);

  // 🆕 ESTADOS PARA MODAL DE CONFIRMAÇÃO DE CONVERSÃO PARA AVULSO
  const [showConvertToAvulsoModal, setShowConvertToAvulsoModal] = useState(false);
  const [projectToConvertToAvulso, setProjectToConvertToAvulso] = useState<any | null>(null);
  const [convertingToAvulso, setConvertingToAvulso] = useState(false);

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

  // 🆕 Métricas específicas de Pacotes
  const [pacotesMetrics, setPacotesMetrics] = useState({
    pendenteAtivos: 0,
    pendenteInativos: 0,
    totalRecebido: 0,
    contratosAtivos: 0,
    renovadosMes: 0,
    expirandoSete: 0,
    pacotesAtivos: 0,
    pacotesPendentesAtivos: 0,
    pacotesPendentesInativos: 0,
    pacotesRecebidos: 0,
    valorRenovacoes: 0,
    valorExpirando: 0
  });

  // 🆕 Estado para filtro de período (Pacotes)
  const [periodoFiltroPacotes, setPeriodoFiltroPacotes] = useState<30 | 60 | 90 | 0>(30);

  // 🆕 Métricas específicas de Assinaturas
  const [assinaturasMetrics, setAssinaturasMetrics] = useState({
    mrr: 0,
    recebidoMes: 0,
    pendenteMes: 0,
    utilizacao: 0,
    cancelamentos: 0,
    renovacoesSete: 0,
    assinaturasAtivas: 0,
    projetosUsados: 0,
    projetosDisponiveis: 0
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

  // 🆕 Calcular métricas de Pacotes
  useEffect(() => {
    devLog.log('[AdminFinanceiro] Iniciando cálculo de métricas de Pacotes', {
      totalPacotes: clientePacotes.length,
      periodoSelecionado: periodoFiltroPacotes,
      primeiroPacote: clientePacotes[0]
    });

    if (clientePacotes.length === 0) {
      setPacotesMetrics({
        pendenteAtivos: 0,
        pendenteInativos: 0,
        totalRecebido: 0,
        contratosAtivos: 0,
        renovadosMes: 0,
        expirandoSete: 0,
        pacotesAtivos: 0,
        pacotesPendentesAtivos: 0,
        pacotesPendentesInativos: 0,
        pacotesRecebidos: 0,
        valorRenovacoes: 0,
        valorExpirando: 0
      });
      return;
    }

    const now = new Date();
    const seteDiasFrente = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 🔹 Filtrar pacotes por período
    const dataLimitePeriodo = periodoFiltroPacotes === 0 
      ? new Date(0) // Todo período
      : new Date(now.getTime() - periodoFiltroPacotes * 24 * 60 * 60 * 1000);

    const pacotesFiltrados = clientePacotes.filter((pacote: any) => {
      if (periodoFiltroPacotes === 0) return true; // Todo período
      
      const dataAtivacao = pacote.data_ativacao ? new Date(pacote.data_ativacao) : null;
      const dataExpiracao = pacote.data_expiracao ? new Date(pacote.data_expiracao) : null;
      const dataAtualizacao = pacote.updated_at ? new Date(pacote.updated_at) : null;
      const paymentStatus = pacote.payment_status || 'pendente';
      
      // Incluir se teve atividade no período OU se está ativo OU se foi pago
      return (
        (dataAtivacao && dataAtivacao >= dataLimitePeriodo) ||
        (dataExpiracao && dataExpiracao >= dataLimitePeriodo) ||
        (dataAtualizacao && dataAtualizacao >= dataLimitePeriodo) ||
        pacote.status === 'ativo' ||
        paymentStatus === 'pago' ||
        paymentStatus === 'parcial'
      );
    });

    let pendenteAtivos = 0;
    let pendenteInativos = 0;
    let totalRecebido = 0;
    let contratosAtivos = 0;
    let pacotesAtivos = 0;
    let renovadosMes = 0;
    let expirandoSete = 0;
    let pacotesPendentesAtivos = 0;
    let pacotesPendentesInativos = 0;
    let pacotesRecebidos = 0;
    let valorRenovacoes = 0;
    let valorExpirando = 0;

    // Calcular métricas dos pacotes filtrados
    pacotesFiltrados.forEach((pacote: any) => {
      // 🔍 O valor vem do JOIN com pacotes_definicoes
      const valor = parseFloat(pacote.pacotes_definicoes?.valor || pacote.valor || pacote.preco || 0);
      const status = pacote.status || 'ativo';
      const statusPagamento = pacote.payment_status || 'pendente';

      // 🔴 PENDENTE (ATIVOS)
      if (status === 'ativo' && statusPagamento === 'pendente') {
        pendenteAtivos += valor;
        pacotesPendentesAtivos++;
      } else if (status === 'ativo' && statusPagamento === 'parcial') {
        pendenteAtivos += valor / 2;
        pacotesPendentesAtivos++;
      }

      // 🟡 PENDENTE (INATIVOS) - Exceto cancelados
      if (status !== 'ativo' && status !== 'cancelado' && statusPagamento === 'pendente') {
        pendenteInativos += valor;
        pacotesPendentesInativos++;
      } else if (status !== 'ativo' && status !== 'cancelado' && statusPagamento === 'parcial') {
        pendenteInativos += valor / 2;
        pacotesPendentesInativos++;
      }

      // ✅ RECEBIDO (Todos os pagos, qualquer status)
      if (statusPagamento === 'pago') {
        totalRecebido += valor;
        pacotesRecebidos++;
      } else if (statusPagamento === 'parcial') {
        totalRecebido += valor / 2;
      }

      // Renovações nos últimos 30 dias
      if (pacote.data_renovacao) {
        const dataRenovacao = new Date(pacote.data_renovacao);
        if (dataRenovacao >= trintaDiasAtras) {
          renovadosMes++;
          valorRenovacoes += valor;
        }
      } else if (pacote.data_ativacao && status === 'ativo') {
        // Se não tiver data_renovacao, verificar se foi ativado recentemente
        const dataAtivacao = new Date(pacote.data_ativacao);
        if (dataAtivacao >= trintaDiasAtras) {
          renovadosMes++;
          valorRenovacoes += valor;
        }
      }
    });

    // 💼 CONTRATOS ATIVOS: Sempre calcula de TODOS os pacotes (sem filtro de período)
    clientePacotes.forEach((pacote: any) => {
      // 🔍 O valor vem do JOIN com pacotes_definicoes
      const valor = parseFloat(pacote.pacotes_definicoes?.valor || pacote.valor || pacote.preco || 0);
      const status = pacote.status || 'ativo';

      if (status === 'ativo') {
        pacotesAtivos++;
        contratosAtivos += valor;

        // Verificar se expira nos próximos 7 dias
        if (pacote.data_expiracao) {
          const dataExpiracao = new Date(pacote.data_expiracao);
          if (dataExpiracao >= now && dataExpiracao <= seteDiasFrente) {
            expirandoSete++;
            valorExpirando += valor;
          }
        }
      }
    });

    setPacotesMetrics({
      pendenteAtivos,
      pendenteInativos,
      totalRecebido,
      contratosAtivos,
      renovadosMes,
      expirandoSete,
      pacotesAtivos,
      pacotesPendentesAtivos,
      pacotesPendentesInativos,
      pacotesRecebidos,
      valorRenovacoes,
      valorExpirando
    });

    devLog.log('[AdminFinanceiro] Métricas de Pacotes calculadas:', {
      periodoFiltroPacotes,
      totalPacotes: clientePacotes.length,
      pacotesFiltrados: pacotesFiltrados.length,
      pendenteAtivos,
      pendenteInativos,
      totalRecebido,
      contratosAtivos,
      renovadosMes,
      expirandoSete,
      detalhePacotes: pacotesFiltrados.map(p => ({
        id: p.id,
        status: p.status,
        payment_status: p.payment_status,
        valor_objeto: p.pacotes_definicoes?.valor,
        valor_direto: p.valor,
        valor_preco: p.preco,
        estrutura_completa: {
          tem_pacotes_definicoes: !!p.pacotes_definicoes,
          keys: Object.keys(p)
        }
      }))
    });
  }, [clientePacotes, periodoFiltroPacotes]);

  // 🆕 Calcular métricas de Assinaturas
  useEffect(() => {
    if (clienteAssinaturas.length === 0) {
      setAssinaturasMetrics({
        mrr: 0,
        recebidoMes: 0,
        pendenteMes: 0,
        utilizacao: 0,
        cancelamentos: 0,
        renovacoesSete: 0,
        assinaturasAtivas: 0,
        projetosUsados: 0,
        projetosDisponiveis: 0
      });
      return;
    }

    let mrr = 0;
    let recebidoMes = 0;
    let pendenteMes = 0;
    let assinaturasAtivas = 0;
    let projetosUsados = 0;
    let projetosDisponiveis = 0;
    let cancelamentos = 0;
    let renovacoesSete = 0;

    const now = new Date();
    const seteDiasFrente = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    clienteAssinaturas.forEach((assinatura: any) => {
      // ✅ CORREÇÃO: Buscar valor_mensal do plano vinculado (planos_assinatura)
      const valorMensal = parseFloat(
        assinatura.valor_mensal || 
        assinatura.planos_assinatura?.valor_mensal || 
        assinatura.plano?.valor_mensal || 
        0
      );
      const status = assinatura.status || 'ativa';
      const statusPagamento = assinatura.status_pagamento || 'pendente';
      const projetosMensais = parseInt(assinatura.projetos_mensais || assinatura.quantidade_mensal || 0);
      const projetosUsadosMes = parseInt(assinatura.projetos_usados_mes_atual || 0);

      // Contar apenas assinaturas ativas
      if (status === 'ativa') {
        assinaturasAtivas++;
        mrr += valorMensal;
        projetosUsados += projetosUsadosMes;
        projetosDisponiveis += projetosMensais;

        // Calcular recebido/pendente deste mês
        if (statusPagamento === 'pago') {
          recebidoMes += valorMensal;
        } else if (statusPagamento === 'pendente') {
          pendenteMes += valorMensal;
        }

        // Verificar renovações nos próximos 7 dias
        if (assinatura.proximo_reset) {
          const proximoReset = new Date(assinatura.proximo_reset);
          if (proximoReset >= now && proximoReset <= seteDiasFrente) {
            renovacoesSete++;
          }
        }
      }

      // Contar cancelamentos nos últimos 30 dias
      // ⚠️ NOTA: Campo 'data_cancelamento' não existe na tabela cliente_assinaturas
      // Por enquanto, contar todas as assinaturas canceladas
      if (status === 'cancelada') {
        // Se no futuro adicionar campo 'data_cancelamento', descomentar filtro de data:
        // const dataCancelamento = new Date(assinatura.data_cancelamento);
        // if (dataCancelamento >= trintaDiasAtras) {
        cancelamentos++;
        // }
      }
    });

    const utilizacao = projetosDisponiveis > 0 ? (projetosUsados / projetosDisponiveis) * 100 : 0;

    setAssinaturasMetrics({
      mrr,
      recebidoMes,
      pendenteMes,
      utilizacao: Math.round(utilizacao),
      cancelamentos,
      renovacoesSete,
      assinaturasAtivas,
      projetosUsados,
      projetosDisponiveis
    });

    devLog.log('[AdminFinanceiro] Métricas de Assinaturas calculadas:', {
      mrr,
      recebidoMes,
      pendenteMes,
      utilizacao,
      cancelamentos,
      renovacoesSete,
      assinaturasAtivas,
      totalAssinaturas: clienteAssinaturas.length,
      sampleAssinatura: clienteAssinaturas[0] ? {
        tem_valor_mensal_direto: !!clienteAssinaturas[0].valor_mensal,
        tem_plano_objeto: !!clienteAssinaturas[0].planos_assinatura,
        valor_do_plano: clienteAssinaturas[0].planos_assinatura?.valor_mensal
      } : null
    });
  }, [clienteAssinaturas]);

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
      // ✅ FILTRO CRÍTICO: Considerar apenas projetos AVULSOS para os contadores
      // Projetos em pacotes/assinaturas não devem impactar métricas de avulsos
      const isAvulso = !project.billing_mode || project.billing_mode === 'avulso';
      
      if (!isAvulso) {
        // Projeto está em pacote ou assinatura - não contar
        return;
      }

      const price = project.valor_projeto || project.valorProjeto || 0;
      const isCurrentMonth = isProjectFromCurrentMonth(project);

      // ✅ CORREÇÃO: Considerar null/undefined como pendente
      const paymentStatus = project.pagamento || 'pendente';

      if (paymentStatus === 'pendente') {
        pendingCount++;
        totalPending += price;
        const clientKey = project.client_id || project.created_by || project.empresaIntegradora || 'sem-cliente';
        pendingClientIds.add(String(clientKey));
      } else if (paymentStatus === 'parcela1') {
        parcela1Count++;
        totalPending += price / 2;
        totalPaid += price / 2;
        const clientKey = project.client_id || project.created_by || project.empresaIntegradora || 'sem-cliente';
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
        const clientKey = project.empresaIntegradora || 'sem-cliente';
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

    return 'Cliente #' + safeString(clientKey).slice(0, 8);
  };

  const projectsByClient = useMemo(() => {
    const grouped: Record<string, ProjectWithBilling[]> = {};

    filteredProjects.forEach(project => {
      const clientKey = project.empresaIntegradora || 'sem-cliente';
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
      const clientKey = project.empresaIntegradora || 'sem-cliente';
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
  const exportToExcel = async () => {
    try {
      // ✅ PERFORMANCE: xlsx só é necessário quando o usuário exporta — carregamos sob
      // demanda em vez de incluir no bundle inicial da página.
      const XLSX = await import('xlsx');

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

  // 🆕 FUNÇÕES DE CONVERSÃO DE PROJETOS AVULSOS
  const openConvertModal = async (project: any) => {
    try {
      setProjectToConvert(project);
      setLoadingBillingOptions(true);
      setShowConvertModal(true);

      // Buscar opções disponíveis
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id || '');

      const response = await fetch(`/api/admin/projects/${project.id}/available-billing`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) throw new Error('Erro ao buscar opções disponíveis');

      const result = await response.json();
      if (result.success) {
        setAvailableBillingOptions(result.data);
      }
    } catch (error) {
      devLog.error('[OpenConvertModal] Error:', error);
      toast({
        title: 'Erro ao carregar opções',
        description: 'Ocorreu um erro ao buscar pacotes/assinaturas disponíveis.',
        variant: 'destructive',
      });
      setShowConvertModal(false);
    } finally {
      setLoadingBillingOptions(false);
    }
  };

  const handleConvertProject = async (targetType: 'pacote' | 'assinatura', targetId: string) => {
    if (!projectToConvert) return;

    try {
      setConvertingProject(true);

      toast({
        title: 'Convertendo projeto...',
        description: `Aguarde enquanto convertemos para ${targetType}.`,
        variant: 'default',
      });

      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id || '');

      const response = await fetch(`/api/admin/projects/${projectToConvert.id}/convert-billing`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_type: targetType, target_id: targetId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao converter projeto');
      }

      const result = await response.json();

      toast({
        title: 'Projeto convertido!',
        description: `Projeto convertido para ${targetType} com sucesso.`,
        variant: 'default',
      });

      setShowConvertModal(false);
      setProjectToConvert(null);
      
      // ✅ Recarregar todos os dados para atualizar o frontend
      await fetchData(true);
      await loadClientePacotes();
      await loadClienteAssinaturas();

      // Notificar painel sobre atualização
      window.dispatchEvent(new CustomEvent('billing-updated', {
        detail: { action: 'convert', projectId: projectToConvert.id }
      }));

    } catch (error: any) {
      devLog.error('[HandleConvertProject] Error:', error);
      toast({
        title: 'Erro ao converter',
        description: error.message || 'Ocorreu um erro ao converter o projeto.',
        variant: 'destructive',
      });
    } finally {
      setConvertingProject(false);
    }
  };

  // 🆕 FUNÇÃO PARA CONVERTER PARA AVULSO (COM MODAL DE CONFIRMAÇÃO)
  const handleConvertToAvulso = async () => {
    if (!projectToConvertToAvulso) return;

    try {
      setConvertingToAvulso(true);

      toast({
        title: 'Convertendo projeto...',
        description: 'Aguarde enquanto removemos o projeto do pacote/assinatura.',
        variant: 'default',
      });

      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
      const headers = await createTenantHeaders(user?.id || '');

      const response = await fetch(`/api/admin/projects/${projectToConvertToAvulso.id}/convert-billing`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_type: 'avulso' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao converter');
      }

      toast({
        title: 'Projeto convertido',
        description: 'Projeto convertido para avulso com sucesso.',
        variant: 'default',
      });

      setShowConvertToAvulsoModal(false);
      setProjectToConvertToAvulso(null);
      
      // ✅ Recarregar todos os dados para atualizar o frontend
      await fetchData(true);
      await loadClientePacotes();
      await loadClienteAssinaturas();

      // Notificar painel sobre atualização
      window.dispatchEvent(new CustomEvent('billing-updated', {
        detail: { action: 'convert-to-avulso', projectId: projectToConvertToAvulso.id }
      }));

    } catch (error: any) {
      devLog.error('[HandleConvertToAvulso] Error:', error);
      toast({
        title: 'Erro ao converter',
        description: error.message || 'Ocorreu um erro ao converter o projeto.',
        variant: 'destructive',
      });
    } finally {
      setConvertingToAvulso(false);
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

      await loadClienteAssinaturas();

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

      await loadClienteAssinaturas();

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

      await loadClienteAssinaturas();

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

      // ✅ PERFORMANCE: buscar projetos e resolver os headers de tenant em paralelo —
      // são independentes entre si (antes rodavam em sequência, um esperando o outro).
      const headersPromise = user?.id
        ? (async () => {
            const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
            return createTenantHeaders(user.id);
          })()
        : Promise.resolve(null);

      const [projectsData, headers] = await Promise.all([
        getProjectsWithBilling(),
        headersPromise,
      ]);

      devLog.log('[fetchData] Projetos recebidos:', projectsData?.length || 0);

      if (projectsData) {
        setProjects(projectsData);

        // Extrair clientes únicos dos projetos
        const uniqueClients = projectsData.reduce((acc: any[], project) => {
          if (project.client_id && !acc.find(c => c.id === project.client_id)) {
            acc.push({
              id: project.client_id,
              name: project.client_name || 'Cliente sem nome',
              email: 'N/A'
            });
          }
          return acc;
        }, []);

        devLog.log('[fetchData] Clientes únicos extraídos:', uniqueClients.length);
        setClients(uniqueClients);
      }

      // Buscar transações e custos fixos via API financial/dashboard
      if (headers) {
        try {
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1;
          const currentYear = currentDate.getFullYear();

          // ✅ PERFORMANCE: as duas chamadas são independentes — rodam em paralelo.
          // - includeProjects=false: essa página não usa `metrics`/`projects` dessa
          //   resposta (já tem os projetos via /api/projects/unified), então pulamos
          //   a busca+filtro de projetos que a rota faria à toa.
          // - fields=id,type,amount: só usamos o histórico de transações para somar
          //   receitas, não precisamos de todas as colunas de cada linha.
          const [dashboardResponse, allTransactionsResponse] = await Promise.all([
            fetch(`/api/financial/dashboard?month=${currentMonth}&year=${currentYear}&includeProjects=false`, { headers }),
            fetch('/api/financial/transactions?fields=id,type,amount', { headers }),
          ]);

          if (dashboardResponse.ok) {
            const financialData = await dashboardResponse.json();
            devLog.log('[fetchData] Dados financeiros do mês atual recebidos:', {
              transactions: financialData.transactions?.length || 0,
              fixedCosts: financialData.fixedCosts?.length || 0
            });

            setTransactions(financialData.transactions || []);
            setFixedCosts(financialData.fixedCosts || []);
          }

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
      const clientId = project.client_id || project.owner_id;
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
        email: clientProfile?.email || 'N/A',
        phone: clientProfile?.phone || 'N/A',
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
      const inferredClientId = (projects[0] as any)?.client_id || clientId;
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
            onClick={() => {
              setActiveTab('cobrancas');
              setBillingModeTab('avulsos');
            }}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'cobrancas' && billingModeTab === 'avulsos'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Avulsos
          </button>
          <button
            onClick={() => {
              setActiveTab('cobrancas');
              setBillingModeTab('pacotes');
            }}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'cobrancas' && billingModeTab === 'pacotes'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Pacotes
          </button>
          <button
            onClick={() => {
              setActiveTab('cobrancas');
              setBillingModeTab('assinaturas');
            }}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'cobrancas' && billingModeTab === 'assinaturas'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Assinaturas
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
          {/* 🎯 Cards condicionais baseados na aba selecionada */}
          {billingModeTab === 'avulsos' && (
          <>
          {/* Bloco de Métricas Principais - AVULSOS */}
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
          </>
          )}

          {/* 📦 Bloco de Métricas - PACOTES */}
          {billingModeTab === 'pacotes' && (
          <>
          {/* Botões de Filtro de Período */}
          <div className="mb-6">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={periodoFiltroPacotes === 30 ? 'default' : 'outline'}
                onClick={() => setPeriodoFiltroPacotes(30)}
                className={periodoFiltroPacotes === 30 ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                30 dias
              </Button>
              <Button
                size="sm"
                variant={periodoFiltroPacotes === 60 ? 'default' : 'outline'}
                onClick={() => setPeriodoFiltroPacotes(60)}
                className={periodoFiltroPacotes === 60 ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                60 dias
              </Button>
              <Button
                size="sm"
                variant={periodoFiltroPacotes === 90 ? 'default' : 'outline'}
                onClick={() => setPeriodoFiltroPacotes(90)}
                className={periodoFiltroPacotes === 90 ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                90 dias
              </Button>
              <Button
                size="sm"
                variant={periodoFiltroPacotes === 0 ? 'default' : 'outline'}
                onClick={() => setPeriodoFiltroPacotes(0)}
                className={periodoFiltroPacotes === 0 ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                Todo Período
              </Button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Card 1: 🔴 Pendente (Ativos) */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-red-500 rounded-full">
                      <Icons.AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Pendente (Ativos)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pacotesMetrics.pendenteAtivos)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(pacotesMetrics.pacotesPendentesAtivos)} {pacotesMetrics.pacotesPendentesAtivos === 1 ? 'pacote' : 'pacotes'} aguardando pagamento
                  </p>
                </CardContent>
              </Card>

              {/* Card 2: 🟡 Pendente (Inativos) */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-orange-500 rounded-full">
                      <Icons.AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Pendente (Inativos)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pacotesMetrics.pendenteInativos)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(pacotesMetrics.pacotesPendentesInativos)} {pacotesMetrics.pacotesPendentesInativos === 1 ? 'pacote expirado' : 'pacotes expirados'} sem pagamento
                  </p>
                </CardContent>
              </Card>

              {/* Card 3: ✅ Total Recebido */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Icons.CircleDollarSign className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Total Recebido</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pacotesMetrics.totalRecebido)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(pacotesMetrics.pacotesRecebidos)} {pacotesMetrics.pacotesRecebidos === 1 ? 'pacote pago' : 'pacotes pagos'}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 4: 💼 Contratos Ativos */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <Icons.FileText className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Contratos Ativos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(pacotesMetrics.contratosAtivos)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(pacotesMetrics.pacotesAtivos)} {pacotesMetrics.pacotesAtivos === 1 ? 'pacote ativo' : 'pacotes ativos'} agora
                  </p>
                </CardContent>
              </Card>

              {/* Card 5: 🔄 Renovados Este Mês */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-cyan-500 rounded-full">
                      <Icons.ArrowLeftRight className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Renovados Este Mês</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(pacotesMetrics.renovadosMes)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatCurrency(pacotesMetrics.valorRenovacoes)} em renovações
                  </p>
                </CardContent>
              </Card>

              {/* Card 6: ⚠️ Expirando (7 dias) */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-orange-500 rounded-full">
                      <Icons.AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Expirando (7 dias)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(pacotesMetrics.expirandoSete)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatCurrency(pacotesMetrics.valorExpirando)} em risco
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
          )}

          {/* 🔄 Bloco de Métricas - ASSINATURAS */}
          {billingModeTab === 'assinaturas' && (
          <>
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* MRR */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-purple-500 rounded-full">
                      <Icons.CircleDollarSign className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">MRR</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(assinaturasMetrics.mrr)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(assinaturasMetrics.assinaturasAtivas)} assinaturas ativas
                  </p>
                </CardContent>
              </Card>

              {/* Recebido Este Mês */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Icons.CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Recebido Este Mês</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(assinaturasMetrics.recebidoMes)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Pagamentos confirmados
                  </p>
                </CardContent>
              </Card>

              {/* Pendente Este Mês */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-red-500 rounded-full">
                      <Icons.AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Pendente Este Mês</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(assinaturasMetrics.pendenteMes)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Pagamentos aguardando confirmação
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Taxa de Utilização */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Icons.TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Taxa de Utilização</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(assinaturasMetrics.utilizacao)}%
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {safeString(assinaturasMetrics.projetosUsados)} de {safeString(assinaturasMetrics.projetosDisponiveis)} projetos usados
                  </p>
                </CardContent>
              </Card>

              {/* Cancelamentos */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-red-600 rounded-full">
                      <Icons.X className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Cancelamentos Este Mês</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(assinaturasMetrics.cancelamentos)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Assinaturas canceladas nos últimos 30 dias
                  </p>
                </CardContent>
              </Card>

              {/* Renovações Próximas */}
              <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-teal-500 rounded-full">
                      <Icons.CalendarCheck className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Renovações (7 dias)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {safeString(assinaturasMetrics.renovacoesSete)}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Assinaturas renovando nos próximos 7 dias
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
          )}

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
                                            {/* 🆕 CONVERSÃO: Apenas para projetos avulsos */}
                                            {(!project.billing_mode || project.billing_mode === 'avulso') && (
                                              <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => openConvertModal(project)} className="text-blue-600 dark:text-blue-400">
                                                  Converter para Pacote/Assinatura
                                                </DropdownMenuItem>
                                              </>
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
                              <div className="flex items-center gap-2">
                                {pacote.status === 'ativo' ? (
                                  <Badge className={
                                    esgotado ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                    quaseEsgotado ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  }>
                                    {esgotado ? 'Esgotado' : quaseEsgotado ? 'Quase esgotado' : 'Ativo'}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                    {pacote.status === 'expirado' ? 'Expirado' : pacote.status === 'cancelado' ? 'Cancelado' : 'Inativo'}
                                  </Badge>
                                )}
                                {/* Badge de Situação de Pagamento do Pacote */}
                                {(() => {
                                  const paymentStatus = pacote.payment_status || 'pendente';
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
                              </div>
                              {pacote.status === 'ativo' && dataExpiracao && (
                                <span className={`text-xs ${
                                  estaExpirado ? 'text-red-600 dark:text-red-400 font-semibold' :
                                  estaQuaseExpirar ? 'text-red-600 dark:text-red-400' :
                                  estaProximoExpirar ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {estaExpirado ? 'Expirado' : `${diasRestantes} dias restantes`}
                                </span>
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
                                    <TableHead className="text-left">Data de Solicitação</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
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
                                      <TableCell className="text-sm text-gray-500">
                                        {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                              <Icons.MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            <DropdownMenuItem 
                                              onClick={() => {
                                                setProjectToConvertToAvulso(projeto);
                                                setShowConvertToAvulsoModal(true);
                                              }}
                                              className="text-orange-600 dark:text-orange-400"
                                            >
                                              <Icons.ArrowLeftRight className="h-4 w-4 mr-2" />
                                              Converter para Avulso
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
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
                    // ✅ CORREÇÃO: Usar contador do banco de dados ao invés de array length
                    const projetosDoMes = parseInt(assinatura.projetos_usados_mes_atual || 0);
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
                              <div className="flex items-center gap-2">
                                {assinatura.status === 'ativa' ? (
                                  <Badge className={
                                    esgotado ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                    quaseEsgotado ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  }>
                                    {esgotado ? 'Limite excedido' : quaseEsgotado ? 'Quase no limite' : 'Ativa'}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                    {assinatura.status === 'cancelada' ? 'Cancelada' : assinatura.status === 'suspensa' ? 'Suspensa' : 'Inativa'}
                                  </Badge>
                                )}
                                {/* Badge de Situação de Pagamento da Assinatura */}
                                {(() => {
                                  const paymentStatus = assinatura.payment_status || 'pendente';
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
                              </div>
                              {assinatura.status === 'ativa' && proximoReset && (
                                <span className={`text-xs ${
                                  proximoRenovar ? 'text-purple-600 dark:text-purple-400 font-medium' :
                                  'text-gray-500 dark:text-gray-400'
                                }`}>
                                  Renova em {diasParaRenovacao} {diasParaRenovacao === 1 ? 'dia' : 'dias'}
                                </span>
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
                                      <TableHead className="text-left">Data de Solicitação</TableHead>
                                      <TableHead className="text-right">Ações</TableHead>
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
                                        <TableCell className="text-sm text-gray-500">
                                          {new Date(projeto.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <Icons.MoreVertical className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem 
                                                onClick={() => {
                                                  setProjectToConvertToAvulso(projeto);
                                                  setShowConvertToAvulsoModal(true);
                                                }}
                                                className="text-orange-600 dark:text-orange-400"
                                              >
                                                <Icons.ArrowLeftRight className="h-4 w-4 mr-2" />
                                                Converter para Avulso
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
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

      {/* 🆕 MODAL DE CONVERSÃO DE PROJETO AVULSO */}
      {showConvertModal && projectToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Converter Projeto para Pacote/Assinatura
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowConvertModal(false);
                    setProjectToConvert(null);
                  }}
                  disabled={convertingProject}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {/* Info do Projeto */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Projeto: {projectToConvert.number || projectToConvert.id}
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Cliente: {projectToConvert.client_name || projectToConvert.users?.full_name || 'N/A'}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Valor atual (avulso): {formatCurrency(projectToConvert.billing_snapshot?.valor_projeto || projectToConvert.price || 0)}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Status de pagamento: {projectToConvert.pagamento === 'pago' ? 'Pago' : projectToConvert.pagamento === 'parcela1' ? '1ª Parcela Paga' : 'Pendente'}
                </p>
              </div>

              {/* Warning */}
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-1">
                      Atenção
                    </h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      Após a conversão, este projeto será contabilizado no pacote/assinatura selecionado.
                      {projectToConvert.pagamento === 'pago' && (
                        <> O valor já pago (avulso) deverá ser negociado manualmente com o cliente para ajuste do valor do pacote/assinatura.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading */}
              {loadingBillingOptions && (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                </div>
              )}

              {/* Opções */}
              {!loadingBillingOptions && (
                <div className="space-y-4">
                  {/* Pacotes */}
                  {availableBillingOptions.pacotes && availableBillingOptions.pacotes.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Pacotes Disponíveis
                      </h3>
                      <div className="grid gap-3">
                        {availableBillingOptions.pacotes.map((pacote: any) => (
                          <button
                            key={pacote.id}
                            onClick={() => handleConvertProject('pacote', pacote.id)}
                            disabled={convertingProject}
                            className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {pacote.nome}
                                  {pacote.empresa && <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({pacote.empresa})</span>}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Quota: {pacote.quota} • {pacote.vagas_disponiveis} vagas disponíveis
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Expira em: {new Date(pacote.expira_em).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <Icons.CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assinaturas */}
                  {availableBillingOptions.assinaturas && availableBillingOptions.assinaturas.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        Assinaturas Disponíveis
                      </h3>
                      <div className="grid gap-3">
                        {availableBillingOptions.assinaturas.map((assinatura: any) => (
                          <button
                            key={assinatura.id}
                            onClick={() => handleConvertProject('assinatura', assinatura.id)}
                            disabled={convertingProject}
                            className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {assinatura.nome}
                                  {assinatura.empresa && <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({assinatura.empresa})</span>}
                                </h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Quota mensal: {assinatura.quota} • {assinatura.vagas_disponiveis} vagas disponíveis
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Próximo reset: {new Date(assinatura.proximo_reset).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                              <Icons.CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nenhuma opção disponível */}
                  {(!availableBillingOptions.pacotes || availableBillingOptions.pacotes.length === 0) &&
                   (!availableBillingOptions.assinaturas || availableBillingOptions.assinaturas.length === 0) && (
                    <div className="py-12 text-center">
                      <Icons.AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        Nenhuma opção disponível
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Este cliente não possui pacotes ou assinaturas ativos com quota disponível.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConvertModal(false);
                  setProjectToConvert(null);
                }}
                disabled={convertingProject}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal de Confirmação: Converter para Avulso */}
      <Dialog open={showConvertToAvulsoModal} onOpenChange={setShowConvertToAvulsoModal}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Converter projeto para avulso?
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
              Tem certeza que deseja converter o projeto{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                #{projectToConvertToAvulso?.number}
              </span>{' '}
              para avulso?
              <br />
              <br />
              O projeto será removido do {projectToConvertToAvulso?.billing_mode === 'pacote' ? 'pacote' : 'assinatura'} e voltará a ser cobrado individualmente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowConvertToAvulsoModal(false);
                setProjectToConvertToAvulso(null);
              }}
              disabled={convertingToAvulso}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConvertToAvulso}
              disabled={convertingToAvulso}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {convertingToAvulso ? 'Convertendo...' : 'Converter para Avulso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 