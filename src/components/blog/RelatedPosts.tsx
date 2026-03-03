import { Post } from '@/lib/blog/mdx'
import PostCard from './PostCard'

interface RelatedPostsProps {
  posts: Post[]
}

export default function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null

  return (
    <section className="py-12 border-t border-slate-200">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            Artigos Relacionados
          </h2>
          <p className="text-slate-600">
            Continue aprendendo com esses artigos relacionados
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.metadata.slug} post={post} />
          ))}
        </div>
      </div>
    </section>
  )
}
