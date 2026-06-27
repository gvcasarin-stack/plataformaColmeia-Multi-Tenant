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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Pie,
  PieChart,
  Cell,
  Area,
  ComposedChart,
  Line,
} from 'recharts'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { getAdminDashboardDataAction } from "@/lib/actions/project-actions"
import { toSafeDate, isDateFromCurrentMonth, isDateFromMonth } from '@/lib/utils/dateHelpers'
import {
  Lightbulb,
  LineChart as LucideLineChart,
  Building2,
  ChevronRight,
  BarChart3 as LucideBarChart,
  DollarSign,
  CheckCircle,
  Users,
  Users2,
  Bell,
  Layers,
  Zap,
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
  const [activeTab, setActiveTab] = useState('dashboard')
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
  
  const handleTabChange = (value: string) => {
    setActiveTab(value)
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <LucideLineChart className="mr-2 h-4 w-4" /> Dashboard
            </button>
            <button
              onClick={() => handleTabChange('atividade_recente')}
              className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center ${
                activeTab === 'atividade_recente'
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Atividade Recente
              {contextUnreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{contextUnreadCount}</Badge>
              )}
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => handleTabChange('metricas')}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center ${
                  activeTab === 'metricas'
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Métricas
              </button>
            )}
          </div>

          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-green-500 rounded-full">
                      <Layers className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Total de Projetos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{projectCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    +{newProjectsThisMonth} neste mês
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-yellow-500 rounded-full">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Potência Total (kWp)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalPower.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectCount > 0 ? (totalPower / projectCount).toFixed(2) : 0} kWp em média
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-blue-500 rounded-full">
                      <Users2 className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Clientes Registrados</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{clientCountState}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                     {clientCountState > 0 ? (projectCount / clientCountState).toFixed(1) : 0} projetos/cliente
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <div className="p-3 bg-emerald-500 rounded-full">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-200">Projetos Concluídos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{concludedCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {projectCount > 0 ? Math.round((concludedCount / projectCount) * 100) : 0}% do total
                  </p>
                </CardContent>
              </Card>

            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle>Projetos por Mês</CardTitle>
                  <CardDescription>Evolução dos últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyProjectsData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                      <YAxis fontSize={12} tickLine={false} axisLine={true} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(200, 200, 200, 0.2)'}}
                        contentStyle={{
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem',
                          padding: '8px',
                          fontSize: '12px',
                          color: 'var(--foreground)'
                        }}
                      />
                      <Bar dataKey="projetos" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>Projetos por estágio</CardDescription>
                </CardHeader>
                <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 20 }}>
                      <Pie
                        data={projectsByStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={false}
                      >
                        {projectsByStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div className="bg-background border border-border p-2 rounded shadow-lg">
                                <p className="font-semibold">{data.payload.name}</p>
                                <p style={{ color: data.color }}>
                                  Projetos: {data.value}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                       <Legend
                         layout="horizontal"
                         verticalAlign="bottom"
                         align="center"
                         wrapperStyle={{fontSize: "10px", lineHeight: "1.2"}}
                         content={({ payload }) => (
                           <div className="flex flex-wrap justify-center gap-2 mt-2">
                             {payload?.map((entry, index) => {
                               const words = entry.value.split(' ');
                               const shouldBreak = words.length > 3;

                               // Calcular percentual baseado nos dados do gráfico
                               const totalValue = projectsByStatusData.reduce((sum, item) => sum + item.value, 0);
                               const currentData = projectsByStatusData.find(item => item.name === entry.value);
                               const percentage = currentData ? Math.round((currentData.value / totalValue) * 100) : 0;

                               return (
                                 <div key={`legend-${index}`} className="flex items-center gap-1 text-xs">
                                   <div
                                     className="w-3 h-3 rounded-sm"
                                     style={{ backgroundColor: projectsByStatusData.find(item => item.name === entry.value)?.color || entry.color }}
                                   ></div>
                                   <span className={shouldBreak ? "text-center leading-tight" : ""}>
                                     {shouldBreak ? (
                                       <span>
                                         {words.slice(0, Math.ceil(words.length / 2)).join(' ')}<br/>
                                         {words.slice(Math.ceil(words.length / 2)).join(' ')} ({percentage}%)
                                       </span>
                                     ) : `${entry.value} (${percentage}%)`}
                                   </span>
                                 </div>
                               );
                             })}
                           </div>
                         )}
                       />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ✅ NOVO: Seção de gráficos financeiros (só aparece se tiver permissão) */}
            {canViewDashboardFinancials && (
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
                <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle>Faturamento Mensal Estimado</CardTitle>
                    <CardDescription>Receita estimada (R$)</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={true}
                          tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                        />
                         <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            padding: '8px',
                            fontSize: '12px',
                            color: 'var(--foreground)'
                          }}
                        />
                        <Area type="monotone" dataKey="receita" stroke="#22c55e" fill="#86efac" fillOpacity={0.4} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <CardHeader>
                    <CardTitle>Potência Instalada por Mês</CardTitle>
                    <CardDescription>kWp por mês</CardDescription>
                  </CardHeader>
                  <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={monthlyPowerData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={true}
                          tickFormatter={(value) => `${value} kWp`}
                        />
                         <Tooltip
                          formatter={(value: number) => `${value.toFixed(2)} kWp`}
                          contentStyle={{
                            backgroundColor: 'var(--background)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            padding: '8px',
                            fontSize: '12px',
                            color: 'var(--foreground)'
                          }}
                        />
                        <Area type="monotone" dataKey="potenciaInstalada" stroke="#ffc658" fill="#ffc658" fillOpacity={0.3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="atividade_recente">
            <Card>
              <CardHeader>
                <CardTitle>Atividade Recente</CardTitle>
                <CardDescription>
                  Monitore as últimas atualizações dos projetos na plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <section>
                  <div className="flex items-center mb-1">
                    <Lightbulb className="h-6 w-6 mr-2 text-blue-600" />
                    <h3 className="text-xl font-semibold">Últimas Movimentações de Projeto</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monitore as últimas atualizações dos projetos na plataforma.
                  </p>
                  
                  {recentProjects.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-0">
                        {recentProjects.map((project, index) => (
                          <Link key={project.id} href={`/admin/projetos/${project.id}`} passHref>
                            <div className={`flex items-start p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors ${index < recentProjects.length - 1 ? 'border-b border-gray-200 dark:border-gray-600' : ''}`}>
                              <Lightbulb className="h-6 w-6 text-blue-500 mr-4 mt-1 flex-shrink-0" />
                              <div className="flex-grow">
                                <p className="text-base font-semibold text-gray-800 dark:text-gray-200 truncate mb-0.5">Projeto {project.nomeClienteFinal || 'Cliente Final'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                  Atualizado em {project.updatedAt ? format(toSafeDate(project.updatedAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                                  {' • '}
                                  Potência: {project.potencia || 'N/A'} kWp
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Cliente: {project.nomeClienteFinal || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum projeto recente encontrado.</p>
                  )}
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="metricas">
              <MetricasTab
                allProjects={allProjects}
                availableStatuses={availableStatuses}
                isActive={activeTab === 'metricas'}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
} 