"use client"

import { useEffect, useState } from 'react'
import { getPendingClientRequests, ClientRequest } from '@/lib/services/clientRequestService.supabase'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { useClientRequests } from '@/lib/contexts/ClientRequestContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from 'date-fns/format'
import { ptBR } from 'date-fns/locale'
import { Building2, Users, Check, X, Shield, Search, Download, LayoutGrid, LayoutList, ChevronDown, ChevronUp, Mail, Phone, Calendar, Edit, DollarSign, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from '@/lib/hooks/useAuth'
import { BlockUserModal } from '@/components/modals/BlockUserModal'
import UnblockUserModal from '@/components/modals/UnblockUserModal'
import { BlockStatusBadge } from '@/components/ui/block-status-badge'
import { useClients, Client } from '@/hooks/useClients'
import { devLog } from "@/lib/utils/productionLogger";
import { useBlockUser } from '@/hooks/useBlockUser'
import { EditClientModal } from '@/components/admin/EditClientModal'
import { ClientBillingModal } from '@/components/admin/ClientBillingModal'
import { ClientSubscriptionsTab } from '@/components/admin/ClientSubscriptionsTab'
import { AdminCreateClientModal } from '@/components/modals/AdminCreateClientModal'

export default function ClientesPage() {
  const { user } = useAuth()
  const { updateCounterOptimistic, refreshPendingCount } = useClientRequests()
  const [requests, setRequests] = useState<ClientRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  
  // Novos hooks para gerenciamento de clientes
  const { 
    clients, 
    loading: clientsLoading, 
    error: clientsError,
    refreshClients,
    updateClientOptimistic,
    revertOptimisticUpdate
  } = useClients()
  
  const { isLoading: isBlockingUser, blockUser, unblockUser } = useBlockUser()
  
  // Estados para bloqueio de usuários
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false)

  // ✅ Novos estados para melhorias de UX
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards') // Toggle entre cards e tabela
  const [isRequestsCollapsed, setIsRequestsCollapsed] = useState(false) // Colapsar seção de solicitações

  // Estados para edição de cliente
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)

  // Estados para gerenciamento de faturamento
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false)
  const [clientForBilling, setClientForBilling] = useState<Client | null>(null)

  // Estado para controle de abas
  const [activeTab, setActiveTab] = useState<'cadastros' | 'assinaturas'>('cadastros')

  // Estado para modal de criação de cliente
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false)

  const fetchRequests = async () => {
    setLoading(true)
    setError(null)
    setDebugInfo(null)
    
    try {
      // Check if user is admin
      const isAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
      if (!isAdmin) {
        setError('Você não tem permissão para acessar esta página')
        setLoading(false)
        return
      }
      
      devLog.log('Fetching client requests...', { 
        isAdmin, 
        role: user?.profile?.role,
        uid: user?.id
      })
      
      devLog.log('Calling getPendingClientRequests...')
      
      const data = await getPendingClientRequests()
      devLog.log('Fetched client requests:', data)
      
      setRequests(data)
      
      // Atualizar contador no contexto
      setTimeout(() => refreshPendingCount(), 500)
      
      if (data.length === 0) {
        setDebugInfo('Nenhuma solicitação pendente encontrada.')
      }
    } catch (error: any) {
      devLog.error('Error fetching requests:', error)
      
      // Handle quota exceeded error specifically
      if (error.message && error.message.includes('quota-exceeded')) {
        setError('Limite de requisições excedido. Por favor, aguarde alguns minutos e tente novamente.')
        setDebugInfo('O banco de dados está limitando as chamadas de API devido ao alto volume de requisições. Este é um limite temporário e será restaurado automaticamente.')
      } else {
        setError(error.message || 'Erro ao carregar solicitações')
        setDebugInfo(`Detalhes do erro: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`)
      }
      
      toast({
        title: "Erro ao carregar solicitações",
        description: error.message || "Não foi possível carregar as solicitações de cadastro. Tente recarregar a página.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      await fetchRequests();
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    if (user) {
      fetchRequests()
    }
  }, [user])

  const handleApprove = async (request: ClientRequest) => {
    try {
      // Atualização otimística do contador
      updateCounterOptimistic(-1)
      
      // Chamar API route para aprovação
      const response = await fetch('/api/admin/client-requests/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: request.id })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao aprovar cadastro');
      }
      
      toast({
        title: "Cadastro aprovado",
        description: "O usuário será notificado por email",
      })

      // Refresh explícito da página para garantir dados atualizados
      window.location.reload()
    } catch (error: any) {
      devLog.error('Error approving request:', error)
      
      // Rollback do contador se falhou
      updateCounterOptimistic(1)
      
      toast({
        title: "Erro ao aprovar cadastro",
        description: error.message || "Não foi possível aprovar o cadastro",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (request: ClientRequest) => {
    try {
      // Atualização otimística do contador
      updateCounterOptimistic(-1)
      
      // Chamar API route para rejeição
      const response = await fetch('/api/admin/client-requests/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId: request.id, reason: 'Solicitação rejeitada pelo admin' })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao rejeitar cadastro');
      }
      
      toast({
        title: "Cadastro rejeitado",
        description: "O usuário será notificado por email",
      })
      
      // Atualizar lista de solicitações, contador e clientes ativos
      fetchRequests()
      refreshClients() // ✅ Atualiza lista de clientes ativos automaticamente
      setTimeout(() => refreshPendingCount(), 500)
    } catch (error: any) {
      devLog.error('Error rejecting request:', error)
      
      // Rollback do contador se falhou
      updateCounterOptimistic(1)
      
      toast({
        title: "Erro ao rejeitar cadastro",
        description: error.message || "Não foi possível rejeitar o cadastro",
        variant: "destructive",
      })
    }
  }

  // Funções para bloqueio/desbloqueio de usuários (agora usando hooks)
  const handleBlockUser = (client: Client) => {
    setSelectedClient(client)
    setIsBlockModalOpen(true)
  }

  const handleUnblockUser = (client: Client) => {
    setSelectedClient(client)
    setIsUnblockModalOpen(true)
  }

  const confirmBlockUser = async (reason: string) => {
    if (!selectedClient) return
    await blockUser(selectedClient, reason)
  }

  const confirmUnblockUser = async () => {
    if (!selectedClient) return
    await unblockUser(selectedClient)
  }

  // Função para abrir modal de edição
  const handleEditClient = (client: Client) => {
    devLog.log('[ClientesPage] Abrindo modal de edição para cliente:', client)
    setClientToEdit(client)
    setIsEditModalOpen(true)
  }

  // Callback após sucesso na edição
  const handleEditSuccess = () => {
    devLog.log('[ClientesPage] Cliente editado com sucesso, atualizando lista')
    refreshClients() // Atualiza lista de clientes
  }

  // Função para abrir modal de gerenciamento de faturamento
  const handleManageBilling = (client: Client) => {
    devLog.log('[ClientesPage] Abrindo modal de faturamento para cliente:', client)
    setClientForBilling(client)
    setIsBillingModalOpen(true)
  }

  // Combinar loading states
  const isLoading = loading || clientsLoading
  const displayError = error || clientsError

  // ✅ Filtrar clientes baseado na busca
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (client.phone && client.phone.includes(searchQuery))
  )

  // ✅ Função para exportar clientes como CSV
  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Tipo', 'Status', 'Data de Cadastro']
    const rows = filteredClients.map(client => [
      client.name,
      client.email,
      client.phone || '',
      client.isCompany ? 'Empresa' : 'Pessoa Física',
      client.isBlocked ? 'Bloqueado' : 'Ativo',
      format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()

    toast({
      title: "CSV exportado",
      description: `${filteredClients.length} clientes exportados com sucesso`,
    })
  }

  // ✅ Função para gerar avatar colorido
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-orange-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // ✅ Função para extrair iniciais
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user?.profile?.role || (user.profile.role !== 'admin' && user.profile.role !== 'superadmin')) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <div className="h-4 w-4" />
          <AlertTitle>Acesso negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Esta página é restrita a administradores.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (displayError) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="mb-6">
          <div className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {displayError}
            {debugInfo && (
              <div className="mt-2 text-sm opacity-80">
                {debugInfo}
              </div>
            )}
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={isRetrying}
                className="gap-2"
              >
                {isRetrying ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                ) : null}
                Tentar novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Clientes
          </h1>
          <p className="mt-2 text-blue-100">
            Gerenciamento de Clientes
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30"></div>
      </div>

      <div className="mb-8">
        <nav className="flex space-x-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('cadastros')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'cadastros'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Cadastros
          </button>
          <button
            onClick={() => setActiveTab('assinaturas')}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              activeTab === 'assinaturas'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Assinaturas
          </button>
        </nav>
      </div>

      {activeTab === 'cadastros' && (
        <div>
          <>
        {/* Pending Requests Section - Colapsável */}
        <div className="mb-8">
          <button
            onClick={() => setIsRequestsCollapsed(!isRequestsCollapsed)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                {requests.length}
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Solicitações de Cadastro
                  {requests.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                      {requests.length} pendente{requests.length > 1 ? 's' : ''}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {requests.length > 0
                    ? 'Clique para ver solicitações pendentes de aprovação'
                    : 'Nenhuma solicitação aguardando aprovação'}
                </p>
              </div>
            </div>
            {isRequestsCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {/* Conteúdo colapsável */}
          {!isRequestsCollapsed && requests.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="dark:border-gray-700">
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id} className="group dark:border-gray-700">
                      <TableCell>
                        {format(new Date(request.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{request.name}</TableCell>
                      <TableCell>{request.email}</TableCell>
                      <TableCell>{request.phone}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {request.isCompany ? (
                            <>
                              <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                              <span>Empresa</span>
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                              <span>Pessoa Física</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500 dark:text-orange-400">Pendente</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                            onClick={() => setSelectedRequest(request)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Existing Clients Section */}
        <div>
          {/* Header com título */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clientes Ativos</h2>
            <p className="text-gray-600 dark:text-gray-400">Gerencie os clientes já cadastrados na plataforma</p>
          </div>

          {/* ✅ Barra de Ferramentas: Busca, Filtros, Toggle View, Export CSV */}
          <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Busca */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2">
                {/* Estatísticas */}
                <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    <span className="font-semibold text-gray-900 dark:text-white">{filteredClients.length}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      {filteredClients.length === 1 ? 'cliente' : 'clientes'}
                    </span>
                  </div>
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                  <div className="text-sm">
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {filteredClients.filter(c => !c.isBlocked).length}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">ativos</span>
                  </div>
                </div>

                {/* Toggle View */}
                <div className="flex items-center bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className={`rounded-r-none ${viewMode === 'cards' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`rounded-l-none ${viewMode === 'table' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''}`}
                    title="Visualização em Tabela"
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>

                {/* Export CSV */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredClients.length === 0}
                  className="gap-2"
                  title="Exportar como CSV"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </Button>

                {/* Novo Cliente */}
                <Button
                  size="sm"
                  onClick={() => setIsCreateClientModalOpen(true)}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Novo Cliente</span>
                </Button>
              </div>
            </div>

            {/* Resultado da busca */}
            {searchQuery && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {filteredClients.length === 0 ? (
                  <span>Nenhum cliente encontrado para "{searchQuery}"</span>
                ) : (
                  <span>
                    Exibindo {filteredClients.length} de {clients.length} cliente{clients.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          {filteredClients.length > 0 ? (
            <>
              {/* ✅ VIEW MODE: CARDS */}
              {viewMode === 'cards' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClients.map((client) => (
                    <Card key={client.id} className="hover:shadow-lg transition-all duration-200 border-gray-200">
                      <CardHeader className="pb-4">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white font-semibold text-lg shadow-md`}>
                            {getInitials(client.name)}
                          </div>

                          {/* Nome e Tipo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                                {client.name}
                              </CardTitle>
                            </div>

                            {/* Badge de Tipo */}
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              {client.isCompany ? (
                                <>
                                  <Building2 className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Empresa</span>
                                </>
                              ) : (
                                <>
                                  <Users className="h-3.5 w-3.5 text-purple-500" />
                                  <span>Pessoa Física</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Botões de Ação */}
                          <div className="flex items-center gap-1">
                            {/* Botão Editar */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClient(client)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                              title="Editar Cliente"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            {/* Botão de Bloqueio/Desbloqueio */}
                            {client.isBlocked ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnblockUser(client)}
                                disabled={isBlockingUser}
                                className="h-8 w-8 p-0 hover:bg-green-50 text-green-600 hover:text-green-700"
                                title="Desbloquear Cliente"
                              >
                                {isBlockingUser ? (
                                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleBlockUser(client)}
                                disabled={isBlockingUser}
                                className="h-8 w-8 p-0 hover:bg-red-50 text-red-600 hover:text-red-700"
                                title="Bloquear Cliente"
                              >
                                {isBlockingUser ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Shield className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 pt-0">
                        {/* Informações de Contato */}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Mail className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>

                          {client.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                              {client.phone}
                            </div>
                          )}

                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>

                        {/* Status */}
                        <div className="border-t pt-4">
                          <BlockStatusBadge
                            isBlocked={client.isBlocked || false}
                            size="md"
                            variant="default"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* ✅ VIEW MODE: TABLE */}
              {viewMode === 'table' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="dark:border-gray-700">
                        <TableHead>Nome</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data de Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                    <TableRow key={client.id} className="group dark:border-gray-700">
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Email:</span>
                          {client.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 dark:text-gray-400">Tel:</span>
                          {client.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {client.isCompany ? (
                            <>
                              <Building2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                              <span>Empresa</span>
                              {client.razaoSocial && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">({client.razaoSocial})</span>
                              )}
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                              <span>Pessoa Física</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <BlockStatusBadge 
                          isBlocked={client.isBlocked || false} 
                          size="sm" 
                          variant="subtle"
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botão Editar */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            onClick={() => handleEditClient(client)}
                          >
                            <Edit className="w-4 h-4" />
                            Editar
                          </Button>

                          {/* Botão Bloquear/Desbloquear */}
                          {client.isBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30"
                              onClick={() => handleUnblockUser(client)}
                              disabled={isBlockingUser}
                            >
                              {isBlockingUser ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                              Desbloquear
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                              onClick={() => handleBlockUser(client)}
                              disabled={isBlockingUser}
                            >
                              {isBlockingUser ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4" />
                              )}
                              Bloquear
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm p-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum cliente cadastrado</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Não há clientes ativos cadastrados na plataforma.
                </p>
              </div>
            </div>
          )}
        </div>
          </>
        </div>
      )}

      {activeTab === 'assinaturas' && (
        <div>
          <ClientSubscriptionsTab />
        </div>
      )}

        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes da Solicitação</DialogTitle>
              <DialogDescription>
                Informações completas do pedido de cadastro
              </DialogDescription>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Informações Pessoais</h4>
                  <div className="mt-2 space-y-2">
                    <p><strong>Nome:</strong> {selectedRequest.name}</p>
                    <p><strong>Email:</strong> {selectedRequest.email}</p>
                    <p><strong>Telefone:</strong> {selectedRequest.phone}</p>
                    {!selectedRequest.isCompany && selectedRequest.cpf && (
                      <p><strong>CPF:</strong> {selectedRequest.cpf}</p>
                    )}
                  </div>
                </div>
                {selectedRequest.isCompany && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Informações da Empresa</h4>
                    <div className="mt-2 space-y-2">
                      <p><strong>Empresa:</strong> {selectedRequest.razaoSocial}</p>
                      <p><strong>CNPJ:</strong> {selectedRequest.cnpj}</p>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</h4>
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-500 dark:text-orange-400">Pendente</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    className="gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                    onClick={() => {
                      handleApprove(selectedRequest)
                      setSelectedRequest(null)
                    }}
                  >
                    <Check className="w-4 h-4" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                    onClick={() => {
                      handleReject(selectedRequest)
                      setSelectedRequest(null)
                    }}
                  >
                    <X className="w-4 h-4" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modais de Bloqueio/Desbloqueio */}
        {selectedClient && (
          <>
            <BlockUserModal
              isOpen={isBlockModalOpen}
              onClose={() => {
                setIsBlockModalOpen(false)
                setSelectedClient(null)
              }}
              onConfirm={confirmBlockUser}
              user={{
                id: selectedClient.id,
                name: selectedClient.name,
                email: selectedClient.email,
              }}
              isLoading={isBlockingUser}
            />

            <UnblockUserModal
              isOpen={isUnblockModalOpen}
              onClose={() => {
                setIsUnblockModalOpen(false)
                setSelectedClient(null)
              }}
              onConfirm={confirmUnblockUser}
              user={{
                id: selectedClient.id,
                name: selectedClient.name,
                email: selectedClient.email,
                blockedReason: selectedClient.blockedReason,
              }}
              isLoading={isBlockingUser}
            />
          </>
        )}

        {/* Modal de Edição de Cliente */}
        <EditClientModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          client={clientToEdit}
          onSuccess={handleEditSuccess}
        />

      {/* Modal de Gerenciamento de Faturamento */}
      <ClientBillingModal
        open={isBillingModalOpen}
        onOpenChange={setIsBillingModalOpen}
        clientId={clientForBilling?.id || null}
        clientName={clientForBilling?.name || null}
      />

      {/* Modal de Criação de Cliente pelo Admin */}
      <AdminCreateClientModal
        open={isCreateClientModalOpen}
        onOpenChange={setIsCreateClientModalOpen}
        onSuccess={refreshClients}
      />
    </div>
  )
} 