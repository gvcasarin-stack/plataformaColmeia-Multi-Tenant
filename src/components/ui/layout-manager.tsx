"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface LayoutManagerProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  topBanner?: React.ReactNode;
}

/**
 * Gerenciador de layout que mantém a sidebar fixa e anima apenas o conteúdo principal
 * durante a navegação, minimizando o flash.
 */
export function LayoutManager({ sidebar, children, topBanner }: LayoutManagerProps) {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const [prevChildren, setPrevChildren] = useState<React.ReactNode>(null);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Efeito para detectar mudanças de rota
  useEffect(() => {
    if (pathname !== prevPathname) {
      // Iniciar transição
      setIsPending(true);
      setPrevChildren(children);

      // Resetar scroll
      if (mainContentRef.current) {
        mainContentRef.current.scrollTop = 0;
      }

      // Concluir transição após um breve delay
      const transitionTimeout = setTimeout(() => {
        setIsPending(false);
        setPrevPathname(pathname);
        setPrevChildren(null);
      }, 200);

      return () => clearTimeout(transitionTimeout);
    }
  }, [pathname, prevPathname, children]);

  return (
    <div className="flex h-screen bg-white dark:bg-neutral-900">
      {/* Sidebar fixa */}
      <div className="flex-shrink-0 h-full z-10">
        {sidebar}
      </div>

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Banner de topo (ex: aviso past_due) */}
        {topBanner}

        {/* Conteúdo com scroll */}
        <div
          ref={mainContentRef}
          className="flex-1 relative overflow-auto min-h-0 bg-white dark:bg-neutral-900"
        >
          {/* Conteúdo atual */}
          <div className={`absolute inset-0 p-6 transition-opacity duration-200 bg-white dark:bg-neutral-900 ${
            isPending ? 'opacity-0' : 'opacity-100'
          }`}>
            {children}
          </div>

          {/* Conteúdo anterior durante a transição */}
          {isPending && prevChildren && (
            <div className="absolute inset-0 p-6 opacity-40 bg-white dark:bg-neutral-900">
              {prevChildren}
            </div>
          )}

          {/* Spinner de carregamento */}
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60 z-10">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
