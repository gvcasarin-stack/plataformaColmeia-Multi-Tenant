/**
 * Biblioteca de utilitários para otimização de imagens 
 * Fornece funções para gerar URLs de imagem otimizadas, calcular tamanhos responsivos,
 * e formatar parâmetros para o componente Next Image
 */

/**
 * Interface para opções de otimização de imagem
 */
interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png' | 'auto';
  fit?: 'cover' | 'contain' | 'fill';
  baseUrl?: string;
}

/**
 * Interface para informações sobre imagem em diferentes tamanhos responsivos
 */
interface ResponsiveImageSizes {
  mobileSrc: string;
  tabletSrc: string;
  desktopSrc: string;
  sizes: string;
  srcSet: string;
}

/**
 * Formata o caminho de uma imagem do Firebase Storage para o melhor formato
 * @param url URL original da imagem no Firebase Storage
 * @param options Opções de otimização
 * @returns URL otimizada para a imagem
 */
export function optimizeFirebaseImageUrl(
  url: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!url) return '';
  
  // Se a URL já contém parâmetros de otimização, não modificar
  if (url.includes('format=') || url.includes('width=')) {
    return url;
  }
  
  // Verificar se a URL é uma URL do Firebase Storage
  if (!url.includes('firebasestorage.googleapis.com')) {
    return url;
  }
  
  // Parâmetros padrão
  const {
    width = 0,
    height = 0,
    quality = 80,
    format = 'auto',
    fit = 'cover'
  } = options;
  
  // Construir parâmetros de URL
  const params = new URLSearchParams();
  
  // Adicionar apenas parâmetros que têm valores válidos
  if (width > 0) params.append('width', width.toString());
  if (height > 0) params.append('height', height.toString());
  if (quality > 0) params.append('quality', quality.toString());
  if (format !== 'auto') params.append('format', format);
  if (fit) params.append('fit', fit);
  
  // Adicionar parâmetros à URL se houver algum
  const paramString = params.toString();
  if (paramString) {
    // Verificar se a URL já contém outros parâmetros
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${paramString}`;
  }
  
  return url;
}

/**
 * Gera configurações responsivas para uma imagem
 * @param imagePath Caminho da imagem
 * @param options Opções de otimização
 * @returns Configurações para imagem responsiva
 */
export function getResponsiveImageConfig(
  imagePath: string,
  options: ImageOptimizationOptions = {}
): ResponsiveImageSizes {
  const baseUrl = options.baseUrl || '';
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  const fullPath = `${baseUrl}${path}`;
  
  // Tamanhos para diferentes breakpoints
  const mobileWidth = 640;
  const tabletWidth = 1024;
  const desktopWidth = 1920;
  
  // Gerar URLs para diferentes tamanhos
  const mobileSrc = optimizeFirebaseImageUrl(fullPath, { 
    ...options, 
    width: mobileWidth,
    format: 'webp' 
  });
  
  const tabletSrc = optimizeFirebaseImageUrl(fullPath, { 
    ...options, 
    width: tabletWidth,
    format: 'webp'
  });
  
  const desktopSrc = optimizeFirebaseImageUrl(fullPath, { 
    ...options, 
    width: desktopWidth, 
    format: 'webp' 
  });
  
  // Gerar HTML srcSet e sizes
  const srcSet = `
    ${mobileSrc} ${mobileWidth}w,
    ${tabletSrc} ${tabletWidth}w,
    ${desktopSrc} ${desktopWidth}w
  `;
  
  const sizes = `
    (max-width: ${mobileWidth}px) ${mobileWidth}px,
    (max-width: ${tabletWidth}px) ${tabletWidth}px,
    ${desktopWidth}px
  `;
  
  return {
    mobileSrc,
    tabletSrc,
    desktopSrc,
    srcSet,
    sizes
  };
}

/**
 * Resolve o caminho completo para uma imagem com base no ambiente
 * @param path Caminho relativo da imagem
 * @returns Caminho absoluto da imagem
 */
export function resolveImagePath(path: string): string {
  if (!path) return '';
  
  // Se já é uma URL absoluta ou um data URL, retornar como está
  if (path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }
  
  // Se não começar com '/', adicionar
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  
  // Usar a URL base do ambiente, se disponível
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return `${baseUrl}${path}`;
}

/**
 * Gera configuração de placeholder para imagens
 * @param width Largura da imagem
 * @param height Altura da imagem 
 * @param color Cor do placeholder (hex ou nome)
 * @returns URL do placeholder
 */
export function getPlaceholderImage(
  width: number = 100, 
  height: number = 100, 
  color: string = 'EEEEEE'
): string {
  // Limpar a cor para garantir um formato válido
  const cleanColor = color.replace('#', '');
  
  // Gerar uma URL de placeholder
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect width='${width}' height='${height}' fill='%23${cleanColor}'/%3E%3C/svg%3E`;
}

/**
 * Determina se uma imagem deve ser carregada com prioridade
 * @param imagePath Caminho da imagem
 * @param isPriority Indicador explícito de prioridade 
 * @returns Booleano indicando se a imagem deve ter prioridade
 */
export function shouldPrioritizeImage(
  imagePath: string, 
  isPriority?: boolean
): boolean {
  // Se isPriority for fornecido explicitamente, usar esse valor
  if (typeof isPriority === 'boolean') {
    return isPriority;
  }
  
  // Imagens em caminhos críticos que geralmente devem ter prioridade
  const criticalPaths = [
    '/logo.svg',
    '/icon-512x512.png',
    '/hero-image',
    '/background-main'
  ];
  
  // Verificar se a imagem está em um caminho crítico
  return criticalPaths.some(criticalPath => 
    imagePath.includes(criticalPath)
  );
}
