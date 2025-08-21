"use client";

import { useEffect, useState } from "react";
import { TimeoutError } from "@/components/error-states/timeout-error";

interface LoaderWithTimeoutProps {
  /**
   * Tempo em milissegundos antes de mostrar o erro de timeout
   * Padrão: 30000ms (30 segundos)
   */
  timeout?: number;
  
  /**
   * Mensagem principal no erro de timeout
   */
  timeoutMessage?: string;
  
  /**
   * Mensagem secundária no erro de timeout
   */
  timeoutSubMessage?: string;
  
  /**
   * Texto exibido durante o carregamento
   */
  loadingText?: string;

  /**
   * Componente a ser renderizado
   */
  children: React.ReactNode;

  /**
   * Tamanho do ícone de loading
   */
  size?: "small" | "medium" | "large";
}

export function LoaderWithTimeout({ 
  timeout = 30000,
  timeoutMessage,
  timeoutSubMessage,
  loadingText = "Carregando...",
  children,
  size = "medium"
}: LoaderWithTimeoutProps) {
  const [showTimeout, setShowTimeout] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Configura o timer de timeout
  useEffect(() => {
    // Limpa estado inicial
    setShowTimeout(false);
    setShowContent(false);
    
    // Inicia o timer de timeout
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeout);

    // Cleanup ao desmontar
    return () => clearTimeout(timer);
  }, [timeout, children]);

  // Quando o conteúdo carregar, mostrar ele
  // Isso é feito via Suspense/use client
  const handleContentLoaded = () => {
    setShowContent(true);
  };

  // Tamanhos do loader
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-8 w-8", 
    large: "h-12 w-12"
  };

  // Se já carregou o conteúdo, mostrar
  if (showContent) {
    return <>{children}</>;
  }

  // Se deu timeout, mostrar o erro
  if (showTimeout) {
    return (
      <TimeoutError 
        message={timeoutMessage} 
        subMessage={timeoutSubMessage} 
      />
    );
  }

  // Estado de carregamento
  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} animate-spin text-primary mb-4 border-4 border-gray-200 border-t-primary rounded-full`}></div>
      {loadingText && (
        <p className="text-gray-600 text-sm font-medium">{loadingText}</p>
      )}
    </div>
  );
}
