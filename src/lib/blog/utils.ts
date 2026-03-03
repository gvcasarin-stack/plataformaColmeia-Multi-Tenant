import { PostMetadata } from './mdx'

/**
 * Calcula o tempo estimado de leitura baseado no conteúdo
 * Média de 200 palavras por minuto em português
 */
export function calculateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.trim().split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min`
}

/**
 * Formata a data no padrão brasileiro
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Formata a data de forma curta (ex: 15 Jan 2025)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Retorna a cor do badge de categoria
 */
export function getCategoryColor(category: PostMetadata['category']): {
  badge: string
  text: string
  bg: string
} {
  const colors = {
    Técnico: {
      badge: 'bg-blue-100 text-blue-700 border-blue-200',
      text: 'text-blue-600',
      bg: 'bg-blue-600',
    },
    Vendas: {
      badge: 'bg-green-100 text-green-700 border-green-200',
      text: 'text-green-600',
      bg: 'bg-green-600',
    },
    Mercado: {
      badge: 'bg-purple-100 text-purple-700 border-purple-200',
      text: 'text-purple-600',
      bg: 'bg-purple-600',
    },
    Software: {
      badge: 'bg-orange-100 text-orange-700 border-orange-200',
      text: 'text-orange-600',
      bg: 'bg-orange-600',
    },
  }

  return colors[category]
}

/**
 * Trunca texto com reticências
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

/**
 * Gera um ID único para headings (usado no Table of Contents)
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-') // Substitui espaços por hífens
}

/**
 * Extrai headings do conteúdo MDX para criar o Table of Contents
 */
export function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: Array<{ id: string; text: string; level: number }> = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = generateHeadingId(text)

    headings.push({ id, text, level })
  }

  return headings
}

/**
 * Remove markdown do texto (útil para meta descriptions)
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/[*_~`#]/g, '') // Remove formatação
    .replace(/\n/g, ' ') // Remove quebras de linha
    .trim()
}
