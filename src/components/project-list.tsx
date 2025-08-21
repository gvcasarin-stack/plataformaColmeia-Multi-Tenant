"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateProjectModal } from "@/components/create-project-modal"
import { ProjectManagementTable } from "@/features/projects"
import { 
  PlusIcon, 
  SearchIcon, 
  LayoutGridIcon, 
  TableIcon 
} from "@/components/icons"
import { useProjects } from "@/lib/hooks/useProjects"
import { Loading } from "@/components/ui/loading"

export function ProjectList() {
  const [view, setView] = useState<'card' | 'kanban'>('card')
  const [searchQuery, setSearchQuery] = useState("")
  const { projects, loading, error, addProject } = useProjects()

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  if (loading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        Erro ao carregar projetos. Por favor, tente novamente.
      </div>
    )
  }

  const lastProjectNumber = projects
    .map(p => p.number)
    .sort()
    .pop()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold">Projetos</h1>
          <CreateProjectModal
            onProjectCreated={addProject}
            lastProjectNumber={lastProjectNumber}
            existingProjectNumbers={projects.map(p => p.number)}
          >
            <Button size="sm" className="ml-4">
              <PlusIcon className="h-4 w-4 mr-2" />
              Novo Projeto
            </Button>
          </CreateProjectModal>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-8 w-[300px]"
            />
          </div>
          <div className="border rounded-md p-1">
            <Button
              variant={view === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('card')}
              className="px-2"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              className="px-2"
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ProjectManagementTable
        view={view}
        searchQuery={searchQuery}
      />
    </div>
  )
}
