/**
 * Structured Data (Schema.org JSON-LD) para SEO
 * SGF - Sistema de Gerenciamento Fotovoltaico
 */

import { Organization, SoftwareApplication, WebSite, BreadcrumbList, WithContext } from 'schema-dts'

/**
 * Schema para a organização (Colmeia Solar)
 */
export const organizationSchema: WithContext<Organization> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Colmeia Solar',
  alternateName: 'SGF - Sistema de Gerenciamento Fotovoltaico',
  url: 'https://www.gerenciamentofotovoltaico.com.br',
  logo: 'https://www.gerenciamentofotovoltaico.com.br/logo.svg',
  description: 'Empresa desenvolvedora do SGF - Sistema de Gerenciamento para Projetos Fotovoltaicos e Homologação',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'BR',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: 'Portuguese',
  },
}

/**
 * Schema para a aplicação de software
 */
export const softwareApplicationSchema: WithContext<SoftwareApplication> = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'SGF - Sistema de Gerenciamento Fotovoltaico',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web Browser',
  url: 'https://www.gerenciamentofotovoltaico.com.br',
  description: 'Sistema completo de gestão para projetistas fotovoltaicos e empresas de homologação. Gerencie projetos, documentos, notificações, financeiro e acompanhamento de clientes em tempo real.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
    availability: 'https://schema.org/InStock',
    description: 'Trial gratuito de 7 dias sem necessidade de cartão de crédito',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '127',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'Gestão completa de projetos fotovoltaicos',
    'Controle de documentos e arquivos',
    'Notificações automáticas para clientes',
    'Gestão financeira e emissão de ordens de serviço',
    'Portal exclusivo para clientes',
    'Cronograma inteligente de projetos',
    'Rastreamento de status em tempo real',
    'Histórico completo de alterações',
    'Suporte a múltiplas distribuidoras',
    'Gestão de equipe e colaboradores',
  ],
  screenshot: [
    'https://www.gerenciamentofotovoltaico.com.br/images/gestao-projetos-dashboard.png',
    'https://www.gerenciamentofotovoltaico.com.br/images/comunicacao-integrada.png',
    'https://www.gerenciamentofotovoltaico.com.br/images/gestao-financeira.png',
  ],
  inLanguage: 'pt-BR',
  creator: {
    '@type': 'Organization',
    name: 'Colmeia Solar',
  },
}

/**
 * Schema para o website
 */
export const websiteSchema: WithContext<WebSite> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SGF - Sistema de Gerenciamento Fotovoltaico',
  alternateName: 'Sistema de Gerenciamento para Projetos Fotovoltaicos e Homologação',
  url: 'https://www.gerenciamentofotovoltaico.com.br',
  description: 'Plataforma completa para gestão de projetos fotovoltaicos e homologação junto às distribuidoras de energia',
  inLanguage: 'pt-BR',
  publisher: {
    '@type': 'Organization',
    name: 'Colmeia Solar',
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.gerenciamentofotovoltaico.com.br/?s={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

/**
 * Schema para breadcrumb da página inicial
 */
export const breadcrumbSchema: WithContext<BreadcrumbList> = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Início',
      item: 'https://www.gerenciamentofotovoltaico.com.br',
    },
  ],
}

/**
 * Retorna todos os schemas para a página inicial
 */
export function getAllHomeSchemas() {
  return [
    organizationSchema,
    softwareApplicationSchema,
    websiteSchema,
    breadcrumbSchema,
  ]
}

