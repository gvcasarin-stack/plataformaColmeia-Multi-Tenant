'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Project } from "@/types/project"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ProjectTable } from "@/features/projects"
import { useProjects } from '@/lib/hooks/useProjects'
import { useAuth } from '@/lib/hooks/useAuth'
import { toast } from "@/components/ui/use-toast"
import { devLog } from "@/lib/utils/productionLogger";
import React from 'react'

// Lazy load KanbanBoard component
const KanbanBoard = dynamic(() => import("@/components/kanban").then(mod => ({ default: mod.KanbanBoard })),
{
  loading: () => (
    <div className="w-full h-[500px] animate-pulse flex items-center justify-center bg-slate-100 rounded-lg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Carregando quadro Kanban...</p>
      </div>
    </div>
  ),
  ssr: false
});

// Lazy load AddColumnDialog component
const AddColumnDialog = dynamic(() => import("@/components/kanban").then(mod => ({ default: mod.AddColumnDialog })),
{
  ssr: false
});



export default function ProjetosPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { projects, updateProject } = useProjects()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')

  const viewKanbanRef = React.useRef<{ reloadColumnTitles: () => Promise<boolean> }>(null)

  // Debug logging for projects
  useEffect(() => {
    devLog.log(`[ProjetosPage] Received ${projects.length} projects from useProjects hook`);
    
    // Check for Carlinhos Maia projects
    const carlinhosMaiaProjects = projects.filter(p => 
      p.nomeClienteFinal?.includes('Carlinhos Maia') || 
      p.empresaIntegradora?.includes('Carlinhos Maia')
    );
    
    devLog.log(`[ProjetosPage] Found ${carlinhosMaiaProjects.length} Carlinhos Maia projects:`, 
      carlinhosMaiaProjects.map(p => ({
        id: p.id,
        number: p.number,
        empresaIntegradora: p.empresaIntegradora,
        nomeClienteFinal: p.nomeClienteFinal,
        status: p.status,
        userId: p.userId
      }))
    );
    
    // Count projects by status
    const statusCounts = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    devLog.log(`[ProjetosPage] Projects by status:`, statusCounts);
  }, [projects]);

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    
    const searchLower = searchQuery.toLowerCase();
    return projects.filter(project => 
      project.number.toLowerCase().includes(searchLower) ||
      project.nomeClienteFinal.toLowerCase().includes(searchLower) ||
      project.empresaIntegradora.toLowerCase().includes(searchLower)
    );
  }, [projects, searchQuery]);

  const handleProjectClick = (project: Project) => {
    devLog.log('Clicking project:', { id: project.id, number: project.number });
    router.push(`/projetos/${project.id}`);
  }



  return (
    <div className="space-y-6">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <h1 className="text-3xl font-bold">
              Projetos
            </h1>
            <p className="mt-2 text-blue-100">
              Gerencie todos os projetos do sistema
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-3 mt-4 md:mt-0">
            <div className="flex items-center">
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 text-white hover:text-white",
                    viewMode === 'kanban' && "bg-white/20 shadow-sm"
                  )}
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "px-3 text-white hover:text-white",
                    viewMode === 'table' && "bg-white/20 shadow-sm"
                  )}
                  onClick={() => setViewMode('table')}
                >
                  Tabela
                </Button>
              </div>
            </div>
            <div className="mt-2">
              <AddColumnDialog 
                onColumnAdded={(columnId, columnName) => {
                  toast({
                    title: "Coluna adicionada",
                    description: `A coluna "${columnName}" foi adicionada com sucesso. Atualizando a visualização...`,
                  })
                  // Forçar atualização da visualização
                  if (viewKanbanRef.current) {
                    viewKanbanRef.current.reloadColumnTitles();
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Search bar in header */}
        <div className="relative max-w-md mt-6 z-10">
          <Input
            placeholder="Buscar projetos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 bg-white/10 border-white/20 text-white placeholder:text-blue-100 focus:bg-white/20 focus:border-orange-300/50"
          />
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-blue-400 opacity-20 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-60 h-60 bg-indigo-500 opacity-20 rounded-full"></div>
      </div>
      
      {/* Project View Wrapper */}
      <div className="min-h-[400px]">
        {viewMode === 'kanban' && (
          <KanbanBoard
            projects={filteredProjects}
            onProjectUpdate={updateProject}
            ref={viewKanbanRef}
          />
        )}
        
        {viewMode === 'table' && (
          <ProjectTable
            projects={filteredProjects}
            onProjectClick={handleProjectClick}
          />
        )}
      </div>
      
      {/* Project Form Modal - O botão abaixo será comentado para removê-lo da UI */}
      {/* 
      <Button 
        className="fixed right-5 bottom-5 rounded-full h-12 w-12 shadow-lg bg-orange-500 hover:bg-orange-600"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <span className="sr-only">Novo Projeto</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </Button>
      */}
      

    </div>
  )
}
