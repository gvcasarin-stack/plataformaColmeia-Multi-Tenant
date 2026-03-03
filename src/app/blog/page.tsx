"use client"

import { useState, useEffect } from 'react'
import BlogHero from '@/components/blog/BlogHero'
import FeaturedPost from '@/components/blog/FeaturedPost'
import PostCard from '@/components/blog/PostCard'
import { Post } from '@/lib/blog/mdx'
import { Loader2 } from 'lucide-react'

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([])
  const [featuredPost, setFeaturedPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch posts from API
    const fetchPosts = async () => {
      try {
        const response = await fetch('/api/blog/posts')
        const data = await response.json()

        setPosts(data.posts)
        setFilteredPosts(data.posts.filter((p: Post) => !p.metadata.featured))
        setFeaturedPost(data.featured || null)
      } catch (error) {
        console.error('Erro ao carregar posts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const handleSearch = (query: string) => {
    if (!query.trim()) {
      setFilteredPosts(posts.filter(p => !p.metadata.featured))
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = posts.filter((post) => {
      const titleMatch = post.metadata.title.toLowerCase().includes(lowerQuery)
      const descMatch = post.metadata.description.toLowerCase().includes(lowerQuery)
      const tagMatch = post.metadata.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))

      return (titleMatch || descMatch || tagMatch) && !post.metadata.featured
    })

    setFilteredPosts(filtered)
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <BlogHero onSearch={handleSearch} />

      {/* Container Principal */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl py-12 md:py-16">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Post em Destaque */}
            {featuredPost && (
              <div className="mb-16">
                <FeaturedPost post={featuredPost} />
              </div>
            )}

            {/* Grid de Posts */}
            {filteredPosts.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post.metadata.slug} post={post} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-slate-600 text-lg">
                  Nenhum artigo encontrado. Tente uma busca diferente.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
