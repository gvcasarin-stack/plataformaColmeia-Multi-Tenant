"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { LoaderWithTimeout } from '@/components/ui';

interface LoadingContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
  loadingMessage: string;
}

// ✅ CORREÇÃO REACT #130: Funções não serializáveis para contexto inicial
const createInitialLoadingFunctions = () => ({
  showLoader: () => {},
  hideLoader: () => {},
});

// Valor padrão do contexto (sem funções diretamente no objeto)
const LoadingContext = createContext<LoadingContextType>({
  ...createInitialLoadingFunctions(),
  isLoading: false,
  loadingMessage: 'Carregando...',
});

// Hook para usar o contexto
export const useLoading = () => useContext(LoadingContext);

// Props do provider
interface LoadingProviderProps {
  children: React.ReactNode;
  defaultTimeout?: number;
  defaultTimeoutMessage?: string;
  defaultTimeoutSubMessage?: string;
}

// Provedor do contexto de loading
export function LoadingProvider({
  children,
  defaultTimeout = 30000,
  defaultTimeoutMessage,
  defaultTimeoutSubMessage,
}: LoadingProviderProps) {
  // Estado de loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Carregando...');

  // Mostrar o loader
  const showLoader = useCallback((message = 'Carregando...') => {
    setLoadingMessage(message);
    setIsLoading(true);
  }, []);

  // Esconder o loader
  const hideLoader = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Valor do contexto
  const contextValue = {
    showLoader,
    hideLoader,
    isLoading,
    loadingMessage,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {isLoading ? (
        <LoaderWithTimeout
          timeout={defaultTimeout}
          timeoutMessage={defaultTimeoutMessage}
          timeoutSubMessage={defaultTimeoutSubMessage}
          loadingText={loadingMessage}
        >
          {children}
        </LoaderWithTimeout>
      ) : (
        children
      )}
    </LoadingContext.Provider>
  );
} 