'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Project } from "@/types/project"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Archive,
  Search,
  RotateCcw,
  Trash2,
  AlertCircle,
  Package,
  Calendar,
  User
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/utils/productionLogger"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface ArchivedProject extends Project {
  deleted_at: string
  deleted_by: string
}

export default function ArquivadosPage() {
  const router = useRouter()
  const { user, authState } = useAuth()
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<ArchivedProject | null>(null)
  const [actionType, setActionType] = useState<'restore' | 'delete' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const isSuperAdmin = user?.profile?.role === 'superadmin'
  const isAdmin = user?.profile?.role === 'admin'
  const canDeletePermanently = isSuperAdmin || isAdmin

  // Buscar projetos arquivados
  useEffect(() => {
    if (user?.id) {
      fetchArchivedProjects()
    }
  }, [user?.id])

  const fetchArchivedProjects = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper')
      const headers = await createTenantHeaders(user.id)

      const response = await fetch('/api/projects/archived', {
        method: 'GET',
        headers,
      })

      if (response.ok) {
        const result = await response.json()
        devLog.log('[Arquivados] Projetos recebidos:', result)
        setArchivedProjects(result.data || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        devLog.error('[Arquivados] Erro na resposta:', { status: response.status, errorData })
        throw new Error(errorData.error || 'Erro ao buscar projetos arquivados')
      }
    } catch (error) {
      devLog.error('[Arquivados] Erro ao buscar projetos:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os projetos arquivados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (project: ArchivedProject) => {
    setSelectedProject(project)
    setActionType('restore')
  }

  const handleDelete = async (project: ArchivedProject) => {
    setSelectedProject(project)
    setActionType('delete')
  }

  const confirmAction = async () => {
    if (!selectedProject || !actionType) return

    try {
      setIsProcessing(true)
      const { createTenantHeaders } = await import('@/lib/utils/tenant-helper')
      const headers = await createTenantHeaders(user!.id)

      const endpoint = actionType === 'restore'
        ? `/api/projects/${selectedProject.id}/restore`
        : `/api/projects/${selectedProject.id}/permanent-delete`

      const response = await fetch(endpoint, {
        method: actionType === 'restore' ? 'POST' : 'DELETE',
        headers,
      })

      if (response.ok) {
        const projectName = selectedProject.nome_cliente_final || selectedProject.nomeClienteFinal || selectedProject.name || 'Sem nome'
        const projectNumber = selectedProject.number || selectedProject.project_number || 'N/A'

        toast({
          title: actionType === 'restore' ? "Projeto restaurado" : "Projeto excluído",
          description: actionType === 'restore'
            ? `O projeto "${projectNumber} - ${projectName}" foi restaurado com sucesso.`
            : `O projeto "${projectNumber} - ${projectName}" foi excluído permanentemente.`,
        })

        // Atualizar lista
        fetchArchivedProjects()
      } else {
        throw new Error('Erro ao processar ação')
      }
    } catch (error) {
      devLog.error('[Arquivados] Erro ao processar ação:', error)
      toast({
        title: "Erro",
        description: `Não foi possível ${actionType === 'restore' ? 'restaurar' : 'excluir'} o projeto.`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setSelectedProject(null)
      setActionType(null)
    }
  }

  // Filtrar projetos por busca
  const filteredProjects = archivedProjects.filter(project => {
    const searchLower = searchQuery.toLowerCase()
    const projectName = project.nome_cliente_final || project.nomeClienteFinal || project.name || ''
    const projectNumber = project.number || project.project_number || ''
    const clientName = project.nome_cliente_final || project.nomeClienteFinal || project.client?.name || ''

    return (
      projectName.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower) ||
      projectNumber.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Aguardar autenticação completa antes de renderizar conteúdo sensível
  if (authState !== 'authenticated' || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Gradiente (seguindo padrão das outras páginas) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold">
              Projetos Arquivados
            </h1>
            <p className="mt-2 text-blue-100">
              Gerencie projetos que foram arquivados
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/2 -mb-8 h-32 w-32 rounded-full bg-white/10 blur-3xl"></div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, cliente ou número do projeto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Arquivados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {archivedProjects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resultados da Busca</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredProjects.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Seu Perfil</p>
                <Badge
                  variant="default"
                  className="mt-1 bg-orange-500 hover:bg-orange-600 text-white"
                >
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center">
              <Archive className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {searchQuery ? 'Nenhum projeto encontrado' : 'Nenhum projeto arquivado'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? 'Tente ajustar sua busca para encontrar o que procura.'
                  : 'Projetos arquivados aparecerão aqui.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {project.nome_cliente_final || project.nomeClienteFinal || project.name || 'Sem nome'}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {project.number || project.project_number || 'N/A'}
                      </Badge>
                    </div>

                    {/* Proprietário do projeto */}
                    <div className="flex items-center gap-2 mb-3 text-sm text-gray-500 dark:text-gray-400">
                      <User className="h-3.5 w-3.5" />
                      <span className="truncate">
                        Proprietário: <span className="font-medium text-gray-700 dark:text-gray-300">
                          {project.empresa_integradora || project.empresaIntegradora || 'Não definido'}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>Arquivado em {formatDate(project.deleted_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Archive className="h-4 w-4" />
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: project.status_info?.color ? `${project.status_info.color}20` : undefined,
                            color: project.status_info?.color || undefined,
                            borderColor: project.status_info?.color || undefined
                          }}
                        >
                          {project.status_info?.name || project.status || 'Sem status'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(project)}
                      className="gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restaurar
                    </Button>

                    {canDeletePermanently && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(project)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Info Box for Admin and Super Admin */}
      {canDeletePermanently && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">
                Atenção: Exclusão Permanente
              </h4>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Como {isSuperAdmin ? 'Super Administrador' : 'Administrador'}, você pode excluir projetos permanentemente.
                Esta ação é irreversível e removerá todos os dados, documentos e histórico do projeto.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => {
        setActionType(null)
        setSelectedProject(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'restore' ? 'Restaurar projeto?' : 'Excluir permanentemente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'restore' ? (
                <>
                  Tem certeza que deseja restaurar o projeto{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedProject?.number || selectedProject?.project_number || 'N/A'}
                    {' - '}
                    {selectedProject?.nome_cliente_final || selectedProject?.nomeClienteFinal || selectedProject?.name || 'Sem nome'}
                  </span>
                  ? Ele voltará para a listagem normal de projetos.
                </>
              ) : (
                <>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Esta ação não pode ser desfeita!
                  </span>
                  <br /><br />
                  Você está prestes a excluir permanentemente o projeto{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedProject?.number || selectedProject?.project_number || 'N/A'}
                    {' - '}
                    {selectedProject?.nome_cliente_final || selectedProject?.nomeClienteFinal || selectedProject?.name || 'Sem nome'}
                  </span>
                  . Todos os dados, documentos e histórico serão perdidos para sempre.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isProcessing}
              className={cn(
                actionType === 'delete' && "bg-red-500 hover:bg-red-600"
              )}
            >
              {isProcessing
                ? (actionType === 'restore' ? 'Restaurando...' : 'Excluindo...')
                : (actionType === 'restore' ? 'Restaurar' : 'Excluir Permanentemente')
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
