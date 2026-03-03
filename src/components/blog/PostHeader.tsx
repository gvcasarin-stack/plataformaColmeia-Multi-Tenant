import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Clock, ChevronRight } from 'lucide-react'
import { PostMetadata } from '@/lib/blog/mdx'
import CategoryBadge from './CategoryBadge'
import { formatDate } from '@/lib/blog/utils'

interface PostHeaderProps {
  metadata: PostMetadata
}

export default function PostHeader({ metadata }: PostHeaderProps) {
  return (
    <header className="relative w-full">
      {/* Imagem de Capa com Overlay */}
      <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-slate-900">
        <Image
          src={metadata.image}
          alt={metadata.title}
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />

        {/* Conteúdo sobre a imagem */}
        <div className="absolute inset-0 flex items-end">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl pb-12">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-white/80 mb-6">
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <ChevronRight className="h-4 w-4" />
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white font-medium">{metadata.category}</span>
            </nav>

            {/* Badge de Categoria */}
            <div className="mb-6">
              <CategoryBadge category={metadata.category} size="lg" />
            </div>

            {/* Título */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 drop-shadow-lg">
              {metadata.title}
            </h1>

            {/* Metadados */}
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <span>{formatDate(metadata.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>{metadata.readTime} de leitura</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/60">•</span>
                <span>Por {metadata.author}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
