/**
 * Dynamic imports para componentes Kanban
 * Permite code splitting e carregamento lazy para reduzir o bundle inicial
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports com opção noSSR para garantir que os componentes só carreguem no cliente
export const KanbanBoard = dynamic(
  () => import('./KanbanBoard').then((mod) => mod.KanbanBoard),
  { 
    loading: () => <div className="p-4 rounded-md bg-gray-100 animate-pulse min-h-[400px]">Carregando...</div>,
    ssr: false 
  }
);

export const AddColumnDialog = dynamic(
  () => import('./AddColumnDialog').then((mod) => mod.AddColumnDialog),
  { 
    loading: () => <div className="p-2 rounded-md bg-gray-100 animate-pulse">Carregando...</div>,
    ssr: false 
  }
);

export const DeleteColumnDialog = dynamic(
  () => import('./DeleteColumnDialog').then((mod) => mod.DeleteColumnDialog),
  { 
    loading: () => <div className="p-2 rounded-md bg-gray-100 animate-pulse">Carregando...</div>,
    ssr: false 
  }
);

export const EditableColumnTitle = dynamic(
  () => import('./EditableColumnTitle').then((mod) => mod.EditableColumnTitle),
  { 
    loading: () => <div className="p-2 rounded-md bg-gray-100 animate-pulse">Carregando...</div>,
    ssr: false 
  }
);
