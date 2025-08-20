"use client";

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  ReactNode 
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  prefetchLinksOnPage, 
  prefetchNextProbableRoutes 
} from '@/lib/prefetchUtil';

interface LayoutContextProps {
  navigateTo: (href: string) => void;
  currentPath: string;
  isNavigating: boolean;
  isClientSideRendered: boolean;
}

const LayoutContext = createContext<LayoutContextProps>({
  navigateTo: () => {},
  currentPath: '',
  isNavigating: false,
  isClientSideRendered: false
});

export const useLayout = () => useContext(LayoutContext);

interface LayoutProviderProps {
  children: ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isClientSideRendered, setIsClientSideRendered] = useState(false);
  
  // Atualiza o caminho atual quando o pathname muda
  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);
  
  // Detecta client-side rendering para evitar problemas de hidratação
  useEffect(() => {
    setIsClientSideRendered(true);
    
    // Prefetch links comuns após o carregamento inicial
    if (typeof window !== 'undefined') {
      prefetchLinksOnPage();
      prefetchNextProbableRoutes(pathname);
    }
  }, [pathname]);
  
  // Intercepta todos os cliques em links dentro da aplicação
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && 
          link.getAttribute('href') && 
          !link.getAttribute('href').startsWith('#') && 
          !link.getAttribute('href').startsWith('http') && 
          !e.ctrlKey && 
          !e.metaKey &&
          !link.getAttribute('target') &&
          !link.hasAttribute('download')) {
        
        e.preventDefault();
        const href = link.getAttribute('href') || '';
        
        if (href.startsWith('/')) {
          navigateTo(href);
        }
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);
  
  const navigateTo = useCallback((href: string) => {
    // Evite navegação para a mesma página
    if (href === currentPath) return;
    
    setIsNavigating(true);
    
    // Prefetch a próxima rota e os links relacionados
    if (typeof window !== 'undefined') {
      prefetchNextProbableRoutes(href);
    }
    
    // Use router.push para mudar a URL sem recarregar a página
    router.push(href);
    
    // Espere o mínimo tempo necessário para atualizar o estado
    setTimeout(() => {
      setCurrentPath(href);
      setIsNavigating(false);
    }, 150);
  }, [currentPath, router]);
  
  return (
    <LayoutContext.Provider 
      value={{ 
        navigateTo, 
        currentPath, 
        isNavigating,
        isClientSideRendered
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
} 