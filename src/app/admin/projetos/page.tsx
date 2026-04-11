'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Project } from "@/types/project"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { User, AlertCircle, Users, CheckCircle2, PlusCircle, RotateCcw, Menu, ChevronDown } from 'lucide-react'

import { ProjectTable } from "@/features/projects"
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/utils/productionLogger";
import React from 'react'
import { TrialExpiredBlocker } from '@/components/security/TrialExpiredBlocker'
import { canViewProjects, canCreateProjects } from '@/lib/utils/check-permissions'
import { saveProjectFilters, getProjectFilters, resetProjectFilters, type ProjectFiltersPreference } from '@/lib/services/userPreferencesService'

// ✅ CORREÇÃO: Importar KanbanBoard diretamente (sem lazy loading)
// O lazy loading com ssr:false estava causando race condition na exibição dos badges
import { KanbanBoard } from "@/components/kanban"

// Lazy load AddColumnDialog component
const AddColumnDialog = dynamic(() => import("@/components/kanban").then(mod => ({ default: mod.AddColumnDialog })),
{
  ssr: false
});

// 🆕 Importar modal de criação de projeto
import { ClientCreateProjectModal } from '@/components/client/create-project-modal';



interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

type FilterType = 'todos' | 'meus' | 'sem-responsavel'

export default function ProjetosPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { projects, updateProject } = useProjects()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [organization, setOrganization] = useState<any>(null)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [modalClosed, setModalClosed] = useState(false)
  const [closeCount, setCloseCount] = useState(0)

  // ✅ Estados para filtros
  const [filterType, setFilterType] = useState<FilterType>('todos')
  const [selectedResponsible, setSelectedResponsible] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  // ✅ Estado para ordenação do Kanban
  const [sortBy, setSortBy] = useState<string>('manual')

  // 🆕 Estado para controlar se preferências já foram carregadas
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  // 🆕 Estado para modal de criação de projeto
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)

  // Estado de expansão do header (persiste no localStorage)
  const [headerExpanded, setHeaderExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('projetos-header-expanded') !== 'false'
    }
    return true
  })

  const toggleHeader = () => {
    setHeaderExpanded(prev => {
      const next = !prev
      localStorage.setItem('projetos-header-expanded', String(next))
      return next
    })
  }

  const viewKanbanRef = React.useRef<{ reloadColumnTitles: () => Promise<boolean> }>(null)

  // Verificar status do trial ao carregar a página
  useEffect(() => {
    const checkTrialStatus = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper')
        const headers = await createTenantHeaders(user.id)
        
        const response = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers,
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const orgData = result.data
            setOrganization(orgData)
            
            // Verificar se trial expirou (usando campo padronizado)
            const now = new Date()
            const trialEnd = new Date(orgData.trial_end_date)
            const isExpired = orgData.is_trial && now > trialEnd
            
            setIsTrialExpired(isExpired && orgData.subscription_status !== 'active')
            
            devLog.log('[ProjetosPage] Status do trial:', {
              isTrialExpired: isExpired,
              subscriptionStatus: orgData.subscription_status,
              trialEndsAt: orgData.trial_end_date
            })
          }
        }
      } catch (error) {
        devLog.error('[ProjetosPage] Erro ao verificar trial:', error)
      } finally {
        setLoading(false)
      }
    }

    checkTrialStatus()
  }, [user?.id])

  // 🆕 Carregar preferências salvas ao montar o componente
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id || !organization?.id) return

      try {
        const savedPreferences = await getProjectFilters(user.id, organization.id)

        if (savedPreferences) {
          devLog.log('[ProjetosPage] Preferências carregadas:', savedPreferences)
          setFilterType(savedPreferences.filterType || 'todos')
          setSelectedResponsible(savedPreferences.selectedResponsible || '')
          setSortBy(savedPreferences.sortBy || 'manual')
          if (savedPreferences.viewMode) {
            setViewMode(savedPreferences.viewMode)
          }
        }
      } catch (error) {
        devLog.error('[ProjetosPage] Erro ao carregar preferências:', error)
      } finally {
        setPreferencesLoaded(true)
      }
    }

    loadPreferences()
  }, [user?.id, organization?.id])

  // ✅ Buscar membros da equipe para o filtro
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!user) return

      setLoadingMembers(true)
      try {
        const response = await fetch('/api/admin/team-members', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          setTeamMembers(result.data || [])
        }
      } catch (error) {
        devLog.error('[ProjetosPage] Erro ao buscar membros:', error)
      } finally {
        setLoadingMembers(false)
      }
    }

    fetchTeamMembers()
  }, [user])

  // ✅ Filtrar projetos com base em busca + filtro de responsável
  const filteredProjects = useMemo(() => {
    let result = projects;

    // 1. Aplicar filtro de responsável
    if (filterType === 'meus') {
      // Mostrar apenas projetos do usuário logado
      result = result.filter(project => project.adminResponsibleId === user?.id)
    } else if (filterType === 'sem-responsavel') {
      // Mostrar apenas projetos sem responsável
      result = result.filter(project => !project.adminResponsibleId)
    } else if (selectedResponsible) {
      // Filtro por responsável específico do dropdown
      result = result.filter(project => project.adminResponsibleId === selectedResponsible)
    }

    // 2. Aplicar busca textual (projetos, comentários, materiais, etc.)
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(project => {
        // Busca nos campos principais do projeto
        const matchesBasicFields =
          project.number.toLowerCase().includes(searchLower) ||
          project.nomeClienteFinal.toLowerCase().includes(searchLower) ||
          project.empresaIntegradora.toLowerCase().includes(searchLower);

        // Busca na lista de materiais
        const matchesMaterials = project.listaMateriais?.toLowerCase().includes(searchLower);

        // Busca nos comentários e eventos da timeline
        const matchesTimeline = project.timelineEvents?.some(event =>
          event.content?.toLowerCase().includes(searchLower)
        );

        return matchesBasicFields || matchesMaterials || matchesTimeline;
      });
    }

    return result;
  }, [projects, searchQuery, filterType, selectedResponsible, user?.id]);

  // ✅ Calcular contadores para os chips
  const filterCounts = useMemo(() => ({
    todos: projects.length,
    meus: projects.filter(p => p.adminResponsibleId === user?.id).length,
    semResponsavel: projects.filter(p => !p.adminResponsibleId).length
  }), [projects, user?.id]);

  // 🆕 Salvar preferências automaticamente quando mudarem
  useEffect(() => {
    // Não salvar antes de carregar as preferências iniciais
    if (!preferencesLoaded || !user?.id || !organization?.id) return

    const savePreferences = async () => {
      try {
        const preferences: ProjectFiltersPreference = {
          filterType,
          selectedResponsible: selectedResponsible || undefined,
          sortBy: sortBy as any,
          viewMode
        }

        await saveProjectFilters(preferences, user.id, organization.id)
        devLog.log('[ProjetosPage] Preferências salvas:', preferences)
      } catch (error) {
        devLog.error('[ProjetosPage] Erro ao salvar preferências:', error)
      }
    }

    savePreferences()
  }, [filterType, selectedResponsible, sortBy, viewMode, preferencesLoaded, user?.id, organization?.id])

  // ✅ Handlers dos filtros
  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type)
    setSelectedResponsible('') // Limpar dropdown ao mudar chip
  }

  const handleResponsibleChange = (value: string) => {
    if (value === 'clear') {
      setSelectedResponsible('')
      setFilterType('todos')
    } else {
      setSelectedResponsible(value)
      setFilterType('todos') // Voltar para "todos" quando seleciona no dropdown
    }
  }

  // 🆕 Handler para resetar filtros
  const handleResetFilters = async () => {
    try {
      setFilterType('todos')
      setSelectedResponsible('')
      setSortBy('manual')

      if (user?.id && organization?.id) {
        await resetProjectFilters(user.id, organization.id)
        devLog.log('[ProjetosPage] Filtros resetados')
      }

      toast({
        title: "Filtros resetados",
        description: "Os filtros foram redefinidos para o padrão.",
        className: "bg-blue-500 text-white"
      })
    } catch (error) {
      devLog.error('[ProjetosPage] Erro ao resetar filtros:', error)
    }
  }

  const handleProjectClick = (project: Project) => {
    router.push(`/projetos/${project.id}`);
  }

  // 🆕 Handler para criar projeto (admin)
  const { addProject } = useProjects()

  const handleCreateProject = async (data: any) => {
    try {
      devLog.log('[ProjetosPage] Criando projeto como admin:', data)

      const result = await addProject(data)

      if (result) {
        toast({
          title: "Projeto criado!",
          description: `Projeto ${result.number} criado com sucesso.`,
          className: "bg-green-500 text-white"
        })
        setShowCreateProjectModal(false)
      }
    } catch (error: any) {
      devLog.error('[ProjetosPage] Erro ao criar projeto:', error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar projeto",
        variant: "destructive"
      })
    }
  }



  // Se trial expirado, mostrar bloqueio
  if (isTrialExpired) {
    return (
      <TrialExpiredBlocker
        message="A gestão de projetos está bloqueada"
        blockedFeature="a gestão de projetos"
        showProjectStats={true}
        onClose={() => {
          // Permitir fechar mas redirecionar para assinaturas
          router.push('/admin/assinaturas');
        }}
      />
    )
  }

  // ✅ Verificar permissões de acesso (implícito: se pode criar OU editar, pode visualizar)
  // Se não tem permissão, bloquear acesso
  if (!canViewProjects(user)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar a gestão de projetos.
          </p>
          <Button
            onClick={() => router.push('/admin/painel')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Voltar ao Painel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className={cn("relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center", headerExpanded ? "p-8" : "px-8 py-5")}>
          <div>
            <h1 className={cn("font-bold", headerExpanded ? "text-3xl" : "text-2xl")}>
              Projetos
            </h1>
            <p className={cn("text-blue-100", headerExpanded ? "mt-2" : "mt-0.5 text-sm")}>
              Gerencie todos os projetos do sistema
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 mt-4 md:mt-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 text-white hover:text-white",
                    viewMode === 'kanban' && "bg-white/20 shadow-sm"
                  )}
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 text-white hover:text-white",
                    viewMode === 'table' && "bg-white/20 shadow-sm"
                  )}
                  onClick={() => setViewMode('table')}
                >
                  Tabela
                </Button>
              </div>
              <button
                onClick={toggleHeader}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title={headerExpanded ? 'Minimizar header' : 'Expandir header'}
              >
                {headerExpanded ? <Menu className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {headerExpanded && <div className="mt-2 flex items-center gap-3">
              <AddColumnDialog
                onColumnAdded={async (columnId, columnName) => {
                  // Mostrar toast de sucesso
                  toast({
                    title: "Coluna adicionada",
                    description: `A coluna "${columnName}" foi adicionada com sucesso. Recarregando página...`,
                    className: "bg-green-500 text-white"
                  })

                  // ✅ SOLUÇÃO SIMPLES: Aguardar um pouco e fazer refresh da página
                  await new Promise(resolve => setTimeout(resolve, 1500))

                  // Refresh da página para mostrar a nova coluna
                  window.location.reload()
                }}
              />

              {/* 🆕 Botão Novo Projeto (admin, superadmin ou colaborador com permissão) */}
              {canCreateProjects(user) && (
                <Button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                  size="default"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Novo Projeto
                </Button>
              )}
            </div>}
          </div>
        </div>

        {/* Search bar + filters — visíveis apenas quando expandido */}
        {headerExpanded && <div className="px-8 pb-8 z-10 relative"><div className="relative max-w-md">
          <Input
            placeholder="Buscar projetos, comentários, materiais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 bg-white/10 border-white/20 text-white placeholder:text-blue-100 focus:bg-white/20 focus:border-orange-300/50"
          />
        </div>

        {/* ✅ Filtros de Responsável */}
        <div className="mt-6 space-y-4">
          {/* Chips de filtro rápido */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm text-blue-100">Filtrar por:</p>
              {/* 🆕 Botão Resetar Filtros */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-blue-100 hover:text-white hover:bg-white/10 transition-all duration-200 h-7 px-2 py-1 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetar Filtros
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Chip: Todos */}
              <button
                onClick={() => handleFilterTypeChange('todos')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200",
                  filterType === 'todos' && !selectedResponsible
                    ? "bg-white/20 border-white/40 text-white shadow-lg"
                    : "bg-white/5 border-white/10 text-blue-100 hover:bg-white/10"
                )}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Todos</span>
                <Badge variant="secondary" className="bg-white/20 text-white border-none ml-1">
                  {filterCounts.todos}
                </Badge>
              </button>

              {/* Chip: Meus Projetos */}
              <button
                onClick={() => handleFilterTypeChange('meus')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200",
                  filterType === 'meus'
                    ? "bg-blue-100 border-blue-300 text-blue-700 shadow-lg"
                    : "bg-white/5 border-white/10 text-blue-100 hover:bg-white/10"
                )}
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Meus Projetos</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-none ml-1",
                    filterType === 'meus'
                      ? "bg-blue-200 text-blue-800"
                      : "bg-white/20 text-white"
                  )}
                >
                  {filterCounts.meus}
                </Badge>
              </button>

              {/* Chip: Sem Responsável */}
              <button
                onClick={() => handleFilterTypeChange('sem-responsavel')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200",
                  filterType === 'sem-responsavel'
                    ? "bg-orange-100 border-orange-300 text-orange-700 shadow-lg"
                    : "bg-white/5 border-white/10 text-blue-100 hover:bg-white/10"
                )}
              >
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Sem Responsável</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "border-none ml-1",
                    filterType === 'sem-responsavel'
                      ? "bg-orange-200 text-orange-800"
                      : "bg-white/20 text-white"
                  )}
                >
                  {filterCounts.semResponsavel}
                </Badge>
              </button>
            </div>
          </div>

          {/* Dropdown de filtro por responsável */}
          <div>
            <p className="text-sm text-blue-100 mb-2">Filtrar por responsável:</p>
            <Select
              value={selectedResponsible}
              onValueChange={handleResponsibleChange}
              disabled={filterType === 'meus' || filterType === 'sem-responsavel'}
            >
              <SelectTrigger className="w-full max-w-md bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue placeholder="Selecione um responsável..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clear">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-500" />
                    <span>Limpar filtro</span>
                  </div>
                </SelectItem>
                {loadingMembers ? (
                  <SelectItem value="loading" disabled>
                    Carregando membros...
                  </SelectItem>
                ) : teamMembers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhum membro disponível
                  </SelectItem>
                ) : (
                  teamMembers.map((member) => {
                    const projectCount = projects.filter(p => p.adminResponsibleId === member.id).length
                    const isCurrentUser = member.id === user?.id

                    return (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-3 py-1">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {member.name}
                                {isCurrentUser && (
                                  <span className="text-blue-600 ml-1">(Você)</span>
                                )}
                              </span>
                              {(member.role === 'admin' || member.role === 'superadmin') && (
                                <Badge variant="default" className="bg-blue-500 text-white text-xs">
                                  Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {member.email} • {projectCount} {projectCount === 1 ? 'projeto' : 'projetos'}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* ✅ Dropdown de ordenação */}
          <div>
            <p className="text-sm text-blue-100 mb-2">Ordenar por:</p>
            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-full max-w-md bg-white/10 border-white/20 text-white hover:bg-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                align="start"
                sideOffset={5}
                avoidCollisions={false}
                position="popper"
                className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800"
              >
                <SelectItem value="manual">
                  <span className="font-medium">Ordenação Manual</span>
                </SelectItem>
                <SelectItem value="delivery-date-asc">
                  <span>Data de Entrega (Mais Próxima)</span>
                </SelectItem>
                <SelectItem value="delivery-date-desc">
                  <span>Data de Entrega (Mais Distante)</span>
                </SelectItem>
                <SelectItem value="priority-desc">
                  <span>Prioridade (Maior para Menor)</span>
                </SelectItem>
                <SelectItem value="priority-asc">
                  <span>Prioridade (Menor para Maior)</span>
                </SelectItem>
                <SelectItem value="sla-asc">
                  <span>SLA (Expira Primeiro)</span>
                </SelectItem>
                <SelectItem value="sla-desc">
                  <span>SLA (Expira Depois)</span>
                </SelectItem>
                <SelectItem value="created-asc">
                  <span>Data de Criação (Mais Antigos)</span>
                </SelectItem>
                <SelectItem value="created-desc">
                  <span>Data de Criação (Mais Recentes)</span>
                </SelectItem>
                <SelectItem value="updated-desc">
                  <span>Última Atualização (Mais Recentes)</span>
                </SelectItem>
                <SelectItem value="updated-asc">
                  <span>Última Atualização (Mais Antigas)</span>
                </SelectItem>
                <SelectItem value="value-desc">
                  <span>Valor do Projeto (Maior para Menor)</span>
                </SelectItem>
                <SelectItem value="value-asc">
                  <span>Valor do Projeto (Menor para Maior)</span>
                </SelectItem>
                <SelectItem value="client-asc">
                  <span>Cliente (A-Z)</span>
                </SelectItem>
                <SelectItem value="client-desc">
                  <span>Cliente (Z-A)</span>
                </SelectItem>
                <SelectItem value="time-in-status-desc">
                  <span>Tempo na Etapa (Mais Tempo)</span>
                </SelectItem>
                <SelectItem value="time-in-status-asc">
                  <span>Tempo na Etapa (Menos Tempo)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div></div>}

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-blue-400 opacity-20 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-60 h-60 bg-indigo-500 opacity-20 rounded-full"></div>
      </div>
      
      {/* Project View Wrapper */}
      <div className="min-h-[400px]">
        {viewMode === 'kanban' && (
          <KanbanBoard
            projects={filteredProjects}
            onProjectUpdate={updateProject}
            sortBy={sortBy}
            ref={viewKanbanRef}
          />
        )}
        
        {viewMode === 'table' && (
          <ProjectTable
            projects={filteredProjects}
            onProjectClick={handleProjectClick}
          />
        )}
      </div>
      
      {/* Project Form Modal - O botão abaixo será comentado para removê-lo da UI */}
      {/*
      <Button
        className="fixed right-5 bottom-5 rounded-full h-12 w-12 shadow-lg bg-orange-500 hover:bg-orange-600"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <span className="sr-only">Novo Projeto</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </Button>
      */}

      {/* 🆕 Modal de Criação de Projeto (Admin) */}
      <ClientCreateProjectModal
        open={showCreateProjectModal}
        onOpenChange={setShowCreateProjectModal}
        onSubmit={handleCreateProject}
        isAdmin={true}
        currentUserId={user?.id}
      />

    </div>
  )
} 