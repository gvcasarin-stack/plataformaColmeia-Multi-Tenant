import { MetadataRoute } from 'next'

/**
 * Sitemap dinâmico para SGF - Sistema de Gerenciamento Fotovoltaico
 * Otimizado para SEO e indexação pelo Google
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.gerenciamentofotovoltaico.com.br'
  const currentDate = new Date()

  return [
    // Página principal (Landing Page) - Prioridade máxima
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Páginas legais
    {
      url: `${baseUrl}/legal/termos-de-uso`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/politica-de-privacidade`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    // Página legal index
    {
      url: `${baseUrl}/legal`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ]
}

