'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';
import { devLog } from '@/lib/utils/productionLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  UserPlus,
  Search,
  Download,
  Upload,
  Filter,
  Phone,
  Mail,
  Building2,
  Calendar,
  User,
  MapPin,
  Zap,
  TrendingUp,
  Target,
  MoreVertical,
  Edit,
  Trash2,
  ArrowRight,
  X
} from 'lucide-react';
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

import { AddLeadModal } from '@/components/admin/AddLeadModal';
import { ConvertLeadToOpportunityModal } from '@/components/admin/ConvertLeadToOpportunityModal';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  estimated_power?: number;
  estimated_value?: number;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  source?: string;
  responsible_id?: string;
  is_new: boolean;
  last_interaction_at?: string;
  last_interaction_type?: string;
  created_at: string;
  updated_at: string;
  responsible?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

interface TeamMember {
  id: string;
  full_name?: string;
  email?: string;
}


interface LeadFormData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  estimated_power?: number;
  estimated_value?: number;
  address?: string;
  city?: string;
  state?: string;
  status: string;
  source?: string;
  responsible_id?: string;
  notes?: string;
}

const formatCurrency = (value: number | undefined): string => {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return 'N/A';
  }
};

const getStatusBadgeColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    'novo': 'bg-blue-100 text-blue-700 border-blue-300',
    'contatado': 'bg-purple-100 text-purple-700 border-purple-300',
    'qualificado': 'bg-green-100 text-green-700 border-green-300',
    'proposta_enviada': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'em_negociacao': 'bg-orange-100 text-orange-700 border-orange-300',
    'ganho': 'bg-emerald-100 text-emerald-700 border-emerald-300',
    'perdido': 'bg-red-100 text-red-700 border-red-300'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-700 border-gray-300';
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    'novo': 'Novo',
    'contatado': 'Contatado',
    'qualificado': 'Qualificado',
    'proposta_enviada': 'Proposta Enviada',
    'em_negociacao': 'Em Negociação',
    'ganho': 'Ganho',
    'perdido': 'Perdido'
  };
  return statusLabels[status] || status;
};

const getInteractionIcon = (type: string | undefined) => {
  if (!type) return null;
  const icons: Record<string, React.ReactNode> = {
    'email': <Mail className="h-3 w-3" />,
    'ligacao': <Phone className="h-3 w-3" />,
    'reuniao': <Calendar className="h-3 w-3" />,
    'whatsapp': <Phone className="h-3 w-3" />
  };
  return icons[type] || null;
};

// Mapa de exibição para origem do lead
const getSourceLabel = (source: string | undefined) => {
  if (!source) return 'N/A';
  const sourceLabels: Record<string, string> = {
    'site': 'Site',
    'indicacao': 'Indicação',
    'instagram': 'Instagram',
    'facebook': 'Facebook',
    'google': 'Google',
    'telefone': 'Telefone',
    'email': 'E-mail',
    'outro': 'Outro'
  };
  return sourceLabels[source.toLowerCase()] || source;
};

export default function AdminLeadsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // ✅ Verificar permissão de acesso
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};
  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [isEditLeadModalOpen, setIsEditLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);

  // Filtros
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Métricas
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    newLeadsLast7Days: 0,
    qualificationRate: 0,
    topSource: { name: 'N/A', percentage: 0 }
  });

  // ✅ Ref para evitar carregamento ao trocar de abas
  const hasLoadedRef = useRef(false);

  // ✅ Função para calcular métricas a partir do array de leads
  const calculateMetrics = useCallback((leadsData: Lead[]) => {
    const total = leadsData.length;

    // Leads novos dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const novosUltimos7Dias = leadsData.filter((l) => {
      const createdDate = new Date(l.created_at);
      return createdDate >= sevenDaysAgo;
    }).length;

    // Taxa de qualificação (% de leads que chegaram ao status 'qualificado')
    const qualificados = leadsData.filter(l => l.status === 'qualificado').length;
    const taxaQualificacao = total > 0 ? (qualificados / total) * 100 : 0;

    // Principal origem (canal com mais leads)
    const origemCount: Record<string, number> = {};
    leadsData.forEach((l) => {
      const source = l.source || 'não_especificado';
      origemCount[source] = (origemCount[source] || 0) + 1;
    });

    let topSourceName = 'N/A';
    let topSourceCount = 0;
    Object.entries(origemCount).forEach(([source, count]) => {
      if (count > topSourceCount) {
        topSourceCount = count;
        topSourceName = source;
      }
    });

    const topSourcePercentage = total > 0 ? (topSourceCount / total) * 100 : 0;

    return {
      totalLeads: total,
      newLeadsLast7Days: novosUltimos7Dias,
      qualificationRate: parseFloat(taxaQualificacao.toFixed(1)),
      topSource: {
        name: getSourceLabel(topSourceName),
        percentage: parseFloat(topSourcePercentage.toFixed(1))
      }
    };
  }, []);

  // Função para buscar leads do banco
  const fetchLeads = async () => {
    try {
      setLoading(true);
      devLog.log('Buscando leads do banco...');

      const response = await fetch('/api/leads', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar leads');
      }

      const result = await response.json();
      devLog.log('Leads carregados:', result.data?.length || 0);

      setLeads(result.data || []);
      // ✅ Métricas serão calculadas automaticamente pelo useEffect

    } catch (error: any) {
      devLog.error('Erro ao buscar leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: error.message || "Não foi possível carregar os leads.",
        variant: "destructive",
      });
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ useEffect para recalcular métricas sempre que leads mudar
  useEffect(() => {
    if (leads.length >= 0) {
      const newMetrics = calculateMetrics(leads);
      setMetrics(newMetrics);
    }
  }, [leads, calculateMetrics]);

  // ✅ useEffect para carregar leads apenas uma vez
  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }

    // Carregar apenas na primeira vez
    if (!hasLoadedRef.current) {
      fetchLeads();
      hasLoadedRef.current = true;
    }
    // fetchTeamMembers(); // TODO: Implementar quando necessário
  }, [user, router]);

  // Filtrar leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !selectedStatus || lead.status === selectedStatus;
    const matchesSource = !selectedSource || lead.source === selectedSource;
    const matchesResponsible = !selectedResponsible || lead.responsible_id === selectedResponsible;

    return matchesSearch && matchesStatus && matchesSource && matchesResponsible;
  });

  const handleExport = () => {
    toast({
      title: "Exportação em desenvolvimento",
      description: "A funcionalidade de exportar para Excel será implementada em breve.",
    });
  };

  const handleImport = () => {
    toast({
      title: "Importação em desenvolvimento",
      description: "A funcionalidade de importar leads será implementada em breve.",
    });
  };

  const handleAddLead = () => {
    setIsAddLeadModalOpen(true);
  };

  const handleSubmitLead = async (data: LeadFormData) => {
    try {
      devLog.log('Criando novo lead:', data);

      // Limpar campos UUID vazios (converter "" para null)
      const cleanedData = {
        ...data,
        responsible_id: data.responsible_id && data.responsible_id.trim() !== '' ? data.responsible_id : null,
      };

      // Chamar API para criar lead
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...cleanedData,
          userId: user.id,  // Para campo created_by
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar lead');
      }

      const result = await response.json();
      devLog.log('Lead criado com sucesso:', result.data);

      // Adicionar o novo lead à lista local
      setLeads(prev => [result.data, ...prev]);

      toast({
        title: "Lead criado com sucesso!",
        description: `O lead ${data.name} foi adicionado ao sistema.`,
        variant: "default",
      });

      setIsAddLeadModalOpen(false);
    } catch (error: any) {
      devLog.error('Erro ao criar lead:', error);
      toast({
        title: "Erro ao criar lead",
        description: error.message || "Ocorreu um erro ao criar o lead. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleConvertToOpportunity = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setLeadToConvert(lead);
      setIsConvertModalOpen(true);
    }
  };

  const handleConvertSuccess = () => {
    // Recarregar leads para atualizar o status
    fetchLeads();

    toast({
      title: "Navegue até o Funil de Vendas",
      description: "A oportunidade foi criada! Você pode visualizá-la na aba Funil de Vendas.",
    });
  };

  const handleEditLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setEditingLead(lead);
      setIsEditLeadModalOpen(true);
    }
  };

  const handleUpdateLead = async (data: LeadFormData) => {
    if (!editingLead) return;

    try {
      devLog.log('Atualizando lead:', editingLead.id, data);

      // Limpar campos UUID vazios
      const cleanedData = {
        ...data,
        responsible_id: data.responsible_id && data.responsible_id.trim() !== '' ? data.responsible_id : null,
      };

      const response = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar lead');
      }

      const result = await response.json();
      devLog.log('Lead atualizado com sucesso:', result.data);

      // Atualizar lead na lista local
      setLeads(prev => prev.map(l => l.id === editingLead.id ? result.data : l));

      toast({
        title: "Lead atualizado com sucesso!",
        description: `O lead ${data.name} foi atualizado.`,
        variant: "default",
      });

      setIsEditLeadModalOpen(false);
      setEditingLead(null);
    } catch (error: any) {
      devLog.error('Erro ao atualizar lead:', error);
      toast({
        title: "Erro ao atualizar lead",
        description: error.message || "Ocorreu um erro ao atualizar o lead.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setLeadToDelete(lead);
      setIsDeleteDialogOpen(true);
    }
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;

    try {
      devLog.log('Excluindo lead:', leadToDelete.id);

      const response = await fetch(`/api/leads/${leadToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir lead');
      }

      devLog.log('Lead excluído com sucesso');

      // Remover lead da lista local
      setLeads(prev => prev.filter(l => l.id !== leadToDelete.id));

      toast({
        title: "Lead excluído com sucesso!",
        description: "O lead foi removido do sistema.",
        variant: "default",
      });

      setIsDeleteDialogOpen(false);
      setLeadToDelete(null);
    } catch (error: any) {
      devLog.error('Erro ao excluir lead:', error);
      toast({
        title: "Erro ao excluir lead",
        description: error.message || "Ocorreu um erro ao excluir o lead.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSelectedStatus('');
    setSelectedSource('');
    setSelectedResponsible('');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = selectedStatus || selectedSource || selectedResponsible || startDate || endDate;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary animate-pulse" />
          <h2 className="mt-6 text-xl font-semibold">Carregando Leads...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-blue-600 text-white p-6 shadow-lg rounded-lg mt-2 mr-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Leads</h1>
            <p className="text-sm opacity-90">
              Gerencie seus leads e acompanhe o funil de vendas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              onClick={handleAddLead}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Lead
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow bg-white dark:bg-gray-800 shadow-xl rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 mt-6 mr-6">

        {/* Metrics Cards - Focadas em CAPTURA/ENTRADA */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Card 1: Total de Leads (mantido) */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-3 bg-blue-500 rounded-full">
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-200">Total de Leads</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalLeads}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Leads cadastrados no sistema
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Leads Novos (últimos 7 dias) */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-3 bg-green-500 rounded-full">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-200">Leads Novos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.newLeadsLast7Days}</div>
              <p className="text-sm text-muted-foreground mt-1">
                Últimos 7 dias
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Taxa de Qualificação */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-3 bg-purple-500 rounded-full">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-200">Taxa de Qualificação</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{metrics.qualificationRate}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                Leads prontos para oportunidade
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Principal Origem */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-3">
                <div className="p-3 bg-yellow-500 rounded-full">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <span className="text-gray-700 dark:text-gray-200">Principal Origem</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.topSource.name}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {metrics.topSource.percentage}% dos leads
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filtros
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Limpar Filtros
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contatado">Contatado</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                  <SelectItem value="ganho">Ganho</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                </SelectContent>
              </Select>

              {/* Responsible Filter */}
              <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
                <SelectTrigger>
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Range */}
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Leads</span>
              <Badge variant="outline" className="text-base">
                {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nenhum lead encontrado
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  {searchTerm || hasActiveFilters
                    ? 'Tente ajustar os filtros ou termo de busca'
                    : 'Comece adicionando seu primeiro lead'}
                </p>
                {!searchTerm && !hasActiveFilters && (
                  <Button onClick={handleAddLead} className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Adicionar Primeiro Lead
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Última Interação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lead.name}</span>
                            {lead.is_new && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                NOVO
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.company && (
                            <div className="flex items-center gap-1 text-sm">
                              <Building2 className="h-3 w-3 text-gray-400" />
                              {lead.company}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusBadgeColor(lead.status)} border`}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{getSourceLabel(lead.source)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {lead.responsible?.full_name || 'Não atribuído'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lead.last_interaction_at ? (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              {getInteractionIcon(lead.last_interaction_type)}
                              {formatDate(lead.last_interaction_at)}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Sem interação</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleConvertToOpportunity(lead.id)}>
                                <ArrowRight className="mr-2 h-4 w-4 text-green-600" />
                                Converter em Oportunidade
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditLead(lead.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteLead(lead.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
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
      </main>

      <AddLeadModal
        open={isAddLeadModalOpen}
        onOpenChange={setIsAddLeadModalOpen}
        onSubmit={handleSubmitLead}
        teamMembers={teamMembers}
      />

      <AddLeadModal
        open={isEditLeadModalOpen}
        onOpenChange={setIsEditLeadModalOpen}
        onSubmit={handleUpdateLead}
        teamMembers={teamMembers}
        initialData={editingLead || undefined}
        isEdit={true}
      />

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Excluir lead?
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Tem certeza que deseja excluir o lead{' '}
              <span className="font-semibold text-gray-900">
                {leadToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita e todos os dados serão perdidos para sempre.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setLeadToDelete(null);
              }}
              className="border-gray-300 hover:bg-gray-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDeleteLead}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Conversão de Lead em Oportunidade */}
      <ConvertLeadToOpportunityModal
        open={isConvertModalOpen}
        onOpenChange={setIsConvertModalOpen}
        lead={leadToConvert}
        onSuccess={handleConvertSuccess}
      />
    </div>
  );
}
