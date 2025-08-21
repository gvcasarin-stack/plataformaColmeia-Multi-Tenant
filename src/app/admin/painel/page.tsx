'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useEffect, useState, useCallback, useRef } from 'react'
import { getClientCount } from '@/lib/services/clientService.supabase'
import { Project, ProjectStatus } from '@/types/project'
import { calculateProjectCost, getProjectPriceRanges as fetchProjectPriceRanges } from '@/lib/utils/projectUtils'
import { format } from 'date-fns/format'
import { subMonths } from 'date-fns/subMonths'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { ptBR } from 'date-fns/locale/pt-BR'

import { getProjectsWithBilling } from '@/lib/services/billingService.api'
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'
import { useNotifications } from '@/lib/contexts/NotificationContext'
import { devLog } from "@/lib/utils/productionLogger";
import { Suspense } from 'react'

// ✅ Interface para projetos com informações de billing
interface ProjectWithBilling {
  id: string;
  pagamento?: 'pendente' | 'parcela1' | 'parcela2' | 'pago';
  price?: number;
  potencia?: number;
  createdAt?: any;
  [key: string]: any; // Permitir propriedades adicionais
}

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

  const [billingProjects, setBillingProjects] = useState<ProjectWithBilling[]>([])

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#AF19FF', '#FF5733']

  useEffect(() => {
    if (user && !authLoading) {
      fetchProjectPriceRanges().catch(error => {
        devLog.error('[AdminPainelPage] Erro ao carregar faixas de preço:', error)
      })
    }
  }, [user, authLoading])

  // ✅ CORREÇÃO: Função unificada para buscar dados de billing (igual página financeiro)
  const fetchBillingData = async (forceRefresh = false) => {
    try {
      devLog.log('[AdminPainel] Buscando dados de billing...', { forceRefresh });
      const billingData = await getProjectsWithBilling();
      if (billingData && billingData.length > 0) {
        setBillingProjects(billingData as ProjectWithBilling[]);
        devLog.log('[AdminPainel] Dados de billing carregados:', billingData.length);
      } else {
        setBillingProjects([]);
      }
    } catch (error) {
      devLog.error('[AdminPainel] Erro ao buscar dados de billing:', error);
      setBillingProjects([]);
    }
  };

  useEffect(() => {
    if (user && !authLoading && !fetchedDashboardDataRef.current) {
      fetchedDashboardDataRef.current = true
      setIsLoading(true)
      
      // ✅ Buscar dados do dashboard e billing em paralelo
      Promise.all([
        getAdminDashboardDataAction(),
        fetchBillingData(false)
      ]).then(([dashboardData]) => {
        // Processar dados do dashboard
        if (dashboardData.error) {
          devLog.error("Error fetching admin dashboard data:", dashboardData.error)
          setProjectCount(0)
          setAllProjects([])
        } else {
          setProjectCount(dashboardData.projectCount || 0)
          const fetchedProjects = dashboardData.projects || []
          setAllProjects(fetchedProjects)
        }
        // ✅ Billing data já processado na função fetchBillingData
      }).catch(error => {
        devLog.error('Failed to fetch dashboard data:', error)
      }).finally(() => {
        setIsLoading(false)
      })
    }
  }, [user, authLoading])

  // ✅ CORREÇÃO: Criar contexto de sincronização com página financeiro (sem timer)
  useEffect(() => {
    if (!user || authLoading || !fetchedDashboardDataRef.current) return;

    // Escutar eventos de atualização do financeiro
    const handleFinancialUpdate = (event: CustomEvent) => {
      devLog.log('[AdminPainel] Detectada atualização financeira, recarregando dados...');
      fetchBillingData(true);
    };

    // Escutar quando usuário volta à aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        devLog.log('[AdminPainel] Usuário voltou à aba, verificando dados...');
        fetchBillingData(true);
      }
    };

    window.addEventListener('billing-updated', handleFinancialUpdate as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('billing-updated', handleFinancialUpdate as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (user && !authLoading) {
      getClientCount()
        .then(setClientCountState)
        .catch(err => devLog.error("Failed to fetch client count", err))
    }
  }, [user, authLoading])
  


  useEffect(() => {
    if (allProjects.length > 0) {
      devLog.log('[AdminPainelPage] Processing allProjects (', allProjects.length, 'items)')
      
      const totalP = allProjects.reduce((sum, project) => sum + (project.potencia || 0), 0)
      setTotalPower(totalP)

      const currentMonthProjs = allProjects.filter(isProjectFromCurrentMonth)
      setCurrentMonthProjectsCount(currentMonthProjs.length)
      setNewProjectsThisMonth(currentMonthProjs.length)

      const currentMonthRev = currentMonthProjs.reduce((sum, project) => {
        const potencia = typeof project.potencia === 'number' ? project.potencia : 0
        const projectCost = calculateProjectCost(potencia)
        return sum + (projectCost || 0)
      }, 0)
      setMonthlyRevenue(currentMonthRev)

      // ✅ REMOVIDO: Lógica conflitante - agora usa apenas billingProjects para consistência

      const endDate = new Date()
      const startDate = subMonths(endDate, 5)
      const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate })

      const monthlyProjectsChartData = monthsInterval.map(month => ({
        name: format(month, 'MMM', { locale: ptBR }),
        projetos: filterProjectsByMonth(allProjects, month).length,
      }))
      setMonthlyProjectsData(monthlyProjectsChartData)

      const monthlyRevenueChartDataCalc = monthsInterval.map(month => ({
        name: format(month, 'MMM', { locale: ptBR }),
        receita: filterProjectsByMonth(allProjects, month).reduce((sum, p) => {
          const cost = p.valorProjeto || calculateProjectCost(typeof p.potencia === 'number' ? p.potencia : 0);
          return sum + (cost || 0)
        }, 0),
      }))
      setMonthlyRevenueData(monthlyRevenueChartDataCalc)

      const statusCounts: { [key: string]: number } = {}
      allProjects.forEach(p => {
        const statusKey = p.status || 'Indefinido'
        statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1
      })
      const projectsByStatusChartDataCalc = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value)
      setProjectsByStatusData(projectsByStatusChartDataCalc)

      const monthlyPowerChartDataCalc = monthsInterval.map(month => ({
        name: format(month, 'MMM', { locale: ptBR }),
        potenciaInstalada: filterProjectsByMonth(allProjects, month).reduce((sum, p) => {
          return sum + (typeof p.potencia === 'number' ? p.potencia : 0)
        }, 0),
      }))
      setMonthlyPowerData(monthlyPowerChartDataCalc)

      const powerRanges = [
        { name: '0-10 kWp', min: 0, max: 10 },
        { name: '10.01-50 kWp', min: 10.01, max: 50 },
        { name: '50.01-100 kWp', min: 50.01, max: 100 },
        { name: '>100 kWp', min: 100.01, max: Infinity },
      ]
      const powerDistData = powerRanges.map(range => ({
        name: range.name,
        value: allProjects.filter(p => {
          const potencia = typeof p.potencia === 'number' ? p.potencia : 0
          return potencia > range.min && potencia <= range.max
        }).length,
      }))
      setPowerDistributionData(powerDistData)

      const sortedProjects = [...allProjects].sort((a, b) =>
        (toSafeDate(b.createdAt)?.getTime() || 0) - (toSafeDate(a.createdAt)?.getTime() || 0)
      )
      setRecentProjects(sortedProjects.slice(0, 5))
    } else {
      setTotalPower(0)
      setCurrentMonthProjectsCount(0)
      setNewProjectsThisMonth(0)
      setMonthlyRevenue(0)
      // ✅ REMOVIDO: setHistoricalPaidAmount(0) - agora controlado apenas por billingProjects
      setMonthlyProjectsData([])
      setMonthlyRevenueData([])
      setProjectsByStatusData([])
      setPowerDistributionData([])
      setMonthlyPowerData([])
      setRecentProjects([])
    }
  }, [allProjects])
  
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
  
  const renderProjectStatusBadge = (status: ProjectStatus | string | undefined) => {
    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline"
    const lowerStatus = status?.toLowerCase()

    switch (lowerStatus) {
      case 'não iniciado':
      case 'em desenvolvimento':
      case 'aguardando assinaturas':
      case 'em homologação':
      case 'aguardando solicitar vistoria':
      case 'em vistoria':
        badgeVariant = 'default'
        break
      case 'projeto pausado':
        badgeVariant = 'secondary'
        break
      case 'projeto aprovado':
      case 'finalizado':
        badgeVariant = 'default'
        break
      case 'cancelado':
        badgeVariant = 'destructive'
        break
      default:
        badgeVariant = 'outline'
    }
    return <Badge variant={badgeVariant} className="capitalize whitespace-nowrap">{status || 'N/A'}</Badge>
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    let greeting = ""
    if (hour < 12) greeting = "Bom dia"
    else if (hour < 18) greeting = "Boa tarde"
    else greeting = "Boa noite"
    
    // Adicionar o nome do usuário usando a mesma lógica da sidebar
    const userName = user?.profile?.full_name || user?.email?.split('@')[0] || "Admin"
    return `${greeting}, ${userName}`
  }



  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <header className="bg-blue-600 text-white p-6 shadow-lg rounded-lg mt-6 mr-6">
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

      <main className="flex-grow bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mt-6 mr-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="dashboard">
              <LucideLineChart className="mr-2 h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="atividade_recente">
              {/* Ícone removido temporariamente */} Atividade Recente
              {contextUnreadCount > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{contextUnreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Projetos</CardTitle>
                  <LucideBarChart className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectCount}</div>
                  <p className="text-xs text-muted-foreground">
                    +{newProjectsThisMonth} neste mês
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Potência Total (kWp)</CardTitle>
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPower.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {projectCount > 0 ? (totalPower / projectCount).toFixed(2) : 0} kWp em média
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Registrados</CardTitle>
                  <Users2 className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientCountState}</div>
                  <p className="text-xs text-muted-foreground">
                     {clientCountState > 0 ? (projectCount / clientCountState).toFixed(1) : 0} projetos/cliente
                  </p>
                </CardContent>
              </Card>


            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card className="lg:col-span-1">
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

              <Card className="lg:col-span-1">
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
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mt-6">
              <Card className="lg:col-span-1">
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
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                                     style={{ backgroundColor: entry.color }}
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

              <Card className="lg:col-span-1">
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
        </Tabs>
      </main>
    </div>
  )
}
