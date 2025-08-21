/**
 * Dynamic imports para componentes de Dashboard
 * Permite code splitting e carregamento lazy para reduzir o bundle inicial
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports para componentes de dashboard com fallbacks simples
export const RecentProjects = dynamic(
  () => import('./recent-projects').then((mod) => mod.RecentProjects),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse h-[150px]">Carregando projetos recentes...</div>,
    ssr: false 
  }
);

export const ProjectSummary = dynamic(
  () => import('./project-summary').then((mod) => mod.ProjectSummary),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse h-[120px]">Carregando resumo...</div>,
    ssr: false 
  }
);

export const ProjectSpeedometer = dynamic(
  () => import('./project-speedometer').then((mod) => mod.ProjectSpeedometer),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse h-[120px]">Carregando...</div>,
    ssr: false 
  }
);

export const MonthlyProjectsGraph = dynamic(
  () => import('./monthly-projects-graph').then((mod) => mod.MonthlyProjectsGraph),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse h-[200px]">Carregando gráfico...</div>,
    ssr: false 
  }
);

export const ClientWrapper = dynamic(
  () => import('./client-wrapper').then((mod) => mod.DashboardClientWrapper),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse h-[150px]">Carregando...</div>,
    ssr: false 
  }
);
