import React from 'react'
import { Project } from '@/types/project'
import { Badge } from '@/components/ui/badge'
import { Building2, User, Building, Calendar } from 'lucide-react'

/**
 * Card de projeto usado nas visualizações de lista e kanban
 */
interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Project Number and Priority */}
      <div className="flex justify-between items-center mb-2">
        <div className="font-medium text-gray-900">#{project.number}</div>
        <Badge variant={
          project.prioridade === "Alta" ? "destructive" :
          project.prioridade === "Média" ? "secondary" :
          "outline"
        } className="text-xs">
          {project.prioridade}
        </Badge>
      </div>

      {/* Project Details */}
      <div className="space-y-2">
        {/* Empresa Integradora */}
        <div className="flex items-center gap-2 text-gray-600">
          <Building2 className="h-4 w-4" />
          <span className="text-sm">{project.empresaIntegradora || 'N/A'}</span>
        </div>

        {/* Cliente Final */}
        <div className="flex items-center gap-2 text-gray-600">
          <User className="h-4 w-4" />
          <span className="text-sm">{project.nomeClienteFinal || 'N/A'}</span>
        </div>

        {/* Distribuidora */}
        <div className="flex items-center gap-2 text-gray-600">
          <Building className="h-4 w-4" />
          <span className="text-sm">{project.distribuidora || 'N/A'}</span>
        </div>

        {/* Bottom row with Potência and Data de Entrega */}
        <div className="flex justify-between items-center pt-2 mt-1 border-t border-gray-100">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-sm">{project.potencia} kWp</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              {project.dataEntrega ? new Date(project.dataEntrega).toLocaleDateString('pt-BR') : 'N/A'}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex justify-between items-center">
          <Badge variant={
            project.status === "Em Desenvolvimento" ? "warning" :
            project.status === "Finalizado" ? "success" :
            "secondary"
          } className="text-xs">
            {project.status}
          </Badge>
        </div>
      </div>
    </div>
  )
}
