'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useState, useRef, useMemo } from 'react'
import { Project, ProjectStatus } from '@/types/project'
import { calculateProjectCost, getProjectPriceRanges as fetchProjectPriceRanges } from '@/lib/utils/projectUtils'
import { format } from 'date-fns/format'
import { subMonths } from 'date-fns/subMonths'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { ptBR } from 'date-fns/locale/pt-BR'

import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService'
import MetricasTab from './metricas-tab'
import { useRouter } from 'next/navigation'
import { getAdminDashboardDataAction } from "@/lib/actions/project-actions"
import { toSafeDate, isDateFromCurrentMonth, isDateFromMonth } from '@/lib/utils/dateHelpers'
import {
  Lightbulb,
  Building2,
  ChevronRight,
  Users,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { useNotifications } from '@/lib/contexts/NotificationContext'
import { devLog } from "@/lib/utils/productionLogger";
import { Suspense } from 'react'

const isProjectFromCurrentMonth = (project: Project): boolean => {
  if (!project || !project.createdAt) {
    return false
  }
  return isDateFromCurrentMonth(project.createdAt)
}

const filterProjectsByMonth = (projects: Project[], month: Date): Project[] => {
  return projects.filter(project => {
    if (!project || !project.createdAt) {
      return false
    }
    return isDateFromMonth(project.createdAt, month)
  })
}

export default function AdminPainelPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { unreadCount: contextUnreadCount } = useNotifications()

  const [projectCount, setProjectCount] = useState<number>(0)
  const [clientCountState, setClientCountState] = useState<number>(0)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [recentProjects, setRecentProjects] = useState<Project[]>([])

  const [totalPower, setTotalPower] = useState<number>(0)
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0)

  const [monthlyProjectsData, setMonthlyProjectsData] = useState<any[]>([])
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([])
  const [projectsByStatusData, setProjectsByStatusData] = useState<any[]>([])
  const [powerDistributionData, setPowerDistributionData] = useState<any[]>([])
  const [monthlyPowerData, setMonthlyPowerData] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [viewedProjects, setViewedProjects] = useState<Set<string>>(new Set())
  const fetchedDashboardDataRef = useRef(false)
  const [currentMonthProjectsCount, setCurrentMonthProjectsCount] = useState(0)
  const [newProjectsThisMonth, setNewProjectsThisMonth] = useState(0)
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([])

  const concludedCount = useMemo(() => {
    const conclusionSlugs = new Set(availableStatuses.filter(s => s.isConclusion).map(s => s.slug))
    if (conclusionSlugs.size === 0) return 0
    return allProjects.filter(p => conclusionSlugs.has(p.status || '')).length
  }, [allProjects, availableStatuses])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#AF19FF', '#FF5733']

  useEffect(() => {
    if (user && !authLoading) {
      fetchProjectPriceRanges().catch(error => {
        devLog.error('[AdminPainelPage] Erro ao carregar faixas de preço:', error)
      })
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user && !authLoading && !fetchedDashboardDataRef.current) {
      fetchedDashboardDataRef.current = true
      setIsLoading(true)

      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      Promise.all([
        getAdminDashboardDataAction(user.id),
        getProjectStatuses().catch(() => [] as ProjectStatusInfo[]),
        fetch('/api/admin/client-count').then(res => res.json()).catch(() => ({ success: false, count: 0 }))
      ]).then(([dashboardData, statuses, clientCountData]) => {
        if (dashboardData.error) {
          devLog.error('[AdminPainel] Erro ao buscar dados do dashboard:', dashboardData.error)
          setProjectCount(0)
          setAllProjects([])
          fetchedDashboardDataRef.current = false
        } else {
          setProjectCount(dashboardData.projectCount || 0)
          setAllProjects(dashboardData.projects || [])
        }

        setAvailableStatuses(statuses || [])
        setClientCountState(clientCountData?.success ? (clientCountData.count || 0) : 0)
      }).catch(error => {
        devLog.error('[AdminPainel] Falha ao buscar dados do painel:', error)
        fetchedDashboardDataRef.current = false
      }).finally(() => {
        setIsLoading(false)
      })
    }
  }, [user, authLoading])
  


  useEffect(() => {
    if (allProjects.length === 0) {
      setTotalPower(0)
      setCurrentMonthProjectsCount(0)
      setNewProjectsThisMonth(0)
      setMonthlyRevenue(0)
      setMonthlyProjectsData([])
      setMonthlyRevenueData([])
      setProjectsByStatusData([])
      setPowerDistributionData([])
      setMonthlyPowerData([])
      setRecentProjects([])
      return
    }

    devLog.log('[AdminPainelPage] Processing allProjects (', allProjects.length, 'items)')

    const endDate = new Date()
    const startDate = subMonths(endDate, 5)
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate })
    const monthLabels = monthsInterval.map(m => format(m, 'MMM', { locale: ptBR }))

    // Acumuladores para single-pass (evita iterar allProjects 8x separadamente)
    let totalP = 0
    let currentMonthCount = 0
    let currentMonthRev = 0
    const monthlyProjectCounts = new Array(monthsInterval.length).fill(0)
    const monthlyRevenueArr = new Array(monthsInterval.length).fill(0)
    const monthlyPowerArr = new Array(monthsInterval.length).fill(0)
    const powerRangeCounts = [0, 0, 0, 0] // 0-10, 10.01-50, 50.01-100, >100.01
    const statusCounts: { [key: string]: number } = {}

    for (const project of allProjects) {
      const potencia = typeof project.potencia === 'number' ? project.potencia : 0
      totalP += potencia

      // Distribuição de potência (mesma lógica do original: > min && <= max)
      if (potencia > 0 && potencia <= 10) powerRangeCounts[0]++
      else if (potencia > 10.01 && potencia <= 50) powerRangeCounts[1]++
      else if (potencia > 50.01 && potencia <= 100) powerRangeCounts[2]++
      else if (potencia > 100.01) powerRangeCounts[3]++

      // Contagem por status
      const statusSlug = project.status || 'indefinido'
      statusCounts[statusSlug] = (statusCounts[statusSlug] || 0) + 1

      // Mês atual
      if (isProjectFromCurrentMonth(project)) {
        currentMonthCount++
        currentMonthRev += calculateProjectCost(potencia) || 0
      }

      // Buckets mensais
      for (let i = 0; i < monthsInterval.length; i++) {
        if (isDateFromMonth(project.createdAt, monthsInterval[i])) {
          monthlyProjectCounts[i]++
          const cost = project.valorProjeto || calculateProjectCost(potencia)
          monthlyRevenueArr[i] += cost || 0
          monthlyPowerArr[i] += potencia
          break
        }
      }
    }

    setTotalPower(totalP)
    setCurrentMonthProjectsCount(currentMonthCount)
    setNewProjectsThisMonth(currentMonthCount)
    setMonthlyRevenue(currentMonthRev)

    setMonthlyProjectsData(monthLabels.map((name, i) => ({ name, projetos: monthlyProjectCounts[i] })))
    setMonthlyRevenueData(monthLabels.map((name, i) => ({ name, receita: monthlyRevenueArr[i] })))
    setMonthlyPowerData(monthLabels.map((name, i) => ({ name, potenciaInstalada: monthlyPowerArr[i] })))
    setPowerDistributionData([
      { name: '0-10 kWp', value: powerRangeCounts[0] },
      { name: '10.01-50 kWp', value: powerRangeCounts[1] },
      { name: '50.01-100 kWp', value: powerRangeCounts[2] },
      { name: '>100 kWp', value: powerRangeCounts[3] },
    ])

    const projectsByStatusChartData = Object.entries(statusCounts)
      .map(([statusSlug, value]) => {
        const statusInfo = availableStatuses.find(s => s.slug === statusSlug)
        return { name: statusInfo?.name || statusSlug, value, color: statusInfo?.color || '#8884d8' }
      })
      .sort((a, b) => b.value - a.value)
    setProjectsByStatusData(projectsByStatusChartData)

    const sortedProjects = [...allProjects].sort((a, b) =>
      (toSafeDate(b.createdAt)?.getTime() || 0) - (toSafeDate(a.createdAt)?.getTime() || 0)
    )
    setRecentProjects(sortedProjects.slice(0, 5))
  }, [allProjects, availableStatuses])
  
  useEffect(() => {
    if (!user?.id) return
    const storedViewed = localStorage.getItem(`viewed_projects_${user.id}`)
    if (storedViewed) {
      try {
        setViewedProjects(new Set(JSON.parse(storedViewed)))
      } catch (e) {
        devLog.error("Error parsing viewed projects from localStorage", e)
        localStorage.removeItem(`viewed_projects_${user.id}`)
      }
    }
  }, [user?.id])

  const markProjectAsViewedOptimistic = (projectId: string) => {
    setViewedProjects(prev => {
      const newSet = new Set(prev)
      newSet.add(projectId)
      if (user?.id) {
        localStorage.setItem(`viewed_projects_${user.id}`, JSON.stringify(Array.from(newSet)))
      }
      return newSet
    })
  }
  
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return "R$ 0,00"
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }
  
  const CustomTooltipContent = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border p-2 rounded shadow-lg">
          <p className="label font-semibold">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }



  if (authLoading || (isLoading && !allProjects.length && fetchedDashboardDataRef.current === false)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Lightbulb className="mx-auto h-12 w-12 text-primary animate-pulse" />
          <h2 className="mt-6 text-xl font-semibold">Carregando Painel Administrativo...</h2>
          <p className="mt-2 text-muted-foreground">Estamos preparando tudo para você.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return (
       <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Redirecionando...</h2>
        </div>
      </div>
    )
  }
  
  const renderProjectStatusBadge = (statusSlug: ProjectStatus | string | undefined) => {
    const statusInfo = availableStatuses.find(s => s.slug === statusSlug);

    // Definir variante baseada em alguns status conhecidos ou usar default
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "default";

    if (statusSlug === 'cancelado') {
      badgeVariant = 'destructive';
    } else if (statusSlug === 'projeto-pausado') {
      badgeVariant = 'secondary';
    } else if (statusSlug === 'finalizado') {
      badgeVariant = 'default';
    }

    const displayName = statusInfo?.name || statusSlug || 'N/A';

    return (
      <div className="flex items-center gap-2">
        {statusInfo && (
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusInfo.color }}
          />
        )}
        <Badge variant={badgeVariant} className="capitalize whitespace-nowrap">
          {displayName}
        </Badge>
      </div>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    let greeting = ""
    if (hour < 12) greeting = "Bom dia"
    else if (hour < 18) greeting = "Boa tarde"
    else greeting = "Boa noite"

    // Adicionar o nome do usuário usando user.profile.name
    const userName = user?.profile?.name || user?.email?.split('@')[0] || "Admin"
    return `${greeting}, ${userName}`
  }

  // ✅ NOVO: Verificar permissões do usuário
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};
  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

  // ✅ NOVO: Verificar se pode ver dados financeiros no painel
  const canViewDashboardFinancials = isFullAdmin || userPermissions.can_view_dashboard_financials === true;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <header className="bg-blue-600 text-white p-6 shadow-lg rounded-lg mt-2 mr-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">{getGreeting()}</h1>
            <p className="text-sm opacity-90">
              Bem-vindo de volta ao seu painel de controle administrativo.
            </p>
          </div>
          {/* Ícones removidos conforme solicitado */}
          {/* 
          <div className="flex items-center space-x-3 relative">
            <Bell className="h-6 w-6 cursor-pointer" onClick={() => setActiveTab('atividade_recente')} />
            {notificationCount > 0 && (
              <Badge variant="destructive" className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5">
                {notificationCount}
              </Badge>
            )}
             <Users className="h-6 w-6" />
          </div>
          */}
        </div>
      </header>

      <main className="flex-grow bg-white dark:bg-gray-800 shadow-xl rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 mt-6 mr-6">
        <MetricasTab
          allProjects={allProjects}
          availableStatuses={availableStatuses}
          isActive={true}
          canViewFinancials={canViewDashboardFinancials}
          showAdvancedTabs={isFullAdmin}
        />
      </main>
    </div>
  )
} 