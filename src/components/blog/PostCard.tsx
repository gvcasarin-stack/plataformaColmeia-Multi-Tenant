import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock } from 'lucide-react'
import { Post } from '@/lib/blog/mdx'
import CategoryBadge from './CategoryBadge'
import { formatDateShort } from '@/lib/blog/utils'

interface PostCardProps {
  post: Post
}

export default function PostCard({ post }: PostCardProps) {
  const { metadata } = post

  return (
    <article className="group h-full flex flex-col bg-white rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Imagem de Capa */}
      <Link href={`/blog/${metadata.slug}`} className="relative w-full aspect-[16/9] overflow-hidden bg-slate-100">
        <Image
          src={metadata.image}
          alt={metadata.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-4 left-4">
          <CategoryBadge category={metadata.category} size="sm" />
        </div>
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-6">
        {/* Título */}
        <Link href={`/blog/${metadata.slug}`}>
          <h3 className="text-xl font-bold text-slate-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">
            {metadata.title}
          </h3>
        </Link>

        {/* Descrição */}
        <p className="text-slate-600 mb-4 line-clamp-3 flex-1">
          {metadata.description}
        </p>

        {/* Footer do Card */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDateShort(metadata.date)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{metadata.readTime}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
