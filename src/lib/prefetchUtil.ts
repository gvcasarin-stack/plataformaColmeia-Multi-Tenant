import { devLog } from "@/lib/utils/productionLogger";

"use client";

// Definição de rotas comuns agrupadas por seção
const commonRoutes = {
  cliente: [
    '/cliente/painel',
    '/cliente/projetos',
    '/cliente/cobranca',
    '/cliente/notificacoes',
    '/cliente/perfil',
  ],
  admin: [
    '/painel',
    '/projetos',
    '/equipe',
    '/clientes',
    '/financeiro',
    '/dimensionamento',
    '/notificacoes',
  ]
};

// Mapeia as próximas prováveis rotas baseadas na rota atual
const nextProbableRoutesMap: Record<string, string[]> = {
  '/cliente/painel': ['/cliente/projetos', '/cliente/notificacoes'],
  '/cliente/projetos': ['/cliente/painel', '/cliente/projetos/[id]'],
  '/cliente/notificacoes': ['/cliente/painel', '/cliente/projetos'],
  '/cliente/cobranca': ['/cliente/painel', '/cliente/perfil'],
  '/cliente/perfil': ['/cliente/painel', '/cliente/notificacoes'],
  
  '/painel': ['/projetos', '/notificacoes'],
  '/projetos': ['/painel', '/projetos/[id]', '/clientes'],
  '/equipe': ['/painel', '/projetos'],
  '/clientes': ['/projetos', '/financeiro'],
  '/financeiro': ['/clientes', '/painel'],
  '/dimensionamento': ['/projetos', '/painel'],
  '/notificacoes': ['/painel', '/projetos']
};

/**
 * Prefetch manual que não depende da API do Next.js
 */
const manualPrefetch = (href: string): void => {
  // Cria um link prefetch
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = 'document';
  
  // Adiciona ao head se ainda não existir
  if (!document.head.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
    document.head.appendChild(link);
  }
};

/**
 * Prefetch todos os links visíveis na página
 */
export function prefetchLinksOnPage(): void {
  // Não execute no servidor
  if (typeof window === 'undefined') return;
  
  // Busca todos os links na página
  setTimeout(() => {
    const links = document.querySelectorAll('a[href^="/"]');
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#') && !href.includes('[')) {
        try {
          manualPrefetch(href);
        } catch (e) {
          // Ignora erros de prefetch
          console.debug(`Prefetch error for ${href}:`, e);
        }
      }
    });
  }, 1000); // Delay para garantir que a página carregou completamente
}

/**
 * Prefetch das próximas rotas prováveis baseado na rota atual
 */
export function prefetchNextProbableRoutes(currentPath: string): void {
  // Não execute no servidor
  if (typeof window === 'undefined') return;

  // Determinar qual conjunto de rotas devemos prefetch
  let routesToPrefetch: string[] = [];
  
  // Adiciona rotas específicas mapeadas para esta rota
  if (nextProbableRoutesMap[currentPath]) {
    routesToPrefetch = [...nextProbableRoutesMap[currentPath]];
  }
  
  // Adiciona rotas comuns relevantes
  if (currentPath.startsWith('/cliente')) {
    routesToPrefetch = [...routesToPrefetch, ...commonRoutes.cliente];
  } else {
    routesToPrefetch = [...routesToPrefetch, ...commonRoutes.admin];
  }
  
  // Remove duplicatas e a rota atual
  const uniqueRoutes = Array.from(new Set(routesToPrefetch));
  routesToPrefetch = uniqueRoutes.filter(route => route !== currentPath && !route.includes('['));
  
  // Prefetch das rotas
  routesToPrefetch.forEach(route => {
    try {
      manualPrefetch(route);
    } catch (e) {
      // Ignora erros de prefetch
      console.debug(`Prefetch error for ${route}:`, e);
    }
  });
} 