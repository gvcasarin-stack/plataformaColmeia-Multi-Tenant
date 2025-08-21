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
import { Building2, Users, Check, X, Shield } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useAuth } from '@/lib/hooks/useAuth'
import { BlockUserModal } from '@/components/modals/BlockUserModal'
import UnblockUserModal from '@/components/modals/UnblockUserModal'
import { BlockStatusBadge } from '@/components/ui/block-status-badge'
import { useClients, Client } from '@/hooks/useClients'
import { devLog } from "@/lib/utils/productionLogger";
import { useBlockUser } from '@/hooks/useBlockUser'

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
      
      // Atualizar lista de solicitações, contador e clientes ativos
      fetchRequests()
      refreshClients() // ✅ Atualiza lista de clientes ativos automaticamente
      setTimeout(() => refreshPendingCount(), 500)
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

  // Combinar loading states
  const isLoading = loading || clientsLoading
  const displayError = error || clientsError

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

      <div className="p-6 bg-white dark:bg-gray-900">
        {/* Pending Requests Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Solicitações de Cadastro</h2>
              <p className="text-gray-600 dark:text-gray-400">Gerencie as solicitações de novos clientes</p>
            </div>
          </div>

          {requests.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm mb-8">
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
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm p-8 text-center mb-8">
              <div className="flex flex-col items-center gap-2">
                <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma solicitação pendente</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Não há solicitações de cadastro aguardando aprovação.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Existing Clients Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Clientes Ativos</h2>
              <p className="text-gray-600 dark:text-gray-400">Gerencie os clientes já cadastrados na plataforma</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshClients}
              disabled={clientsLoading}
              className="gap-2"
            >
              {clientsLoading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
              ) : null}
              Atualizar
            </Button>
          </div>

          {clients.length > 0 ? (
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
                  {clients.map((client) => (
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
      </div>
    </div>
  )
}
