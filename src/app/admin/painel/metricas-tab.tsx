'use client'

import { useMemo, useState, useEffect } from 'react'
import { subMonths } from 'date-fns/subMonths'
import { startOfMonth } from 'date-fns/startOfMonth'
import { endOfMonth } from 'date-fns/endOfMonth'
import { eachMonthOfInterval } from 'date-fns/eachMonthOfInterval'
import { format } from 'date-fns/format'
import { ptBR } from 'date-fns/locale/pt-BR'
import { Project } from '@/types/project'
import { ProjectStatusInfo } from '@/lib/services/kanbanService'
import { toSafeDate } from '@/lib/utils/dateHelpers'
import { calculateProjectCost } from '@/lib/utils/projectUtils'
import { devLog } from '@/lib/utils/productionLogger'
import { useAuth } from '@/lib/hooks/useAuth'
import { createTenantHeaders } from '@/lib/utils/tenant-helper'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Line,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, DollarSign, Layers, ShieldCheck, CheckCircle, Zap } from 'lucide-react'

// ─── tipos ───────────────────────────────────────────────────────────────────

interface TeamMember { id: string; name: string; email: string; role: string }
interface ConclusaoEvent { project_id: string; created_at: string; new_status: string }

interface MetricasTabProps {
  allProjects: Project[]
  availableStatuses: ProjectStatusInfo[]
  isActive: boolean
  canViewFinancials: boolean
  showAdvancedTabs: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316', '#14b8a6', '#ec4899', '#6366f1']
const BILLING_LABELS: Record<string, string> = { avulso: 'Avulso', pacote: 'Pacote', assinatura: 'Assinatura' }
const TERMINAL = new Set(['finalizado', 'cancelado'])
const PERIOD_OPTIONS = [
  { label: '3M',  value: '3m',  months: 3  },
  { label: '6M',  value: '6m',  months: 6  },
  { label: '12M', value: '12m', months: 12 },
  { label: '24M', value: '24m', months: 24 },
  { label: 'Tudo', value: 'all', months: 0 },
]

const fmt  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtS = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  return fmt(v)
}
const monthKey  = (d: Date) => format(d, 'yyyy-MM')
const projectId = (p: Project) => (p as any).created_by || (p as any).userId || 'unknown'
const projectResponsible = (p: Project): string => (p as any).admin_responsible_name || (p as any).adminResponsibleName || ''
const projectRevenue = (p: Project): number => (p as any).valor_projeto || (p as any).valorProjeto || 0
const projectDate    = (p: Project): Date | null => toSafeDate((p as any).createdAt || (p as any).created_at)
const projectClient  = (p: Project): string => (p as any).empresaIntegradora || (p as any).empresa_integradora || 'Não informado'

// ─── componente ──────────────────────────────────────────────────────────────

export default function MetricasTab({ allProjects, availableStatuses, isActive, canViewFinancials, showAdvancedTabs }: MetricasTabProps) {
  const { user } = useAuth()
  const [metricaTab,       setMetricaTab]       = useState<'visao-geral' | 'projetos' | 'clientes' | 'equipe'>('visao-geral')
  const [teamMembers,      setTeamMembers]       = useState<TeamMember[]>([])
  const [conclusoes,       setConclusoes]        = useState<ConclusaoEvent[]>([])
  const [loadingConclusoes, setLoadingConclusoes] = useState(false)
  const [conclusionConfigured, setConclusionConfigured] = useState<boolean | null>(null)
  const [conclusoesLoaded, setConclusoesLoaded] = useState(false)

  const [filterPeriod,       setFilterPeriod]       = useState('12m')
  const [filterYear,         setFilterYear]         = useState('all')
  const [filterDistributor,  setFilterDistributor]  = useState('all')
  const [filterCollaborator, setFilterCollaborator] = useState('all')

  // Membros da equipe — lazy, só quando a aba fica ativa
  useEffect(() => {
    if (!isActive || teamMembers.length > 0) return
    createTenantHeaders(user?.id || '').then(tenantHeaders =>
      fetch('/api/admin/team-members', { headers: tenantHeaders })
        .then(r => r.json())
        .then(d => setTeamMembers(d.data || []))
        .catch(() => devLog.warn('[MetricasTab] Falha ao carregar membros'))
    )
  }, [isActive, user?.id])

  // Conclusões — lazy, só quando a sub-aba Projetos fica ativa; recarrega se ainda não carregou
  useEffect(() => {
    if (!isActive || metricaTab !== 'projetos' || conclusoesLoaded || loadingConclusoes) return
    setLoadingConclusoes(true)
    fetch('/api/admin/metricas/conclusoes')
      .then(r => r.json())
      .then(d => {
        setConclusoes(d.data || [])
        setConclusionConfigured((d.conclusionSlugs?.length ?? 0) > 0)
        setConclusoesLoaded(true)
      })
      .catch(() => devLog.warn('[MetricasTab] Falha ao carregar conclusões'))
      .finally(() => setLoadingConclusoes(false))
  }, [isActive, metricaTab])

  // ── filtros ──────────────────────────────────────────────────────────────

  const uniqueDistributors = useMemo(
    () => [...new Set(allProjects.map(p => p.distribuidora).filter(Boolean))].sort() as string[],
    [allProjects],
  )

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    for (const p of allProjects) {
      const d = projectDate(p)
      if (d) years.add(d.getFullYear())
    }
    return [...years].sort((a, b) => b - a)
  }, [allProjects])

  const filteredProjects = useMemo(() => {
    let list = allProjects
    if (filterYear !== 'all') {
      const y = Number(filterYear)
      list = list.filter(p => { const d = projectDate(p); return d && d.getFullYear() === y })
    } else if (filterPeriod !== 'all') {
      const months = PERIOD_OPTIONS.find(o => o.value === filterPeriod)?.months ?? 12
      const cutoff = subMonths(new Date(), months)
      list = list.filter(p => { const d = projectDate(p); return d && d >= cutoff })
    }
    if (filterDistributor  !== 'all') list = list.filter(p => p.distribuidora === filterDistributor)
    if (filterCollaborator !== 'all') list = list.filter(p => projectResponsible(p) === filterCollaborator)
    return list
  }, [allProjects, filterPeriod, filterYear, filterDistributor, filterCollaborator])

  // Range de meses para os gráficos de evolução
  const monthRange = useMemo(() => {
    if (filterYear !== 'all') {
      const y = Number(filterYear)
      return eachMonthOfInterval({
        start: new Date(y, 0, 1),
        end:   new Date(Math.min(y, new Date().getFullYear()) === new Date().getFullYear() ? Date.now() : new Date(y, 11, 31).getTime()),
      })
    }
    const months = filterPeriod === 'all' ? 23
      : (PERIOD_OPTIONS.find(o => o.value === filterPeriod)?.months ?? 12) - 1
    return eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), months)),
      end:   new Date(),
    })
  }, [filterPeriod, filterYear])

  // Rótulo do período ativo (reflete o filtro compartilhado, sem ser um seletor à parte)
  const periodLabel = useMemo(() => {
    if (filterYear !== 'all') return `Ano de ${filterYear}`
    const opt = PERIOD_OPTIONS.find(o => o.value === filterPeriod)
    if (!opt || opt.value === 'all') return 'Todo o período'
    return `Últimos ${opt.months} meses`
  }, [filterYear, filterPeriod])

  // Novos projetos no mês corrente, dentro do recorte já filtrado (distribuidora/colaborador)
  const newThisMonth = useMemo(() => {
    const now = new Date()
    return filteredProjects.filter(p => {
      const d = projectDate(p)
      return d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [filteredProjects])

  // ── métricas KPI ─────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    let totalRevenue = 0
    let activeCount  = 0
    let slaOk = 0, slaTotal = 0
    const today = new Date()

    for (const p of filteredProjects) {
      const slug    = p.status || 'indefinido'
      const revenue = projectRevenue(p)
      totalRevenue += revenue
      if (!TERMINAL.has(slug)) activeCount++

      const info   = availableStatuses.find(s => s.slug === slug)
      const slaDays: number | undefined = (info as any)?.slaDays ?? (info as any)?.sla_days
      if (slaDays && slaDays > 0 && !TERMINAL.has(slug)) {
        const last = toSafeDate((p as any).updatedAt || (p as any).updated_at)
        if (last) {
          const days = Math.floor((today.getTime() - last.getTime()) / 86_400_000)
          slaTotal++
          if (days <= slaDays) slaOk++
        }
      }
    }
    const slaPercent = slaTotal > 0 ? Math.round((slaOk / slaTotal) * 100) : null
    return { total: filteredProjects.length, totalRevenue, activeCount, slaPercent }
  }, [filteredProjects, availableStatuses])

  // ── sub-aba VISÃO GERAL ──────────────────────────────────────────────────

  const totalPower = useMemo(
    () => filteredProjects.reduce((sum, p) => sum + (typeof p.potencia === 'number' ? p.potencia : 0), 0),
    [filteredProjects],
  )

  const projectsByStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of filteredProjects) {
      const slug = p.status || 'indefinido'
      counts[slug] = (counts[slug] || 0) + 1
    }
    return Object.entries(counts)
      .map(([slug, value]) => {
        const info = availableStatuses.find(s => s.slug === slug)
        return { name: info?.name || slug, value, color: info?.color || '#8884d8' }
      })
      .sort((a, b) => b.value - a.value)
  }, [filteredProjects, availableStatuses])

  const monthlyRevenueData = useMemo(
    () => monthRange.map(month => {
      const mk = monthKey(month)
      const label = format(month, 'MMM/yy', { locale: ptBR })
      const receita = filteredProjects
        .filter(p => { const d = projectDate(p); return d && monthKey(d) === mk })
        .reduce((sum, p) => {
          const potencia = typeof p.potencia === 'number' ? p.potencia : 0
          const cost = (p as any).valorProjeto || calculateProjectCost(potencia)
          return sum + (cost || 0)
        }, 0)
      return { name: label, receita }
    }),
    [monthRange, filteredProjects],
  )

  const monthlyPowerData = useMemo(
    () => monthRange.map(month => {
      const mk = monthKey(month)
      const label = format(month, 'MMM/yy', { locale: ptBR })
      const potenciaInstalada = filteredProjects
        .filter(p => { const d = projectDate(p); return d && monthKey(d) === mk })
        .reduce((sum, p) => sum + (typeof p.potencia === 'number' ? p.potencia : 0), 0)
      return { name: label, potenciaInstalada }
    }),
    [monthRange, filteredProjects],
  )

  // ── sub-aba PROJETOS ─────────────────────────────────────────────────────

  const monthlyEvolution = useMemo(() => {
    return monthRange.map(month => {
      const mk      = monthKey(month)
      const label   = format(month, 'MMM/yy', { locale: ptBR })
      const endOfM  = endOfMonth(month)

      const created = filteredProjects.filter(p => {
        const d = projectDate(p); return d && monthKey(d) === mk
      }).length

      const concluded = conclusoes.filter(c => {
        const d = new Date(c.created_at); return monthKey(d) === mk
      }).length

      // Projetos abertos ao final do mês (criados até o mês E não concluídos até o mês)
      const open = filteredProjects.filter(p => {
        const d = projectDate(p)
        if (!d || d > endOfM) return false
        const conclusao = conclusoes.find(c => c.project_id === p.id)
        if (!conclusao) return true
        return new Date(conclusao.created_at) > endOfM
      }).length

      return { month: label, Criados: created, Concluídos: concluded, open }
    })
  }, [monthRange, filteredProjects, conclusoes])

  const slaData = useMemo(() => {
    const today = new Date()
    const byStatus: Record<string, { ok: number; delayed: number; name: string }> = {}
    for (const p of filteredProjects) {
      const slug = p.status || 'indefinido'
      if (TERMINAL.has(slug)) continue
      const info   = availableStatuses.find(s => s.slug === slug)
      const slaDays: number | undefined = (info as any)?.slaDays ?? (info as any)?.sla_days
      if (!slaDays || slaDays <= 0) continue
      if (!byStatus[slug]) byStatus[slug] = { ok: 0, delayed: 0, name: info!.name }
      const last = toSafeDate((p as any).updatedAt || (p as any).updated_at)
      if (last) {
        const days = Math.floor((today.getTime() - last.getTime()) / 86_400_000)
        if (days > slaDays) byStatus[slug].delayed++
        else                byStatus[slug].ok++
      }
    }
    return Object.values(byStatus).map(v => ({
      name: v.name, 'No Prazo': v.ok, Atrasado: v.delayed,
    }))
  }, [filteredProjects, availableStatuses])

  // ── sub-aba CLIENTES ─────────────────────────────────────────────────────

  // Novos clientes por mês — primeira aparição da empresa_integradora (em todos os projetos, sem filtro de período)
  const newClientsByMonth = useMemo(() => {
    const firstAppearance: Record<string, Date> = {}
    let list = allProjects
    if (filterDistributor  !== 'all') list = list.filter(p => p.distribuidora === filterDistributor)
    if (filterCollaborator !== 'all') list = list.filter(p => projectResponsible(p) === filterCollaborator)

    for (const p of list) {
      const client = projectClient(p)
      if (client === 'Não informado') continue
      const d = projectDate(p)
      if (!d) continue
      if (!firstAppearance[client] || d < firstAppearance[client]) firstAppearance[client] = d
    }

    return monthRange.map(month => {
      const mk    = monthKey(month)
      const label = format(month, 'MMM/yy', { locale: ptBR })
      const novos = Object.values(firstAppearance).filter(d => monthKey(d) === mk).length
      return { month: label, 'Novos Clientes': novos }
    })
  }, [allProjects, monthRange, filterDistributor, filterCollaborator])

  const clientRanking = useMemo(() => {
    const by: Record<string, { count: number; revenue: number }> = {}
    for (const p of filteredProjects) {
      const c = projectClient(p)
      if (!by[c]) by[c] = { count: 0, revenue: 0 }
      by[c].count++
      by[c].revenue += projectRevenue(p)
    }
    return Object.entries(by)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
  }, [filteredProjects])

  const distData = useMemo(
    () =>
      Object.entries(
        filteredProjects.reduce((acc, p) => {
          const k = p.distribuidora || 'Não informada'
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      )
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    [filteredProjects],
  )

  // ── sub-aba EQUIPE ───────────────────────────────────────────────────────

  const collaboratorNames = useMemo(() => {
    const names = new Set<string>()
    for (const p of allProjects) {
      const name = projectResponsible(p)
      if (name) names.add(name)
    }
    return Array.from(names).sort()
  }, [allProjects])

  const collabData = useMemo(() => {
    const by: Record<string, { name: string; count: number; revenue: number }> = {}
    for (const p of filteredProjects) {
      const name = projectResponsible(p) || 'Não atribuído'
      if (!by[name]) by[name] = { name, count: 0, revenue: 0 }
      by[name].count++
      by[name].revenue += projectRevenue(p)
    }
    return Object.values(by).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [filteredProjects])

  const billingData = useMemo(
    () =>
      Object.entries(
        filteredProjects.reduce((acc, p) => {
          const k = (p as any).billing_mode || 'avulso'
          acc[k] = (acc[k] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      )
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: BILLING_LABELS[k] || k, value: v })),
    [filteredProjects],
  )

  // ── render ───────────────────────────────────────────────────────────────

  const tabBtn = (tab: typeof metricaTab, label: string) => (
    <button
      onClick={() => setMetricaTab(tab)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        metricaTab === tab
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {label}
    </button>
  )

  const emptyState = (msg = 'Sem dados no período') => (
    <p className="text-sm text-muted-foreground text-center py-10">{msg}</p>
  )

  return (
    <div className="space-y-5">

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <Card className="border-2 border-gray-200 dark:border-gray-700">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">Período:</span>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterPeriod(opt.value); setFilterYear('all') }}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    filterYear === 'all' && filterPeriod === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ano:</span>
                <Select value={filterYear} onValueChange={v => { setFilterYear(v); if (v !== 'all') setFilterPeriod('all') }}>
                  <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {availableYears.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {uniqueDistributors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Distribuidora:</span>
                <Select value={filterDistributor} onValueChange={setFilterDistributor}>
                  <SelectTrigger className="h-8 w-52 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueDistributors.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {collaboratorNames.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Colaborador:</span>
                <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
                  <SelectTrigger className="h-8 w-48 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {collaboratorNames.map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <span className="ml-auto text-sm text-muted-foreground font-mono tabular-nums">
              {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub-tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {tabBtn('visao-geral', 'Visão Geral')}
        {showAdvancedTabs && tabBtn('projetos', 'Projetos')}
        {showAdvancedTabs && tabBtn('clientes', 'Clientes')}
        {showAdvancedTabs && tabBtn('equipe',   'Equipe')}
      </div>

      {/* ═══════════════ SUB-ABA: VISÃO GERAL ════════════════════════════ */}
      {metricaTab === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />,
                label: 'Total de Projetos', value: kpi.total, caption: `+${newThisMonth} neste mês`,
              },
              {
                icon: <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
                label: 'Projetos Ativos', value: kpi.activeCount, caption: 'excluindo finalizados e cancelados',
              },
              {
                icon: <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
                label: 'Potência Total (kWp)', value: totalPower.toFixed(2),
                caption: `${kpi.total > 0 ? (totalPower / kpi.total).toFixed(2) : 0} kWp em média`,
              },
              {
                icon: <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
                label: 'Receita Total', value: fmtS(kpi.totalRevenue), caption: 'valor total dos projetos',
              },
            ].map((card, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3.5"
              >
                <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center flex-shrink-0">
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-muted-foreground m-0 truncate">{card.label}</p>
                  <p className="text-[22px] font-extrabold text-gray-900 dark:text-gray-100 font-mono tabular-nums m-0 mt-0.5">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground/70 m-0 mt-0.5 truncate">{card.caption}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operacional</p>
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Projetos por Mês</CardTitle>
                  <CardDescription>Evolução no período selecionado</CardDescription>
                </div>
                <span className="inline-flex items-center text-[11px] text-muted-foreground border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1 whitespace-nowrap mt-1">
                  {periodLabel}
                </span>
              </CardHeader>
              <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyEvolution} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={true} />
                    <YAxis fontSize={12} tickLine={false} axisLine={true} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Criados" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
                <CardDescription>Projetos por estágio do pipeline (todos os status configurados no Kanban)</CardDescription>
              </CardHeader>
              <CardContent>
                {projectsByStatusData.length === 0
                  ? emptyState()
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(240, projectsByStatusData.length * 34)}>
                      <BarChart data={projectsByStatusData} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={155} fontSize={10} tickLine={false} />
                        <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                          {projectsByStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>
          </div>

          {canViewFinancials && (
            <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financeiro</p>
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card className="lg:col-span-1 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <CardHeader>
                  <CardTitle>Faturamento Mensal Estimado</CardTitle>
                  <CardDescription>Receita estimada (R$)</CardDescription>
                </CardHeader>
                <CardContent className="pl-0 pr-3 sm:pl-2 sm:pr-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyRevenueData} margin={{ top: 5, right: 10, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                      <YAxis fontSize={12} tickLine={false} axisLine={true} tickFormatter={(value) => fmtS(value).replace('R$', '')} />
                      <Tooltip formatter={(value: number) => fmt(value)} />
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
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={true} />
                      <YAxis fontSize={12} tickLine={false} axisLine={true} tickFormatter={(value) => `${value} kWp`} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)} kWp`} />
                      <Area type="monotone" dataKey="potenciaInstalada" stroke="#ffc658" fill="#ffc658" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ SUB-ABA: PROJETOS ══════════════════════════════ */}
      {metricaTab === 'projetos' && (
        <div className="space-y-6">
          {/* Aviso: nenhum status de conclusão configurado */}
          {conclusionConfigured === false && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Nenhum status do Kanban está configurado como &ldquo;conclusão de projeto&rdquo;. O gráfico de <strong>Concluídos</strong> ficará vazio.
                {' '}Acesse o <strong>Kanban</strong> e clique no ícone <CheckCircle className="inline h-3.5 w-3.5" /> ao lado de uma coluna para marcá-la.
              </span>
            </div>
          )}

          {/* Evolução criados x concluídos */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Evolução: Criados × Concluídos</CardTitle>
              <CardDescription>Projetos novos vs. finalizados por mês</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConclusoes ? (
                <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyEvolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Criados"    fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
                    <Bar dataKey="Concluídos" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={18} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Projetos em aberto acumulados */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Backlog em Aberto</CardTitle>
              <CardDescription>
                Projetos ativos ao final de cada mês
                <span className="block text-xs text-muted-foreground/70 mt-0.5">
                  Baseado em projetos não concluídos registrados na linha do tempo
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingConclusoes ? (
                <p className="text-sm text-muted-foreground text-center py-10">Carregando...</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyEvolution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                    <Tooltip formatter={(v: number) => [v, 'Projetos em aberto']} />
                    <Area type="monotone" dataKey="open" name="Em Aberto" stroke="#f59e0b" fill="#fde68a" fillOpacity={0.5} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* SLA */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Projetos no Prazo por Etapa</CardTitle>
              <CardDescription>
                Dentro vs. fora do prazo configurado
                <span className="block text-xs text-muted-foreground/70 mt-0.5">
                  Baseado na última atualização do projeto
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {slaData.length === 0
                ? emptyState('Nenhuma etapa com SLA configurado no período')
                : (
                  <ResponsiveContainer width="100%" height={Math.max(240, slaData.length * 40)}>
                    <BarChart data={slaData} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={155} fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="No Prazo" stackId="sla" fill="#22c55e" barSize={20} />
                      <Bar dataKey="Atrasado" stackId="sla" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ SUB-ABA: CLIENTES ══════════════════════════════ */}
      {metricaTab === 'clientes' && (
        <div className="space-y-6">
          {/* Novos clientes por mês */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Novos Clientes por Mês</CardTitle>
              <CardDescription>
                Primeira aparição de cada empresa integradora na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={newClientsByMonth} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v, 'Novos clientes']} />
                  <Bar dataKey="Novos Clientes" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking de projetos por cliente */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle>Ranking por Cliente</CardTitle>
                <CardDescription>Projetos por empresa integradora</CardDescription>
              </CardHeader>
              <CardContent>
                {clientRanking.length === 0
                  ? emptyState()
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(240, clientRanking.length * 34)}>
                      <BarChart data={clientRanking} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={150} fontSize={10} tickLine={false} />
                        <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>

            {/* Faturamento por cliente */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle>Faturamento por Cliente</CardTitle>
                <CardDescription>Receita bruta acumulada por empresa integradora</CardDescription>
              </CardHeader>
              <CardContent>
                {clientRanking.length === 0
                  ? emptyState()
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(240, clientRanking.length * 34)}>
                      <BarChart
                        data={clientRanking.slice().sort((a, b) => b.revenue - a.revenue)}
                        layout="vertical"
                        margin={{ left: 8, right: 28, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" fontSize={11} tickLine={false} tickFormatter={fmtS} />
                        <YAxis type="category" dataKey="name" width={150} fontSize={10} tickLine={false} />
                        <Tooltip formatter={(v: number) => [fmt(v), 'Receita']} />
                        <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Projetos por distribuidora */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Projetos por Distribuidora</CardTitle>
              <CardDescription>Volume por concessionária de energia</CardDescription>
            </CardHeader>
            <CardContent>
              {distData.length === 0
                ? emptyState()
                : (
                  <ResponsiveContainer width="100%" height={Math.max(240, distData.length * 32)}>
                    <BarChart data={distData} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={170} fontSize={10} tickLine={false} />
                      <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ SUB-ABA: EQUIPE ═════════════════════════════════ */}
      {metricaTab === 'equipe' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Projetos por colaborador */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle>Projetos por Colaborador</CardTitle>
                <CardDescription>Quantidade de projetos sob responsabilidade</CardDescription>
              </CardHeader>
              <CardContent>
                {collabData.length === 0
                  ? emptyState()
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(220, collabData.length * 36)}>
                      <BarChart data={collabData} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                        <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>

            {/* Receita por colaborador */}
            <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
              <CardHeader>
                <CardTitle>Receita por Colaborador</CardTitle>
                <CardDescription>Valor total dos projetos sob responsabilidade</CardDescription>
              </CardHeader>
              <CardContent>
                {collabData.length === 0
                  ? emptyState()
                  : (
                    <ResponsiveContainer width="100%" height={Math.max(220, collabData.length * 36)}>
                      <BarChart data={collabData} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" fontSize={11} tickLine={false} tickFormatter={fmtS} />
                        <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                        <Tooltip formatter={(v: number) => [fmt(v), 'Receita']} />
                        <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
              </CardContent>
            </Card>
          </div>

          {/* Modo de cobrança */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
            <CardHeader>
              <CardTitle>Modo de Cobrança</CardTitle>
              <CardDescription>Distribuição por tipo de contrato</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {billingData.length === 0
                ? emptyState()
                : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={billingData}
                        cx="50%"
                        cy="45%"
                        outerRadius={110}
                        dataKey="value"
                        label={({ name, percent }) =>
                          percent > 0.04 ? `${name} ${Math.round(percent * 100)}%` : ''
                        }
                        labelLine
                      >
                        {billingData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
