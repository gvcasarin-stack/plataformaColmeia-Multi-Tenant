import { Project } from '@/types/project'
import { useProjects } from '@/lib/hooks/useProjects'
import { devLog } from "@/lib/utils/productionLogger";
import { KanbanBoard } from '@/components/kanban'

export function AdminBoard() {
  const { projects, updateProject } = useProjects()

  const handleProjectUpdate = async (updatedProject: Project) => {
    try {
      await updateProject(updatedProject)
      return true
    } catch (error) {
      devLog.error('Erro ao atualizar projeto:', error)
      return false
    }
  }

  return (
    <KanbanBoard
      projects={projects}
      onProjectUpdate={handleProjectUpdate}
    />
  )
}
