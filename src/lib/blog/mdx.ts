import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const postsDirectory = path.join(process.cwd(), 'content/blog')

export interface PostMetadata {
  title: string
  slug: string
  description: string
  author: string
  date: string
  category: 'Técnico' | 'Vendas' | 'Mercado' | 'Software'
  image: string
  readTime: string
  featured: boolean
  tags?: string[]
}

export interface Post {
  metadata: PostMetadata
  content: string
}

/**
 * Garante que o diretório de posts existe
 */
function ensurePostsDirectory() {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true })
  }
}

/**
 * Retorna todos os posts do blog ordenados por data (mais recente primeiro)
 */
export function getAllPosts(): Post[] {
  ensurePostsDirectory()

  const fileNames = fs.readdirSync(postsDirectory)
  const allPosts = fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => {
      const slug = fileName.replace(/\.mdx$/, '')
      return getPostBySlug(slug)
    })
    .filter((post): post is Post => post !== null)
    .sort((a, b) => {
      const dateA = new Date(a.metadata.date)
      const dateB = new Date(b.metadata.date)
      return dateB.getTime() - dateA.getTime()
    })

  return allPosts
}

/**
 * Retorna um post específico pelo slug
 */
export function getPostBySlug(slug: string): Post | null {
  ensurePostsDirectory()

  try {
    const fullPath = path.join(postsDirectory, `${slug}.mdx`)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)

    return {
      metadata: data as PostMetadata,
      content,
    }
  } catch (error) {
    console.error(`Post não encontrado: ${slug}`, error)
    return null
  }
}

/**
 * Retorna posts por categoria
 */
export function getPostsByCategory(category: PostMetadata['category']): Post[] {
  const allPosts = getAllPosts()
  return allPosts.filter(post => post.metadata.category === category)
}

/**
 * Retorna posts em destaque (featured)
 */
export function getFeaturedPosts(): Post[] {
  const allPosts = getAllPosts()
  return allPosts.filter(post => post.metadata.featured === true)
}

/**
 * Retorna posts relacionados (mesma categoria, excluindo o post atual)
 */
export function getRelatedPosts(currentSlug: string, category: PostMetadata['category'], limit: number = 3): Post[] {
  const categoryPosts = getPostsByCategory(category)
  return categoryPosts
    .filter(post => post.metadata.slug !== currentSlug)
    .slice(0, limit)
}

/**
 * Retorna todos os slugs dos posts (para geração estática)
 */
export function getAllPostSlugs(): string[] {
  ensurePostsDirectory()

  const fileNames = fs.readdirSync(postsDirectory)
  return fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map(fileName => fileName.replace(/\.mdx$/, ''))
}

/**
 * Busca posts por termo de pesquisa (título ou descrição)
 */
export function searchPosts(query: string): Post[] {
  const allPosts = getAllPosts()
  const lowerQuery = query.toLowerCase()

  return allPosts.filter(post => {
    const titleMatch = post.metadata.title.toLowerCase().includes(lowerQuery)
    const descMatch = post.metadata.description.toLowerCase().includes(lowerQuery)
    const tagMatch = post.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))

    return titleMatch || descMatch || tagMatch
  })
}
