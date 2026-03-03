import { NextRequest, NextResponse } from 'next/server'
import { getPostBySlug, getRelatedPosts } from '@/lib/blog/mdx'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const post = getPostBySlug(params.slug)

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const relatedPosts = getRelatedPosts(post.metadata.slug, post.metadata.category, 3)

    return NextResponse.json({
      post,
      relatedPosts,
    })
  } catch (error) {
    console.error('Erro ao buscar post:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
