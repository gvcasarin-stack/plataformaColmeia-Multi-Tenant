"use client"

import { useEffect, useState } from "react"
import { Project } from "@/types/project"
import { useProjects } from "@/lib/hooks/useProjects"
import { Loading } from "@/components/ui/loading"

export interface TimelineProps {
  projectId: string
}

export function Timeline({ projectId }: TimelineProps) {
  const { projects, loading } = useProjects()
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    const foundProject = projects.find(p => p.id === projectId)
    setProject(foundProject || null)
  }, [projectId, projects])

  if (loading) return <Loading />
  if (!project) return <div>Projeto não encontrado</div>

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Atualizações</h3>
      {project.timeline?.length ? (
        <div className="space-y-4">
          {project.timeline.map((event, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-orange-500" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(event.timestamp).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1">{event.description}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Por: {event.userName || event.user || 'Usuário'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">Nenhuma atualização registrada.</p>
      )}
    </div>
  )
} 