import { useProjects } from '@/lib/hooks/useProjects'
// Firebase Timestamp removido - usando Date nativo
import { Project } from '@/types/project'
import { getProjectStatuses, ProjectStatusInfo } from '@/lib/services/kanbanService'
import { useState, useEffect } from 'react'
import { devLog } from '@/lib/utils/productionLogger'

export function ProjectsOverview() {
  const { projects, loading } = useProjects()
  const [availableStatuses, setAvailableStatuses] = useState<ProjectStatusInfo[]>([])
  const [statusLoading, setStatusLoading] = useState(true)

  // Carregar status dinâmicos do tenant
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        setStatusLoading(true);
        const statuses = await getProjectStatuses();
        setAvailableStatuses(statuses);
        devLog.log('[ProjectsOverview] Status carregados:', statuses.length);
      } catch (error) {
        devLog.error('[ProjectsOverview] Erro ao carregar status:', error);
        setAvailableStatuses([]);
      } finally {
        setStatusLoading(false);
      }
    };

    loadStatuses();
  }, []);

  // Get real numbers from Firebase data
  const stats = {
    // Total is the actual number of projects in Firebase
    total: projects.length,

    // Monthly projects - count projects created this month
    mensais: projects.filter((p: Project) => {
      if (!p.createdAt) return false;
      const projectDate = new Date(
        typeof p.createdAt !== 'string' 
          ? (p.createdAt as any).seconds * 1000 // Legacy timestamp 
          : p.createdAt
      );
      const now = new Date();
      return projectDate.getMonth() === now.getMonth() && 
             projectDate.getFullYear() === now.getFullYear();
    }).length,

    // Yearly projects - count projects created this year
    anuais: projects.filter((p: Project) => {
      if (!p.createdAt) return false;
      const projectDate = new Date(
        typeof p.createdAt !== 'string' 
          ? (p.createdAt as any).seconds * 1000 // Legacy timestamp 
          : p.createdAt
      );
      const now = new Date();
      return projectDate.getFullYear() === now.getFullYear();
    }).length,

    // Completed projects - count projects with status finalizados (usar slugs dinâmicos)
    concluidos: projects.filter(p => {
      // Procurar por status que podem indicar conclusão
      const finalizadoStatuses = availableStatuses.filter(s =>
        s.slug === 'finalizado' || s.name.toLowerCase().includes('finalizado') || s.name.toLowerCase().includes('concluído')
      );
      return finalizadoStatuses.some(s => s.slug === p.status);
    }).length
  }

  // Calculate real percentages
  const percentages = {
    total: 100,
    mensais: Math.round((stats.mensais / stats.total) * 100) || 0,
    anuais: Math.round((stats.anuais / stats.total) * 100) || 0,
    concluidos: Math.round((stats.concluidos / stats.total) * 100) || 0
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Total */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="text-4xl font-bold mb-1">{stats.total}</div>
        <p className="text-sm text-gray-600">Total de Projetos</p>
        <div className="mt-2 bg-orange-100 h-1 rounded-full w-full">
          <div 
            className="bg-orange-500 h-1 rounded-full" 
            style={{ width: `${percentages.total}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentages.total}% do total</p>
      </div>

      {/* Monthly */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="text-4xl font-bold mb-1">{stats.mensais}</div>
        <p className="text-sm text-gray-600">Projetos Mensais</p>
        <div className="mt-2 bg-blue-100 h-1 rounded-full w-full">
          <div 
            className="bg-blue-500 h-1 rounded-full" 
            style={{ width: `${percentages.mensais}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentages.mensais}% do total</p>
      </div>

      {/* Yearly */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="text-4xl font-bold mb-1">{stats.anuais}</div>
        <p className="text-sm text-gray-600">Projetos Anuais</p>
        <div className="mt-2 bg-green-100 h-1 rounded-full w-full">
          <div 
            className="bg-green-500 h-1 rounded-full" 
            style={{ width: `${percentages.anuais}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentages.anuais}% do total</p>
      </div>

      {/* Completed */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="text-4xl font-bold mb-1">{stats.concluidos}</div>
        <p className="text-sm text-gray-600">Projetos Concluídos</p>
        <div className="mt-2 bg-purple-100 h-1 rounded-full w-full">
          <div 
            className="bg-purple-500 h-1 rounded-full" 
            style={{ width: `${percentages.concluidos}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentages.concluidos}% do total</p>
      </div>
    </div>
  )
} 