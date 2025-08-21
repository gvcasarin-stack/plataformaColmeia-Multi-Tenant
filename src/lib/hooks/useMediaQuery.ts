'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para detectar media queries
 * @param query Media query a ser testada (ex: '(max-width: 768px)')
 * @returns Boolean indicando se a media query é válida
 */
export function useMediaQuery(query: string): boolean {
  // Inicializa como false para evitar problemas de hidratação
  const [matches, setMatches] = useState(false);
  
  // Evita SSR/Hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    
    // Create Media Query List only on client side
    const mediaQuery = window.matchMedia(query);
    
    // Set initial state
    setMatches(mediaQuery.matches);
    
    // Create event listener function
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add event listener
    mediaQuery.addEventListener('change', handleChange);
    
    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [query]);
  
  // Return false during SSR
  return mounted ? matches : false;
}
