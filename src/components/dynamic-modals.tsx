/**
 * Dynamic imports para componentes de modal
 * Reduz o tamanho inicial do bundle carregando modais apenas quando necessário
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Componente de fallback para modais
const ModalFallback = () => (
  <div className="p-5 rounded-md bg-gray-100 animate-pulse">
    <div className="h-10 w-60 bg-gray-200 mb-4 rounded"></div>
    <div className="space-y-3">
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
      <div className="h-8 w-32 bg-gray-200 rounded ml-auto"></div>
    </div>
  </div>
);

// Dynamic import para o CreateProjectModal
export const DynamicCreateProjectModal = dynamic(
  () => import('./create-project-modal').then((mod) => mod.CreateProjectModal),
  { 
    loading: () => <ModalFallback />,
    ssr: false 
  }
);

// Dynamic import para o SimpleModal
export const DynamicSimpleModal = dynamic(
  () => import('./simple-modal').then((mod) => mod.SimpleModal),
  { 
    loading: () => <ModalFallback />,
    ssr: false 
  }
); 