"use client";

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { 
  optimizeFirebaseImageUrl, 
  shouldPrioritizeImage,
  getPlaceholderImage
} from '@/lib/utils/imageOptimizer';

interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  blurhash?: string;
  lazyBoundary?: string;
  forcePriority?: boolean;
  withBlur?: boolean;
}

/**
 * Componente de imagem otimizado que estende o componente Image do Next.js
 * com funcionalidades adicionais de otimização
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  quality = 80,
  fallbackSrc,
  blurhash,
  lazyBoundary = '200px',
  forcePriority = false,
  fill = false,
  withBlur = false,
  sizes,
  className,
  style,
  ...props
}: OptimizedImageProps) {
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Converter width e height para número se for necessário
  const numericWidth = typeof width === 'number' ? width : 100;
  const numericHeight = typeof height === 'number' ? height : 100;

  // Otimizar URL para imagens do Firebase Storage
  const optimizedSrc = !isError
    ? optimizeFirebaseImageUrl(src, { 
        width: numericWidth, 
        height: numericHeight, 
        quality 
      })
    : fallbackSrc || getPlaceholderImage(
        numericWidth, 
        numericHeight
      );

  // Calcular se a imagem deve ter prioridade
  const priority = forcePriority || shouldPrioritizeImage(src, props.priority);
  
  // Placeholder blur
  const placeholderSrc = blurhash || (withBlur ? getPlaceholderImage(
    numericWidth, 
    numericHeight
  ) : undefined);
  const placeholder = withBlur ? 'blur' : undefined;
  const blurDataURL = placeholderSrc;

  // Classes CSS para efeitos de carregamento
  const imageClasses = [
    className || '',
    !isLoaded ? 'opacity-0' : 'opacity-100',
    'transition-opacity duration-300',
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative overflow-hidden ${fill ? 'w-full h-full' : ''}`}>
      {/* Placeholder durante o carregamento */}
      {withBlur && !isLoaded && !isError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ 
            background: blurDataURL?.startsWith('data:') 
              ? `url(${blurDataURL})` 
              : '#f3f4f6',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(8px)'
          }}
          aria-hidden="true"
        />
      )}

      <Image
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        className={imageClasses}
        priority={priority}
        sizes={sizes}
        fill={fill}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        onError={() => setIsError(true)}
        onLoad={() => setIsLoaded(true)}
        {...props}
      />
    </div>
  );
}
