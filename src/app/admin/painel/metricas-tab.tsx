'use client'

import { useMemo, useState, useEffect } from 'react'
import { subMonths } from 'date-fns/subMonths'
import { Project } from '@/types/project'
import { ProjectStatusInfo } from '@/lib/services/kanbanService'
import { toSafeDate } from '@/lib/utils/dateHelpers'
import { devLog } from '@/lib/utils/productionLogger'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { TrendingUp, DollarSign, Layers, ShieldCheck } from 'lucide-react'

// ─── tipos ───────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface MetricasTabProps {
  allProjects: Project[]
  availableStatuses: ProjectStatusInfo[]
  isActive: boolean
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316', '#14b8a6']

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`
  return fmt(v)
}

const BILLING_LABELS: Record<string, string> = {
  avulso: 'Avulso',
  pacote: 'Pacote',
  assinatura: 'Assinatura',
}

const PERIOD_OPTIONS = [
  { label: '1M', value: '1m', months: 1 },
  { label: '3M', value: '3m', months: 3 },
  { label: '6M', value: '6m', months: 6 },
  { label: '12M', value: '12m', months: 12 },
  { label: 'Tudo', value: 'all', months: 0 },
]

const TERMINAL = new Set(['finalizado', 'cancelado'])

// ─── componente ──────────────────────────────────────────────────────────────

export default function MetricasTab({ allProjects, availableStatuses, isActive }: MetricasTabProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [filterPeriod, setFilterPeriod] = useState('12m')
  const [filterDistributor, setFilterDistributor] = useState('all')
  const [filterCollaborator, setFilterCollaborator] = useState('all')

  // Carrega membros da equipe apenas quando a aba fica ativa (lazy)
  useEffect(() => {
    if (!isActive || teamMembers.length > 0) return
    fetch('/api/admin/team-members')
      .then(r => r.json())
      .then(d => setTeamMembers(d.data || []))
      .catch(() => devLog.warn('[MetricasTab] Não foi possível carregar membros da equipe'))
  }, [isActive])

  // ── filtros ──────────────────────────────────────────────────────────────

  const uniqueDistributors = useMemo(
    () => [...new Set(allProjects.map(p => p.distribuidora).filter(Boolean))].sort() as string[],
    [allProjects],
  )

  const filteredProjects = useMemo(() => {
    let list = allProjects

    if (filterPeriod !== 'all') {
      const months = PERIOD_OPTIONS.find(o => o.value === filterPeriod)?.months ?? 12
      const cutoff = subMonths(new Date(), months)
      list = list.filter(p => {
        const d = toSafeDate((p as any).createdAt || (p as any).created_at)
        return d !== null && d >= cutoff
      })
    }

    if (filterDistributor !== 'all') {
      list = list.filter(p => p.distribuidora === filterDistributor)
    }

    if (filterCollaborator !== 'all') {
      list = list.filter(p => {
        const id = (p as any).created_by || (p as any).userId
        return id === filterCollaborator
      })
    }

    return list
  }, [allProjects, filterPeriod, filterDistributor, filterCollaborator])

  // ── métricas agregadas ───────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const byCollab: Record<string, { id: string; name: string; count: number; revenue: number }> = {}
    const byDist: Record<string, { count: number; revenue: number }> = {}
    const byBilling: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const sla: Record<string, { ok: number; delayed: number; name: string }> = {}
    let totalRevenue = 0
    let activeCount = 0
    const today = new Date()

    for (const p of filteredProjects) {
      const collabId: string = (p as any).created_by || (p as any).userId || 'unknown'
      const member = teamMembers.find(m => m.id === collabId)
      const collabName = member?.name || member?.email || `#${collabId.slice(-6)}`
      const revenue: number = (p as any).valor_projeto || (p as any).valorProjeto || 0

      // por colaborador
      if (!byCollab[collabId]) byCollab[collabId] = { id: collabId, name: collabName, count: 0, revenue: 0 }
      byCollab[collabId].count++
      byCollab[collabId].revenue += revenue

      // por distribuidora
      const dist = p.distribuidora || 'Não informada'
      if (!byDist[dist]) byDist[dist] = { count: 0, revenue: 0 }
      byDist[dist].count++
      byDist[dist].revenue += revenue

      // por modo de cobrança
      const mode: string = (p as any).billing_mode || 'avulso'
      byBilling[mode] = (byBilling[mode] || 0) + 1

      // funil por status
      const slug = p.status || 'indefinido'
      byStatus[slug] = (byStatus[slug] || 0) + 1

      totalRevenue += revenue
      if (!TERMINAL.has(slug)) activeCount++

      // SLA (aproximação: dias desde updated_at vs sla_days da etapa)
      const statusInfo = availableStatuses.find(s => s.slug === slug)
      const slaDays: number | undefined = (statusInfo as any)?.slaDays ?? (statusInfo as any)?.sla_days
      if (slaDays && slaDays > 0 && !TERMINAL.has(slug)) {
        if (!sla[slug]) sla[slug] = { ok: 0, delayed: 0, name: statusInfo!.name }
        const lastUpdate = toSafeDate((p as any).updatedAt || (p as any).updated_at)
        if (lastUpdate) {
          const days = Math.floor((today.getTime() - lastUpdate.getTime()) / 86_400_000)
          if (days > slaDays) sla[slug].delayed++
          else sla[slug].ok++
        }
      }
    }

    return { byCollab, byDist, byBilling, byStatus, sla, totalRevenue, activeCount }
  }, [filteredProjects, teamMembers, availableStatuses])

  // ── datasets dos gráficos ────────────────────────────────────────────────

  const collabData = useMemo(
    () =>
      Object.values(metrics.byCollab)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    [metrics.byCollab],
  )

  const distData = useMemo(
    () =>
      Object.entries(metrics.byDist)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
    [metrics.byDist],
  )

  const billingData = useMemo(
    () =>
      Object.entries(metrics.byBilling)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: BILLING_LABELS[k] || k, value: v })),
    [metrics.byBilling],
  )

  const funnelData = useMemo(
    () =>
      availableStatuses
        .filter(s => (s as any).is_active !== false)
        .sort(
          (a, b) =>
            ((a as any).order ?? (a as any).order_index ?? 0) -
            ((b as any).order ?? (b as any).order_index ?? 0),
        )
        .map(s => ({
          name: s.name,
          projetos: metrics.byStatus[s.slug] || 0,
          color: s.color || '#8884d8',
        })),
    [availableStatuses, metrics.byStatus],
  )

  const slaData = useMemo(
    () =>
      Object.entries(metrics.sla).map(([, v]) => ({
        name: v.name,
        'No Prazo': v.ok,
        Atrasado: v.delayed,
      })),
    [metrics.sla],
  )

  const slaPercent = useMemo(() => {
    const totals = Object.values(metrics.sla).reduce(
      (acc, v) => { acc.ok += v.ok; acc.total += v.ok + v.delayed; return acc },
      { ok: 0, total: 0 },
    )
    return totals.total > 0 ? Math.round((totals.ok / totals.total) * 100) : null
  }, [metrics.sla])

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Filtros ─────────────────────────────────────────────────────── */}
      <Card className="border-2 border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">

            {/* Período */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">Período:</span>
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterPeriod(opt.value)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    filterPeriod === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Distribuidora */}
            {uniqueDistributors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Distribuidora:</span>
                <Select value={filterDistributor} onValueChange={setFilterDistributor}>
                  <SelectTrigger className="h-8 w-52 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueDistributors.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Colaborador */}
            {teamMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Colaborador:</span>
                <Select value={filterCollaborator} onValueChange={setFilterCollaborator}>
                  <SelectTrigger className="h-8 w-48 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {teamMembers.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredProjects.length} projeto{filteredProjects.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" /> Total de Projetos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {filteredProjects.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {fmtShort(metrics.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">valor total dos projetos</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Projetos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {metrics.activeCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">excluindo finalizados e cancelados</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Compliance SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {slaPercent !== null ? (
              <>
                <div className={`text-3xl font-bold ${slaPercent >= 80 ? 'text-green-600' : slaPercent >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {slaPercent}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">projetos ativos dentro do prazo</p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground pt-1">Sem SLA configurado</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Colaboradores ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Projetos por Colaborador</CardTitle>
            <CardDescription>Quantidade de projetos sob responsabilidade</CardDescription>
          </CardHeader>
          <CardContent>
            {collabData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, collabData.length * 36)}>
                <BarChart data={collabData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
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

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Receita por Colaborador</CardTitle>
            <CardDescription>Valor total dos projetos sob responsabilidade</CardDescription>
          </CardHeader>
          <CardContent>
            {collabData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, collabData.length * 36)}>
                <BarChart data={collabData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} tickLine={false} tickFormatter={fmtShort} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={11} tickLine={false} />
                  <Tooltip formatter={(v: number) => [fmt(v), 'Receita']} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Distribuidora + Modo de Cobrança ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Projetos por Distribuidora</CardTitle>
            <CardDescription>Volume por concessionária de energia</CardDescription>
          </CardHeader>
          <CardContent>
            {distData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, distData.length * 32)}>
                <BarChart data={distData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
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

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Modo de Cobrança</CardTitle>
            <CardDescription>Distribuição por tipo de contrato</CardDescription>
          </CardHeader>
          <CardContent>
            {billingData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={billingData}
                    cx="50%"
                    cy="45%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.04 ? `${name} ${Math.round(percent * 100)}%` : ''
                    }
                    labelLine
                  >
                    {billingData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Funil + SLA ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
            <CardDescription>Distribuição de projetos por etapa do pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            {funnelData.every(d => d.projetos === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados no período</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, funnelData.length * 34)}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={160} fontSize={10} tickLine={false} />
                  <Tooltip formatter={(v: number) => [v, 'Projetos']} />
                  <Bar dataKey="projetos" radius={[0, 4, 4, 0]} barSize={18}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle>Compliance SLA por Etapa</CardTitle>
            <CardDescription>
              Projetos ativos dentro e fora do prazo configurado
              <span className="block text-xs text-muted-foreground/70 mt-0.5">
                Baseado na última atualização do projeto
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {slaData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                Nenhuma etapa com SLA configurado ou sem projetos ativos no período
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, slaData.length * 40)}>
                <BarChart data={slaData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={160} fontSize={10} tickLine={false} />
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
    </div>
  )
}
