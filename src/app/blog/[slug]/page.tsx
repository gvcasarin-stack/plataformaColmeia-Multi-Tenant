"use client"

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import PostHeader from '@/components/blog/PostHeader'
import ShareButtons from '@/components/blog/ShareButtons'
import TableOfContents from '@/components/blog/TableOfContents'
import RelatedPosts from '@/components/blog/RelatedPosts'
import { Button } from '@/components/ui/button'
import { Post } from '@/lib/blog/mdx'
import { ChevronRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string

  const [post, setPost] = useState<Post | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/blog/posts/${slug}`)
        const data = await response.json()

        setPost(data.post)
        setRelatedPosts(data.relatedPosts || [])
      } catch (error) {
        console.error('Erro ao carregar post:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [slug])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">Post não encontrado</h1>
        <p className="text-slate-600 mb-8">O artigo que você procura não existe ou foi removido.</p>
        <Button asChild>
          <Link href="/blog">Voltar ao Blog</Link>
        </Button>
      </div>
    )
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <main className="min-h-screen bg-white">
      {/* Header do Post */}
      <PostHeader metadata={post.metadata} />

      {/* Container Principal com Sidebar */}
      <div className="container mx-auto px-4 md:px-6 max-w-7xl py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Conteúdo Principal */}
          <article className="lg:col-span-8">
            {/* Conteúdo do Post */}
            <div className="prose prose-lg prose-slate max-w-none
              prose-headings:font-bold prose-headings:text-slate-800 prose-headings:tracking-tight
              prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-200
              prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-slate-700 prose-p:leading-relaxed prose-p:mb-6
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
              prose-strong:text-slate-900 prose-strong:font-bold
              prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-6 prose-ol:list-decimal prose-ol:pl-6
              prose-li:text-slate-700 prose-li:my-2
              prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-slate-600 prose-blockquote:bg-blue-50 prose-blockquote:py-4 prose-blockquote:rounded-r-lg
              prose-code:text-blue-600 prose-code:bg-slate-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
              prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-xl prose-pre:shadow-lg prose-pre:overflow-x-auto
              prose-img:rounded-xl prose-img:shadow-lg prose-img:my-8
              prose-hr:border-slate-200 prose-hr:my-12
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Footer do Artigo */}
            <div className="mt-16 pt-8 border-t border-slate-200">
              {/* Bio do Autor */}
              <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-xl mb-8">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                  {post.metadata.author.charAt(0)}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-lg">{post.metadata.author}</h4>
                  <p className="text-slate-600 text-sm">
                    Especialista em energia fotovoltaica e gestão de projetos
                  </p>
                </div>
              </div>

              {/* Tags */}
              {post.metadata.tags && post.metadata.tags.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {post.metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="p-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-center">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Experimente o SGF gratuitamente
                </h3>
                <p className="text-white/90 mb-6 max-w-2xl mx-auto">
                  Comece hoje com 7 dias de teste gratuito. Profissionalize sua gestão de projetos fotovoltaicos.
                </p>
                <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                  <Link href="/#precos">
                    Começar teste grátis
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </article>

          {/* Sidebar Flutuante - Desktop Only */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              {/* Table of Contents */}
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <TableOfContents content={post.content} />
              </div>

              {/* Share Buttons */}
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <ShareButtons title={post.metadata.title} url={currentUrl} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Posts Relacionados */}
      <RelatedPosts posts={relatedPosts} />
    </main>
  )
}
