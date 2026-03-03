import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { Post } from '@/lib/blog/mdx'
import CategoryBadge from './CategoryBadge'
import { formatDateShort } from '@/lib/blog/utils'
import { Button } from '@/components/ui/button'

interface FeaturedPostProps {
  post: Post
}

export default function FeaturedPost({ post }: FeaturedPostProps) {
  const { metadata } = post

  return (
    <article className="group relative bg-white rounded-2xl border-2 border-blue-200 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
      {/* Badge "Em Destaque" */}
      <div className="absolute top-4 right-4 z-10">
        <span className="inline-flex items-center px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-lg">
          ⭐ Artigo em Destaque
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Imagem */}
        <Link href={`/blog/${metadata.slug}`} className="relative w-full aspect-[4/3] md:aspect-auto overflow-hidden bg-slate-100">
          <Image
            src={metadata.image}
            alt={metadata.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>

        {/* Conteúdo */}
        <div className="flex flex-col justify-center p-6 md:p-8">
          <div className="mb-4">
            <CategoryBadge category={metadata.category} size="md" />
          </div>

          <Link href={`/blog/${metadata.slug}`}>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 group-hover:text-blue-600 transition-colors duration-300">
              {metadata.title}
            </h2>
          </Link>

          <p className="text-slate-600 text-lg mb-6 line-clamp-3">
            {metadata.description}
          </p>

          {/* Metadados */}
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDateShort(metadata.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{metadata.readTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400">•</span>
              <span>{metadata.author}</span>
            </div>
          </div>

          {/* Botão CTA */}
          <div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700 group/btn">
              <Link href={`/blog/${metadata.slug}`}>
                Ler artigo completo
                <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
