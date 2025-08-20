/**
 * Dynamic imports para o componente de upload de arquivos
 * Este componente é grande e pode se beneficiar do code splitting
 */

import React from 'react';
import dynamic from 'next/dynamic';

// Componente de fallback para mostrar enquanto o componente de upload está carregando
const FileUploadFallback = () => (
  <div className="p-4 rounded-md bg-gray-100 animate-pulse">
    <div className="h-8 w-40 bg-gray-200 mb-4 rounded"></div>
    <div className="h-20 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-32 bg-gray-200 rounded"></div>
  </div>
);

// Dynamic import para o FileUploadSection
export const DynamicFileUploadSection = dynamic(
  () => import('./file-upload-section').then((mod) => mod.FileUploadSection),
  { 
    loading: () => <FileUploadFallback />,
    ssr: false 
  }
); 