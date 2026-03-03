import { MetadataRoute } from 'next'

/**
 * PWA Manifest para SGF - Sistema de Gerenciamento Fotovoltaico
 * Otimizado para instalação como aplicativo e SEO
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SGF - Sistema de Gerenciamento para Projetos Fotovoltaicos e Homologação',
    short_name: 'SGF',
    description: 'Sistema completo de gestão para projetistas fotovoltaicos e empresas de homologação. Gerencie projetos, documentos, notificações, financeiro e acompanhamento de clientes em tempo real.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    categories: ['business', 'productivity', 'utilities'],
    lang: 'pt-BR',
    dir: 'ltr',
    icons: [
      {
        src: '/lightning-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/lightning-icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/lightning-icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    screenshots: [],
    scope: '/',
    id: 'com.gerenciamentofotovoltaico.sgf',
  }
}

