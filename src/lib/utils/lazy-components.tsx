import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Lazily loaded dashboard components for better performance
 */

// Dashboard components
export const LazyProjectSummary = dynamic(
  () => import('@/components/dashboard/project-summary').then((mod) => mod.ProjectSummary),
  {
    loading: () => (
      <div className="p-4 bg-white/80 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-4">
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-6"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-6"></div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-6"></div>
          </div>
        </div>
      </div>
    ),
    ssr: false
  }
);

export const LazyRecentProjects = dynamic(
  () => import('@/components/dashboard/recent-projects').then((mod) => mod.RecentProjects),
  {
    loading: () => (
      <div className="p-4 bg-white/80 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gray-200"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false
  }
);

export const LazyMonthlyProjectsGraph = dynamic(
  () => import('@/components/dashboard/monthly-projects-graph').then(mod => mod.MonthlyProjectsGraph),
  {
    loading: () => (
      <div className="p-4 bg-white/80 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-[200px] bg-gray-100 rounded-lg"></div>
      </div>
    ),
    ssr: false
  }
);

export const LazyProjectSpeedometer = dynamic(
  () => import('@/components/dashboard/project-speedometer').then(mod => mod.ProjectSpeedometer),
  {
    loading: () => (
      <div className="p-4 bg-white/80 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-[150px] w-[150px] mx-auto bg-gray-100 rounded-full"></div>
      </div>
    ),
    ssr: false
  }
);

// Kanban components
export const LazyKanbanBoard = dynamic(
  () => import('@/components/kanban').then((mod) => ({ default: mod.KanbanBoard })),
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
  }
);

// Modal components
export const LazyCreateProjectModal = dynamic(
  () => import('@/components/client/create-project-modal').then((mod) => mod.ClientCreateProjectModal),
  { 
    ssr: false 
  }
);

export const LazyProjectViewerDialog = dynamic(
  () => import('@/app/components/expanded-project-view').then((mod) => mod.ExpandedProjectView),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);

export const LazySimpleModal = dynamic(
  () => import('@/components/simple-modal').then((mod) => mod.SimpleModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);

export const LazyPasswordChangeModal = dynamic(
  () => import('@/components/client/PasswordChangeModal').then((mod) => mod.PasswordChangeModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);

export const LazyClientCreateProjectModal = dynamic(
  () => import('@/components/client/create-project-modal').then((mod) => mod.ClientCreateProjectModal),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);

export const LazyNewCardModal = dynamic(
  () => import('@/app/components/kanban/NewCardModal'),
  {
    loading: () => (
      <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false
  }
);
