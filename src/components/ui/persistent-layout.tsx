"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface PersistentLayoutProps {
  sidebar: React.ReactNode;
  initialPath: string;
}

/**
 * Layout persistente que mantém a sidebar estática enquanto apenas o conteúdo é atualizado
 * Usa uma técnica de iframe para garantir que a navegação nunca recarregue a sidebar
 */
export function PersistentLayout({ sidebar, initialPath }: PersistentLayoutProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Função para navegar para uma nova página dentro do iframe
  const navigateTo = (path: string) => {
    if (path === currentPath) return;
    
    setIsLoading(true);
    setCurrentPath(path);
    
    // Atualizar a URL do iframe
    if (iframeRef.current) {
      iframeRef.current.src = path;
    }
  };

  // Efeito para sincronizar o pathname atual com o iframe
  useEffect(() => {
    if (pathname && pathname !== currentPath) {
      setCurrentPath(pathname);
    }
  }, [pathname, currentPath]);

  // Configurar o evento de mensagem para comunicação entre o iframe e a página principal
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verificar se a mensagem é do nosso domínio para segurança
      if (event.origin !== window.location.origin) return;
      
      // Processar mensagens do iframe
      if (event.data && event.data.type === 'navigation') {
        // Atualizar a URL atual sem recarregar
        window.history.pushState({}, '', event.data.path);
        setCurrentPath(event.data.path);
      } else if (event.data && event.data.type === 'loaded') {
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Lidar com eventos de clique nos links da sidebar
  const handleSidebarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && 
        link.getAttribute('href') && 
        !link.getAttribute('href').startsWith('#') && 
        !link.getAttribute('href').startsWith('http') && 
        !e.ctrlKey && 
        !e.metaKey &&
        !link.getAttribute('target')) {
      
      e.preventDefault();
      const href = link.getAttribute('href') || '';
      if (href.startsWith('/')) {
        navigateTo(href);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar fixa que nunca recarrega */}
      <div onClick={handleSidebarClick}>
        {sidebar}
      </div>
      
      {/* Conteúdo principal via iframe */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/70 dark:bg-gray-900/70 z-10">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={currentPath}
          className="w-full h-full border-none"
          onLoad={() => setIsLoading(false)}
          title="Content"
        />
      </div>
    </div>
  );
} 