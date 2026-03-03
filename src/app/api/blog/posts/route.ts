import { NextResponse } from 'next/server'
import { getAllPosts, getFeaturedPosts } from '@/lib/blog/mdx'

export async function GET() {
  try {
    const allPosts = getAllPosts()
    const featuredPosts = getFeaturedPosts()

    return NextResponse.json({
      posts: allPosts,
      featured: featuredPosts[0] || null,
    })
  } catch (error) {
    console.error('Erro ao buscar posts:', error)
    return NextResponse.json({ posts: [], featured: null })
  }
}
