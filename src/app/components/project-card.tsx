import { Project } from '@/types/project'
import { Badge } from "@/components/ui/badge"
import { User, Edit, ChevronRight, ChevronLeft } from 'lucide-react'
import { format } from 'date-fns/format'
import { useAuth } from '@/lib/hooks/useAuth'

export interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onUpdate?: (project: Project) => void;
}

const getPriorityColor = (priority: any) => {
  switch (priority) {
    case "Alta":
      return "bg-red-100 text-red-800"
    case "Média":
      return "bg-yellow-100 text-yellow-800"
    case "Baixa":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const STATUS_ORDER = [
  'Não Iniciado',
  'Em Desenvolvimento', 
  'Projeto Aprovado',
  'Aguardando Solicitar Vistoria',
  'Projeto Pausado',
  'Em Vistoria',
  'Finalizado',
  'Cancelado'
] as any;

export function ProjectCard({ project, onClick, onUpdate }: ProjectCardProps) {
  const { user } = useAuth()
  const isAdmin = user?.email === 'gvcasarin@gmail.com'

  const handleStatusChange = (direction: 'next' | 'prev', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin || !onUpdate) return;

    const currentIndex = STATUS_ORDER.indexOf(project.status as any);
    let newIndex;

    if (direction === 'next') {
      newIndex = currentIndex < STATUS_ORDER.length - 1 ? currentIndex + 1 : currentIndex;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    }

    const newStatus = STATUS_ORDER[newIndex];
    onUpdate({ ...project, status: newStatus });
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer relative
        ${isAdmin ? 'hover:border-blue-500 border-2' : ''}`}
    >
      {isAdmin && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button 
            onClick={(e) => handleStatusChange('prev', e)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Previous Status"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button 
            onClick={(e) => handleStatusChange('next', e)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Next Status"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Edit Project"
          >
            <Edit className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-medium">
            {project.number}
            {isAdmin && <span className="ml-2 text-xs text-blue-500">(Admin)</span>}
          </div>
          <div className="text-xs text-gray-500">
            {project.status}
          </div>
        </div>
        <Badge className={getPriorityColor(project.prioridade)}>
          {project.prioridade}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
          </svg>
          <span className="truncate">{project.empresaIntegradora}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <User className="w-4 h-4" />
          <span className="truncate">{project.nomeClienteFinal}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
          <span className="truncate">{project.distribuidora}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8l10-12h-9l1-8z" />
          </svg>
          <span>{project.potencia} kWp</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{format(new Date(project.dataEntrega), 'dd/MM/yyyy')}</span>
        </div>
      </div>
    </div>
  )
}
